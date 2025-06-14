"""Module defining the MCP related types."""

import enum
from typing import Optional

from pydantic import BaseModel


class MCPToolCallResult(BaseModel):
    """Represents the result of a tool call in MCP.

    Attributes:
        tool_call_id (Optional[str]): Unique identifier for the tool call.
        content (Optional[str]): List of strings representing the content returned by the tool.
        error (Optional[str]): Error message if the tool call failed.
    """

    tool_call_id: str
    content: Optional[str] = None
    error: Optional[str] = None


class MCPServerTransport(str, enum.Enum):
    """
    Enum representing different types of MCP servers.

    Attributes:
        mcp: Represents a Model Configuration Protocol (MCP) server.
    """

    mcp = "mcp"
