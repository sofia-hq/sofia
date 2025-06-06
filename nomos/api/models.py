"""Models for the API requests and responses."""

from typing import Optional

from pydantic import BaseModel


class Message(BaseModel):
    """Model for incoming messages."""

    content: str


class SessionResponse(BaseModel):
    """Response model for session creation."""

    session_id: str
    message: dict


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
