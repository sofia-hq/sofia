"""Sofia Agent API."""

import os
import pathlib
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel

from sofia_agent.models.flow import Message as FlowMessage, Step

from src.agent import agent
from src.db import init_db
from src.session_store import SessionStore, create_session_store


ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

session_store: Optional[SessionStore] = None

# Get the directory of the current file
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


app = FastAPI(title="Sofia Agent API", version="0.1.1", lifespan=lifespan)

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


class Message(BaseModel):
    """Model for incoming messages."""

    content: str


class SessionResponse(BaseModel):
    """Response model for session creation."""

    session_id: str
    message: dict


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
    history: list[FlowMessage | Step] = session.history
    history_json = [
        msg.model_dump(mode="json")
        for msg in history
        if isinstance(msg, FlowMessage) and msg.role not in ["error", "fallback"]
    ]
    return {"session_id": session_id, "history": history_json}


class SessionData(BaseModel):
    """Model for session data."""

    session_id: str
    current_step_id: str
    history: list


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""

    user_input: Optional[str] = None
    session_data: Optional[SessionData] = None


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""

    response: dict
    tool_output: Optional[str] = None
    session_data: SessionData


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


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket, session_id: str, initiate: bool = False, verbose: bool = False
) -> None:
    """Websocket endpoint for real-time communication."""
    assert session_store is not None, "Session store not initialized"
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
                    response_data = {
                        "message": decision.model_dump(mode="json"),
                        "tool_output": tool_output,
                        "type": decision.action.value,
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

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
