import pytest
from pydantic import SecretStr, HttpUrl
from unittest.mock import patch, MagicMock

from nomos.models.tool import MCPServer, RemoteToolServer, Tool


@pytest.fixture
def remote_tool_server():
    """Fixture for RemoteToolServer."""
    return RemoteToolServer(
        name="test-remote-server",
        url=HttpUrl("https://example.com"),
        path="api/tools",
        api_key=SecretStr("supersecret"),
    )


@pytest.fixture
def mcp_server():
    """Fixture for MCPServer."""
    return MCPServer(
        name="test-mcp-server",
        url=HttpUrl("https://example.com"),
        path="mcp/",
        server_transport="mcp",
    )


def test_remotetoolserver_get_url(remote_tool_server):
    assert remote_tool_server.get_url() == "https://example.com/api/tools"


def test_mcpserver_get_tools(mcp_server):
    tool_list = [
        {
            "name": "tool1",
            "description": "A test tool",
            "inputSchema": {"properties": {}},
        },
    ]
    with patch("nomos.models.tool.MCPClient") as MockMCPClient:
        mock_client = MockMCPClient.return_value
        mock_client.get_tools_list.return_value = tool_list
        tools = mcp_server.get_tools()
        mock_client.get_tools_list.assert_called_once()
        assert len(tools) == 1
        assert isinstance(tools[0], Tool)
        assert tools[0].name == "tool1"
        assert tools[0].remote_server == mcp_server


def test_mcpserver_call_tool(mcp_server):
    func = MagicMock()
    call_tool_mock = MagicMock()
    tool = Tool(
        name="test_tool",
        description="A test tool",
        function=func,
        remote_server=mcp_server,
    )
    call_tool_args = {"param1": "value1"}
    with patch("nomos.models.tool.MCPClient") as MockMCPClient:
        mock_client = MockMCPClient.return_value
        mock_client.call_tool = call_tool_mock
        mcp_server.call_tool(tool, **call_tool_args)
        mock_client.call_tool.assert_called_once_with(tool.name, call_tool_args)
