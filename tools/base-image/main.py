"""Nomos Agent API."""

import os
import pathlib
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from nomos.models.flow import Message as FlowMessage, StepIdentifier, Summary

from src.agent import agent
from src.db import init_db
from src.models import ChatRequest, ChatResponse, Message, SessionResponse
from src.session_store import SessionStore, create_session_store


ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
SERVICE_NAME = os.getenv("SERVICE_NAME", "nomos-agent")
SERVICE_VERSION = os.getenv("SERVICE_VERSION", "0.0.1")

session_store: Optional[SessionStore] = None

BASE_DIR = pathlib.Path(__file__).parent.absolute()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager for FastAPI app."""
    global session_store
    # Initialize database
    await init_db()
    session_store = await create_session_store()
    assert session_store is not None, "Session store initialization failed"
    yield
    # Cleanup
    await session_store.close()


app = FastAPI(title=f"{SERVICE_NAME}-api", version=SERVICE_VERSION, lifespan=lifespan)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
app.mount("/static", StaticFiles(directory=str(BASE_DIR)), name="static")


# Serve chat UI at root
@app.get("/", response_class=HTMLResponse)
async def get_chat_ui() -> HTMLResponse:
    """Serve the chat UI HTML file."""
    chat_ui_path = BASE_DIR / "static" / "index.html"
    if not chat_ui_path.exists():
        raise HTTPException(status_code=404, detail="Chat UI file not found")

    with open(chat_ui_path, "r") as f:
        return HTMLResponse(content=f.read())


@app.post("/session", response_model=SessionResponse)
async def create_session(initiate: Optional[bool] = False) -> SessionResponse:
    """Create a new session."""
    assert session_store is not None, "Session store not initialized"
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
async def send_message(session_id: str, message: Message) -> SessionResponse:
    """Send a message to an existing session."""
    assert session_store is not None, "Session store not initialized"
    session = await session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    decision, _ = session.next(message.content)
    await session_store.set(session_id, session)
    return SessionResponse(
        session_id=session_id, message=decision.model_dump(mode="json")
    )


@app.delete("/session/{session_id}")
async def end_session(session_id: str) -> dict:
    """End and cleanup a session."""
    assert session_store is not None, "Session store not initialized"
    session = await session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Clean up session
    await session_store.delete(session_id)
    return {"message": "Session ended successfully"}


@app.get("/session/{session_id}/history")
async def get_session_history(session_id: str) -> dict:
    """Get the history of a session."""
    assert session_store is not None, "Session store not initialized"
    session = await session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Assuming session.history() returns a list of messages
    history: List[FlowMessage | StepIdentifier | Summary] = session.memory.get_history()
    history_json = [
        msg.model_dump(mode="json")
        for msg in history
        if isinstance(msg, FlowMessage) and msg.role not in ["error", "fallback"]
    ]
    return {"session_id": session_id, "history": history_json}


@app.post("/chat")
async def chat(request: ChatRequest, verbose: bool = False) -> ChatResponse:
    """Chat endpoint to get the next response from the agent based on the session data."""
    decision, tool_output, session_data = agent.next(
        **request.model_dump(), verbose=verbose
    )
    return ChatResponse(
        response=decision.model_dump(mode="json"),
        tool_output=tool_output,
        session_data=session_data,
    )


if __name__ == "__main__":
    import sys
    import uvicorn

    reload = "--reload" in sys.argv
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=reload)
