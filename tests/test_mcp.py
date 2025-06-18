"""Tests for MCP client and MCP tool functionality."""

from contextlib import contextmanager
import uuid
import json
from unittest.mock import MagicMock, patch

import pytest
import respx
from httpx import Response

from nomos.mcp.client import MCPClient, MCPClientError, MCPServerResponse
from nomos.models.mcp import MCPServerTransport, MCPToolCallResult
from nomos.models.tool import MCPServer, Tool


@contextmanager
def mock_session():
    mock_conn = MagicMock()
    mock_conn.execute.return_value = "session_1"
    yield mock_conn


@pytest.fixture
def mcp_client():
    """Fixture for MCP client."""
    return MCPClient(
        base_url="https://example.com",
        path="mcp/",
        transport=MCPServerTransport.mcp,
        client_name="test-client",
        protocol_version="2025-03-26",
    )


@pytest.fixture
def mcp_server():
    """Fixture for MCP server."""
    return MCPServer(
        name="test-server",
        url="https://example.com",
        path="mcp/",
        server_transport=MCPServerTransport.mcp,
    )


@pytest.fixture
def mock_tools_list():
    """Fixture for mock tools list."""
    data = [{"name": "test_tool", "description": "A test tool", "inputSchema": {}}]
    return data


@pytest.fixture
def mock_tools_list_text(mock_tools_list):
    """Fixture for mock tools list text."""
    return f'data: {{"result": {{"tools": {json.dumps(mock_tools_list)}}}}}'


@pytest.fixture
def mock_tools_list_server_response(mock_tools_list_text):
    """Fixture for mock tools list server response."""
    res = Response(
        status_code=200,
        text=mock_tools_list_text,
        headers={"content-type": "text/event-stream"},
    )
    return MCPServerResponse(res, MCPServerTransport.mcp)


@pytest.fixture
def mock_tool_call_response_success():
    """Fixture for mock tool call success response."""
    data = """data: {"id":"67890","result":{"content":[{"text":"Tool execution result"}],"isError":false}}"""
    res = Response(
        status_code=200,
        text=data,
        headers={"content-type": "text/event-stream"},
    )
    return MCPServerResponse(res, MCPServerTransport.mcp)


@pytest.fixture
def mock_tool_call_response_error():
    """Fixture for mock tool call error response."""
    data = """data: {"id":"67890","result":{"content":[{"text":"Tool execution error"}],"isError":true}}"""
    res = Response(
        status_code=200,
        text=data,
        headers={"content-type": "text/event-stream"},
    )
    return MCPServerResponse(res, MCPServerTransport.mcp)


def test_mcp_client_init():
    """Test MCP client initialization."""
    client = MCPClient(
        base_url="https://example.com",
        path="mcp/",
        client_name="test-client",
    )

    assert client.base_url == "https://example.com"
    assert client.path == "mcp/"
    assert client.transport == MCPServerTransport.mcp
    assert client.client_name == "test-client"
    assert client.protocol_version == MCPClient.default_protocol_version


def test_mcp_client_default_mcp_path():
    """Test default path for MCP transport."""
    client = MCPClient(
        base_url="https://example.com",
        transport=MCPServerTransport.mcp,
        client_name="test-client",
    )

    assert client.path == "mcp/"
    assert client.transport == MCPServerTransport.mcp


def test_mcp_server_response_attributes():
    """Test MCP server response parsing."""
    response_status = 200
    response_headers = {"content-type": "text/event-stream"}
    raw_response = Response(
        status_code=response_status,
        text="""
            event: message
            data: { "key1": "value1" }
        """,
        headers=response_headers,
    )

    response = MCPServerResponse(raw_response, MCPServerTransport.mcp)
    assert response.status_code == response_status


def test_mcp_server_response_parsing():
    """Test MCP server response parsing."""
    raw_response = Response(
        status_code=200,
        text="""
            event: message
            data: { "key1": "value1" }
        """,
        headers={"content-type": "text/event-stream"},
    )

    response = MCPServerResponse(raw_response, MCPServerTransport.mcp)
    parsed_json = response.json

    assert parsed_json == {"event": "message", "data": {"key1": "value1"}}


@respx.mock
def test_create_session(mcp_client):
    """Test creating a session with MCP server."""
    session_id = str(uuid.uuid4())

    respx.post("https://example.com/mcp/").mock(
        return_value=Response(
            200,
            headers={"mcp-session-id": session_id},
            text="",
        )
    )

    response_session_id = mcp_client._create_session()
    assert response_session_id == session_id


@respx.mock
def test_create_session_errors(mcp_client):
    """Errors when creating session should raise a MCPClientError."""

    respx.post("https://example.com/mcp/").mock(
        return_value=Response(
            400,
            text="",
        )
    )
    with pytest.raises(MCPClientError):
        mcp_client._create_session()


def test_get_tools(mcp_client, mock_tools_list, mock_tools_list_server_response):
    """Test getting tools from MCP client."""

    with patch.object(mcp_client, "session", return_value=mock_session()):
        with patch.object(
            MCPClient, "_jsonrpc_request", return_value=mock_tools_list_server_response
        ):
            tools = mcp_client.get_tools_list()
            assert tools == mock_tools_list


@respx.mock
def test_call_tool_success(mcp_client, mock_tool_call_response_success):
    """Test successful tool call."""
    with patch.object(mcp_client, "session", return_value=mock_session()):
        with patch.object(
            MCPClient, "_jsonrpc_request", return_value=mock_tool_call_response_success
        ):
            result = mcp_client.call_tool(
                "test_tool", {"param1": "value1", "param2": 42}
            )
            assert isinstance(result, MCPToolCallResult)
            assert result.content == "Tool execution result"
            assert result.error is None


@respx.mock
def test_call_tool_error(mcp_client, mock_tool_call_response_error):
    """Test tool call with error."""
    with patch.object(mcp_client, "session", return_value=mock_session()):
        with patch.object(
            MCPClient, "_jsonrpc_request", return_value=mock_tool_call_response_error
        ):
            result = mcp_client.call_tool(
                "test_tool", {"param1": "value1", "param2": 42}
            )
            assert isinstance(result, MCPToolCallResult)
            assert result.content is None
            assert result.error == "Tool execution error"


@respx.mock
def test_client_errors(mcp_client):
    """Should raise MCPClientError for HTTP errors."""

    respx.get("https://example.com/mcp/").mock(
        return_value=Response(
            400,
            text="",
        )
    )
    with pytest.raises(MCPClientError):
        mcp_client._request("GET", {}, {})
