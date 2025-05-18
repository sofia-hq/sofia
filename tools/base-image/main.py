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
    session_data: SessionData


@app.post("/chat")
async def chat(request: ChatRequest):
    """Chat endpoint to get the next response from the agent based on the session data"""
    decision, session_data = agent.next(**request.model_dump())
    return ChatResponse(
        response=decision.model_dump(mode="json"), session_data=session_data
    )


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket, session_id: str, initiate: bool = False, verbose: bool = False
):
    """WebSocket endpoint for real-time communication"""
    print(f"WebSocket connection requested for session {session_id}")
    await websocket.accept()
    print(f"WebSocket connection accepted for session {session_id}")

    # Track if the connection is still open
    connection_open = True

    try:
        session = await session_store.get(session_id)
        if not session:
            print(f"Session {session_id} not found, closing WebSocket")
            await websocket.close(code=1000, reason="Session not found")
            connection_open = False
            return

        # Send initial greeting if requested
        if initiate:
            print(f"Sending initial greeting for session {session_id}")
            decision, tool_output = session.next(
                None, return_tool=verbose, return_step_transition=verbose
            )
            await session_store.set(session_id, session)
            await websocket.send_json(
                {
                    "message": decision.model_dump(mode="json"),
                    "tool_output": tool_output,
                }
            )

        print(f"Entering message loop for session {session_id}")
        # Wait for messages from the client
        while connection_open:
            try:
                # This is where we wait for messages
                print(f"Waiting for message from client for session {session_id}")
                data = await websocket.receive_json()
                print(f"Received data for session {session_id}: {data}")

                # Handle ping messages to keep connection alive
                if "ping" in data:
                    # Just send a pong response
                    print(f"Received ping, sending pong for session {session_id}")
                    if connection_open:
                        try:
                            await websocket.send_json({"pong": data.get("ping")})
                            # Give a moment for pong to be processed
                            await asyncio.sleep(0.1)
                        except Exception as pong_error:
                            print(
                                f"Error sending pong: {type(pong_error).__name__} - {str(pong_error)}"
                            )
                            connection_open = False
                    continue

                if "message" in data and data["message"]:
                    user_message = data["message"]
                    print(
                        f"Processing user message for session {session_id}: {user_message}"
                    )
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
                    if connection_open:
                        try:
                            print(
                                f"Sending response of type {action_type} for session {session_id}"
                            )

                            # Convert model data to a simpler format to avoid serialization issues
                            message_data = decision.model_dump(mode="json")

                            # Create a more controlled response payload
                            response_data = {
                                "message": message_data,
                                "type": action_type,
                            }

                            # Send the response
                            await websocket.send_json(response_data)

                            # Save session after successful send
                            await session_store.set(session_id, session)
                            print(
                                f"Response sent successfully for session {session_id}"
                            )

                            # Give client a moment to process the response before waiting for next message
                            # Increased delay to give more time for client to process and prevent race conditions
                            await asyncio.sleep(0.5)
                        except Exception as send_error:
                            print(
                                f"Error sending response: {type(send_error).__name__} - {str(send_error)}"
                            )
                            # Don't close the connection, try to recover
                            if connection_open:
                                try:
                                    await websocket.send_json(
                                        {
                                            "error": f"Error sending response: {str(send_error)}",
                                            "type": "error",
                                        }
                                    )
                                except:
                                    print(
                                        f"Failed to send error message, connection may be broken"
                                    )
                else:
                    # If message is missing or empty, send back an error
                    print(f"Received invalid message format for session {session_id}")
                    if connection_open:
                        await websocket.send_json(
                            {
                                "error": "Invalid message format. Expected 'message' field with non-empty content."
                            }
                        )
            except starlette.websockets.WebSocketDisconnect as ws_disconnect:
                # Client disconnected, exit gracefully
                print(
                    f"Client disconnected from WebSocket for session {session_id}. Code: {ws_disconnect.code}"
                )
                connection_open = False
                break
            except Exception as inner_e:
                # Handle any errors within the message processing loop
                print(
                    f"Error processing message for session {session_id}: {type(inner_e).__name__} - {str(inner_e)}"
                )
                # Send an error message but don't close the connection from here
                if connection_open:
                    try:
                        await websocket.send_json(
                            {
                                "error": f"Error processing message: {str(inner_e)}",
                                "type": "error",
                            }
                        )
                    except:
                        # If sending fails, mark connection as closed
                        print(
                            f"Failed to send error message, closing connection for session {session_id}"
                        )
                        connection_open = False
                        break
    except starlette.websockets.WebSocketDisconnect as ws_disconnect:
        # Handle websocket disconnection at the outer level
        print(
            f"WebSocket disconnected for session {session_id}. Code: {ws_disconnect.code}"
        )
        connection_open = False
    except Exception as e:
        print(
            f"WebSocket endpoint error for session {session_id}: {type(e).__name__} - {str(e)}"
        )
        # Only try to close the connection if it's still open
        if connection_open:
            try:
                await websocket.close(code=1011, reason=f"Error: {str(e)}")
                connection_open = False
            except:
                # Connection might already be closed
                print(f"Failed to close WebSocket connection for session {session_id}")
                connection_open = False


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000)
