from typing import Dict, Optional
import uuid
import os
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import redis.asyncio as redis

import sofia_agent as sa

from agent import agent

app = FastAPI(title="Sofia Agent API", version="1.0.0")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this appropriately in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session storage
sessions: Dict[str, any] = {}

# Initialize Redis client if URL is provided
REDIS_URL = os.getenv("REDIS_URL")
redis_client = redis.from_url(REDIS_URL) if REDIS_URL else None

class Message(BaseModel):
    content: str

class SessionResponse(BaseModel):
    session_id: str
    message: str

async def get_session(session_id: str) -> Optional[any]:
    """Retrieve session from storage"""
    if redis_client:
        # Try Redis first
        session_data = await redis_client.get(f"session:{session_id}")
        if session_data:
            return sessions.get(session_id)
    # Fallback to in-memory storage
    return sessions.get(session_id)

@app.post("/session", response_model=SessionResponse)
async def create_session():
    """Create a new session"""
    session_id = str(uuid.uuid4())
    session = agent.create_session()
    sessions[session_id] = session
    
    # Store session in Redis if available
    if redis_client:
        await redis_client.setex(f"session:{session_id}", 24*60*60, "active")
    
    # Get initial message from agent
    decision, _ = session.next(None)
    return SessionResponse(session_id=session_id, message=decision.input)

@app.post("/session/{session_id}/message", response_model=SessionResponse)
async def send_message(session_id: str, message: Message):
    """Send a message to an existing session"""
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    decision, _ = session.next(message.content)
    return SessionResponse(session_id=session_id, message=decision.input)

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time communication"""
    await websocket.accept()
    
    try:
        session = await get_session(session_id)
        if not session:
            await websocket.close(code=1000, reason="Session not found")
            return

        # Send initial message
        decision, _ = session.next(None)
        await websocket.send_json({"message": decision.input})
        
        while True:
            message = await websocket.receive_text()
            decision, out = session.next(message)
            
            if decision.action.value == sa.Action.END.value:
                await websocket.close(code=1000)
                break
                
            await websocket.send_json({"message": decision.model_dump()})
            
    except Exception as e:
        await websocket.close(code=1000, reason=str(e))

@app.delete("/session/{session_id}")
async def end_session(session_id: str):
    """End and cleanup a session"""
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Clean up session
    del sessions[session_id]
    if redis_client:
        await redis_client.delete(f"session:{session_id}")
    return {"message": "Session ended successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

