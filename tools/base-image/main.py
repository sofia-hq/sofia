import os
from typing import Optional
import uuid
import asyncio
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import starlette.websockets
from pydantic import BaseModel

from agent import agent

from sofia_agent.models.flow import Message as FlowMessage, Step, Action
from db import init_db
from session_store import create_session_store

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

session_store = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global session_store
    # Initialize database
    await init_db()
    session_store = await create_session_store()
    assert session_store is not None, "Session store initialization failed"
    yield
    # Cleanup
    await session_store.close()


app = FastAPI(title="Sofia Agent API", version="0.1.1", lifespan=lifespan)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    content: str


class SessionResponse(BaseModel):
    session_id: str
    message: dict


@app.post("/session", response_model=SessionResponse)
async def create_session(initiate: Optional[bool] = False):
    """Create a new session"""
    session_id = str(uuid.uuid4())
    session = agent.create_session()
    await session_store.set(session_id, session)

    # Get initial message from agent
    if initiate:
        decision, _ = session.next(None)
        await session_store.set(session_id, session)
    return SessionResponse(
        session_id=session_id,
        message=(
            decision.model_dump(mode="json")
            if initiate
            else {"status": "Session created successfully"}
        ),
    )


@app.post("/session/{session_id}/message", response_model=SessionResponse)
async def send_message(session_id: str, message: Message):
    """Send a message to an existing session"""
    session = await session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    decision, _ = session.next(message.content)
    await session_store.set(session_id, session)
    return SessionResponse(
        session_id=session_id, message=decision.model_dump(mode="json")
    )


@app.delete("/session/{session_id}")
async def end_session(session_id: str):
    """End and cleanup a session"""
    session = await session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Clean up session
    await session_store.delete(session_id)
    return {"message": "Session ended successfully"}


@app.get("/session/{session_id}/history")
async def get_session_history(session_id: str):
    """Get the history of a session"""
    session = await session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Assuming session.history() returns a list of messages
    history: list[FlowMessage | Step] = session.history
    history_json = [
        msg.model_dump(mode="json")
        for msg in history
        if isinstance(msg, FlowMessage)
        and msg.role not in ["error", "fallback", "tool"]
    ]
    return {"session_id": session_id, "history": history_json}


class SessionData(BaseModel):
    session_id: str
    current_step_id: str
    history: list


class ChatRequest(BaseModel):
    user_input: Optional[str] = None
    session_data: Optional[SessionData] = None


class ChatResponse(BaseModel):
    response: dict
    tool_output: Optional[str] = None
    session_data: SessionData


@app.post("/chat")
async def chat(request: ChatRequest, verbose: bool = False):
    """Chat endpoint to get the next response from the agent based on the session data"""
    decision, tool_output, session_data = agent.next(
        **request.model_dump(), verbose=verbose
    )
    return ChatResponse(
        response=decision.model_dump(mode="json"),
        tool_output=tool_output,
        session_data=session_data,
    )


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket, session_id: str, initiate: bool = False, verbose: bool = False
):
    """WebSocket endpoint for real-time communication"""
    await websocket.accept()

    try:
        session = await session_store.get(session_id)
        if not session:
            await websocket.close(code=1000, reason="Session not found")
            return

        # Send initial greeting if requested
        if initiate:
            decision, _ = session.next(None)
            await session_store.set(session_id, session)
            await websocket.send_json(
                {
                    "message": decision.model_dump(mode="json"),
                    "tool_output": None,
                    "type": "answer",
                }
            )

        while True:
            try:
                data = await websocket.receive_json()

                if "message" in data and data["message"]:
                    user_message = data["message"]
                    decision, tool_output = session.next(
                        user_message,
                        return_tool=verbose,
                        return_step_transition=verbose,
                    )
                    action_type_map = {
                        Action.ANSWER.value: "answer",
                        Action.ASK.value: "answer",
                        Action.TOOL_CALL.value: "tool_call",
                        Action.MOVE.value: "step_transition",
                    }
                    action_type = action_type_map.get(decision.action.value, "unknown")
                    response_data = {
                        "message": decision.model_dump(mode="json"),
                        "tool_output": tool_output,
                        "type": action_type,
                    }
                    await websocket.send_json(response_data)
                    await session_store.set(session_id, session)

                elif "close" in data and data["close"]:
                    await websocket.close(code=1000, reason="Client requested close")
                    break
                else:
                    raise ValueError("Invalid message format")
            except Exception as e:
                await websocket.send_json(
                    {
                        "message": f"Error processing message: {str(e)}",
                        "tool_output": None,
                        "type": "error",
                    }
                )
                break
    except Exception as e:
        await websocket.send_json(
            {
                "message": f"Error: {str(e)}",
                "tool_output": None,
                "type": "error",
            }
        )
    finally:
        await websocket.close(code=1000, reason="Session ended")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000)
