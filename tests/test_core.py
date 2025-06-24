"""Tests for core Nomos agent functionality."""

import sys
import pytest
from nomos.models.agent import Action, Message
from nomos.core import Agent
from nomos.config import AgentConfig
from nomos.models.tool import Tool, ToolWrapper


def test_agent_initialization(basic_agent):
    """Test that agent initializes correctly."""
    assert basic_agent.name == "test_agent"
    assert len(basic_agent.steps) == 2
    assert basic_agent.start == "start"
    assert basic_agent.persona == "Test persona"
    assert len(basic_agent.tools) == 3


def test_session_creation(basic_agent):
    """Test that agent can create a new session."""
    session = basic_agent.create_session(verbose=True)
    assert session.current_step.step_id == "start"
    assert len(session.memory.context) == 0


def test_tool_registration(basic_agent, test_tool_0):
    """Test that tools are properly registered and converted to Tool objects."""
    tool_name = test_tool_0.__name__
    session = basic_agent.create_session(verbose=True)
    assert len(session.tools) == 3
    assert isinstance(session.tools[tool_name], Tool)


def test_pkg_tool_registration(basic_agent):
    """Test that package tools are properly registered."""
    session = basic_agent.create_session(verbose=True)
    assert len(session.tools) == 3
    assert "combinations" in session.tools
    assert session.tools["combinations"].name == "combinations"


def test_basic_conversation_flow(basic_agent, test_tool_0, test_tool_1):
    """Test a basic conversation flow with the agent."""

    # Set up session
    session = basic_agent.create_session(verbose=True)

    expected_decision_model = basic_agent.llm._create_decision_model(
        current_step=session.current_step,
        current_step_tools=[
            Tool.from_function(test_tool_0),
            Tool.from_function(test_tool_1),
            ToolWrapper(
                tool_type="pkg",
                name="combinations",
                tool_identifier="itertools.combinations",
            ).get_tool(),
        ],
    )
    ask_response = expected_decision_model(
        reasoning=["Greeting"], action=Action.ASK.value, response="How can I help?"
    )

    assert session.current_step.get_available_routes() == ["end"]
    assert session.current_step.available_tools == [
        "test_tool",
        "another_test_tool",
        "combinations",
    ]

    # Set up mock responses
    session.llm.set_response(ask_response)

    # First interaction
    decision, _ = session.next()
    assert len(session.llm.messages_received) == 2
    assert session.llm.messages_received[0].role == "system"
    assert "Test persona" in session.llm.messages_received[0].content
    assert session.llm.messages_received[1].role == "user"
    assert decision.action == Action.ASK
    assert decision.response == "How can I help?"

    ask_response = expected_decision_model(
        reasoning=["User input"],
        action=Action.ANSWER.value,
        response="I can help you with that.",
    )
    session.llm.set_response(ask_response)
    # User response
    decision, _ = session.next("I need help")
    assert len(session.llm.messages_received) == 2
    assert session.llm.messages_received[1].role == "user"
    assert "How can I help?" in session.llm.messages_received[1].content
    assert "I need help" in session.llm.messages_received[1].content
    assert decision.action == Action.ANSWER
    assert decision.response == "I can help you with that."


def test_tool_usage(basic_agent, test_tool_0, test_tool_1):
    """Test that the agent can properly use tools."""

    # Start session and use tool
    session = basic_agent.create_session(verbose=True)

    # Create response models with tool
    tool_model = basic_agent.llm._create_decision_model(
        current_step=session.current_step,
        current_step_tools=[
            Tool.from_function(test_tool_0),
            Tool.from_function(test_tool_1),
            ToolWrapper(
                tool_type="pkg",
                name="combinations",
                tool_identifier="itertools.combinations",
            ).get_tool(),
        ],
    )

    # Set up mock responses
    tool_response = tool_model(
        reasoning=["Need to use test tool"],
        action=Action.TOOL_CALL.value,
        tool_call={
            "tool_name": "test_tool",
            "tool_kwargs": {"arg0": "test_arg"},
        },
    )

    session.llm.set_response(tool_response)

    # Tool usage
    decision, tool_result = session.next("Use the tool", return_tool=True)
    assert len(session.llm.messages_received) == 2
    assert session.llm.messages_received[1].role == "user"
    assert "Use the tool" in session.llm.messages_received[1].content
    assert decision.action == Action.TOOL_CALL
    assert decision.tool_call.tool_name == "test_tool"
    assert tool_result == "Test tool 0 response: test_arg"

    # Verify tool message in history
    messages = [msg for msg in session.memory.context if isinstance(msg, Message)]
    assert any(msg.role == "tool" for msg in messages)


