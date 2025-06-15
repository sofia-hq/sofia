"""Integration tests for MCP tool functionality with Agent and Session."""

from unittest.mock import patch

import pytest

from nomos.config import AgentConfig
from nomos.core import Agent
from nomos.llms import LLMBase
from nomos.models.agent import Step
from nomos.models.mcp import MCPServerTransport
from nomos.models.tool import MCPServer, Tool


class MockLLM(LLMBase):
    """Mock LLM for testing."""

    def __init__(self):
        """Initialize MockLLM."""
        self.return_value = None

    def _get_output(self, **kwargs):
        """Mock implementation of get_output."""
        return self.return_value


@pytest.fixture
def mcp_server():
    """Fixture for MCP server."""
    return MCPServer(
        name="test-server",
        url="https://example.com",
        path="mcp/",
        server_transport=MCPServerTransport.mcp,
    )


def test_agent_config_with_mcp_servers():
    """Test loading MCP servers from AgentConfig."""
    # Create a temporary YAML file with MCP server configuration
    import tempfile
    import yaml

    config_data = {
        "name": "test_agent",
        "steps": [
            {
                "step_id": "start",
                "description": "Start step",
                "available_tools": ["mcp:test-server:mcp_tool"],
                "routes": [],
            }
        ],
        "start_step_id": "start",
        "mcp_servers": [
            {
                "name": "test-server",
                "url": "https://example.com",
                "path": "mcp/",
                "server_transport": "mcp",
            }
        ],
    }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml") as temp_file:
        yaml.dump(config_data, temp_file)
        temp_file.flush()

        # Load the config from the YAML file
        config = AgentConfig.from_yaml(temp_file.name)

        # Verify MCP servers were loaded correctly
        assert config.mcp_servers is not None
        assert len(config.mcp_servers) == 1
        assert config.mcp_servers[0].name == "test-server"
        assert config.mcp_servers[0].get_url() == "https://example.com/mcp"
        assert config.mcp_servers[0].server_transport == MCPServerTransport.mcp


def test_agent_config_with_mcp_tools():
    """Test agent configuration with MCP tools."""
    # Create a temporary YAML file with MCP tool configuration
    import tempfile
    import yaml

    config_data = {
        "name": "test_agent",
        "steps": [
            {
                "step_id": "start",
                "description": "Start step",
                "available_tools": ["mcp:test-server:mcp_tool"],
                "routes": [],
            }
        ],
        "start_step_id": "start",
        "mcp_servers": [
            {
                "name": "test-server",
                "url": "https://example.com",
                "path": "mcp/",
                "server_transport": "mcp",
            }
        ],
    }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml") as temp_file:
        yaml.dump(config_data, temp_file)
        temp_file.flush()

        # Load the config from the YAML file
        config = AgentConfig.from_yaml(temp_file.name)

        # Verify MCP tools were loaded correctly
        assert config.steps[0].tool_ids == ["mcp_tool"]


def test_agent_initialization_with_mcp_servers():
    """Test agent initialization with MCP servers in config."""
    # Create MCP servers
    mcp_server1 = MCPServer(
        name="server1",
        url="https://example1.com",
        path="mcp/",
    )
    mcp_server2 = MCPServer(
        name="server2",
        url="https://example2.com",
        path="mcp/",
    )

    steps = [
        Step(
            step_id="step1",
            description="Step with MCP tools from server1",
            available_tools=["mcp:server1:tool1", "mcp:server2:tool2"],
            routes=[],
        )
    ]

    # Create config with MCP servers
    config = AgentConfig(
        name="test_agent",
        steps=steps,
        start_step_id="step1",
        mcp_servers=[mcp_server1, mcp_server2],
    )

    # Mock MCP server tools
    with patch.object(MCPServer, "get_tools") as mock_get_tools:
        mock_get_tools.side_effect = lambda: [
            Tool(
                name=f"tool{i}",
                description=f"Tool {i}",
                function=lambda: None,
                remote_server=server,
            )
            for i, server in enumerate([mcp_server1, mcp_server2], 1)
        ]

        # Create agent from config
        agent = Agent.from_config(config, MockLLM())

        # Verify MCP servers are correctly set
        assert len(agent.mcp_servers) == 2
        assert {server.name for server in agent.mcp_servers} == {"server1", "server2"}

        # Verify tools from both servers are available
        tool_names = [
            tool.name if isinstance(tool, Tool) else tool for tool in agent.tools
        ]
        assert "tool1" in tool_names
        assert "tool2" in tool_names


def test_session_with_mcp_server():
    """Test session with MCP server."""
    mcp_server_name = "server1"
    mcp_tool_name = "mcp_tool"
    mcp_server = MCPServer(
        name=mcp_server_name,
        url="https://example.com",
        path="mcp/",
        server_transport=MCPServerTransport.mcp,
    )

    steps = [
        Step(
            step_id="step1",
            description="Step with MCP tools from server1",
            available_tools=[f"mcp:{mcp_server_name}:{mcp_tool_name}"],
            routes=[],
        )
    ]

    config = AgentConfig(
        name="test_agent",
        steps=steps,
        start_step_id="step1",
        mcp_servers=[mcp_server],
    )

    with patch.object(MCPServer, "get_tools") as mock_get_tools:
        mock_get_tools.side_effect = lambda: [
            Tool(
                name=mcp_tool_name,
                description=mcp_tool_name,
                function=lambda: None,
                remote_server=mcp_server,
            )
        ]

        agent = Agent.from_config(config, MockLLM())
        session = agent.create_session()
        assert len(session.tools) == 1
        assert mcp_tool_name in session.tools