def test_pkg_tool_usage(basic_agent, test_tool_0, test_tool_1):
    """Test that the agent can properly use tools."""

    # Start session and use tool
    session = basic_agent.create_session(verbose=True)

    # Create response models with tool
    tool_model = basic_agent.llm._create_decision_model(
        current_step=session.current_step,
        current_step_tools=[
            Tool.from_function(test_tool_0),
            Tool.from_function(test_tool_1),
            ToolWrapper(
                tool_type="pkg",
                name="combinations",
                tool_identifier="itertools.combinations",
            ).get_tool(),
        ],
    )

    # Set up mock responses
    tool_response = tool_model(
        reasoning=["Need to use combinations tool"],
        action=Action.TOOL_CALL.value,
        tool_call={
            "tool_name": "combinations",
            "tool_kwargs": {"iterable": "abc", "r": 2},
        },
    )

    session.llm.set_response(tool_response)

    # Tool usage
    decision, _ = session.next("Use the tool", return_tool=True)

    # Verify tool message in history
    messages = [msg for msg in session.memory.context if isinstance(msg, Message)]
    assert any(msg.role == "tool" for msg in messages)


def test_invalid_tool_args(basic_agent, test_tool_0, test_tool_1):
    """Test handling of invalid tool arguments."""

    session = basic_agent.create_session(verbose=True)

    tool_model = basic_agent.llm._create_decision_model(
        current_step=session.current_step,
        current_step_tools=[
            Tool.from_function(test_tool_0),
            Tool.from_function(test_tool_1),
            ToolWrapper(
                tool_type="pkg",
                name="combinations",
                tool_identifier="itertools.combinations",
            ).get_tool(),
        ],
    )

    # Set up response with invalid args
    invalid_response = tool_model(
        action=Action.TOOL_CALL.value,
        reasoning=["Testing invalid args"],
        tool_call={
            "tool_name": "test_tool",
            "tool_kwargs": {"arg1": "value"},  # Invalid argument
        },
    )

    session.llm.set_response(invalid_response)

    with pytest.raises(ValueError, match="Maximum errors reached"):
        decision, _ = session.next("Use tool with invalid args", return_tool=True)

    # Verify error message in history
    messages = [msg for msg in session.memory.context if isinstance(msg, Message)]
    assert any(msg.role == "error" for msg in messages)


def test_config_loading(mock_llm, basic_steps, test_tool_0, test_tool_1):
    """Test loading agent from config."""
    from itertools import combinations

    config = AgentConfig(
        name="config_test",
        steps=basic_steps,
        start_step_id="start",
        persona="Config test persona",
        tools={
            "tool_arg_descriptions": {
                "test_tool": {"arg0": "Test argument"},
                "another_test_tool": {"arg1": "Another test argument"},
            }
        },
    )

    agent = Agent.from_config(
        llm=mock_llm,
        config=config,
        tools=[test_tool_0, test_tool_1, combinations],
    )

    assert agent.name == "config_test"
    assert agent.persona == "Config test persona"
    assert len(agent.steps) == 2
    assert len(agent.tools) == 3

    session = agent.create_session(verbose=True)

    # Test that tool arg descriptions were properly loaded
    tool = session.tools["test_tool"]
    assert tool.parameters["arg0"]["description"] == "Test argument"


@pytest.mark.skipif(sys.version_info < (3, 10), reason="Requires Python 3.10 or higher")
def test_external_tools_registration(mock_llm, basic_steps, test_tool_0, test_tool_1):
    """Test that external tools are properly registered in the session."""
    # Test whether crewai tool is registered

    import os

    os.environ["OPENAI_API_KEY"] = "test_key"  # PDFSearchTool requires this env var

    config = AgentConfig(
        name="config_test",
        steps=basic_steps,
        start_step_id="start",
        persona="Config test persona",
        tools={
            "external_tools": [
                {"tag": "@pkg/itertools.combinations", "name": "combinations"},
                {"tag": "@crewai/FileReadTool", "name": "file_read_tool"},
                {
                    "tag": "@crewai/PDFSearchTool",
                    "name": "pdf_search_tool",
                    "kwargs": {
                        "pdf": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
                    },
                },
            ],
        },
    )

    agent = Agent.from_config(
        llm=mock_llm,
        config=config,
        tools=[test_tool_0, test_tool_1],
    )

    assert agent.name == "config_test"
    assert agent.persona == "Config test persona"
    assert len(agent.steps) == 2
    assert len(agent.tools) == 5

    session = agent.create_session(verbose=True)

    # Test that package tool was properly registered
    pkg_tool = session.tools["combinations"]
    assert isinstance(pkg_tool, Tool)
    assert pkg_tool.name == "combinations"

    # Test whether crewai FileReadTool is registered
    crewai_tool = session.tools.get("file_read_tool")
    assert crewai_tool is not None
    assert (
        crewai_tool.get_args_model()
        .model_json_schema()
        .get("properties", {})
        .get("file_path")
        is not None
    )

    # Test whether PDFSearchTool is registered
    pdf_search_tool = session.tools.get("pdf_search_tool")
    assert pdf_search_tool is not None
    assert (
        pdf_search_tool.get_args_model()
        .model_json_schema()
        .get("properties", {})
        .get("query")
        is not None
    )
