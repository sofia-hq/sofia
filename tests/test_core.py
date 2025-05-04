"""Tests for core Sofia agent functionality."""
import pytest
from sofia_agent.models.flow import Action, create_route_decision_model, Message
from sofia_agent.models.tool import InvalidArgumentsError
from sofia_agent.core import Sofia
from sofia_agent.config import AgentConfig
from sofia_agent.models.tool import Tool

def test_agent_initialization(basic_agent):
    """Test that agent initializes correctly."""
    assert basic_agent.name == "test_agent"
    assert len(basic_agent.steps) == 2
    assert basic_agent.start == "start"
    assert basic_agent.persona == "Test persona"
    assert len(basic_agent.tools) == 2

def test_session_creation(basic_agent):
    """Test that agent can create a new session."""
    session = basic_agent.create_session()
    assert session.current_step.step_id == "start"
    assert len(session.history) == 0

def test_tool_registration(basic_agent, test_tool_0):
    """Test that tools are properly registered and converted to Tool objects."""
    tool_name = test_tool_0.__name__
    session = basic_agent.create_session()
    assert len(session.tools) == 2
    assert isinstance(session.tools[tool_name], Tool)

def test_basic_conversation_flow(basic_agent, test_tool_0, test_tool_1):
    """Test a basic conversation flow with the agent."""

    expected_decision_model = create_route_decision_model(
        available_step_ids=["end"],
        tool_ids=["test_tool", "another_test_tool"],
        tool_models=[
            Tool.from_function(test_tool_0).get_args_model(), 
            Tool.from_function(test_tool_1).get_args_model()
        ]
    )
    ask_response = expected_decision_model(
        reasoning=["Greeting"],
        action = Action.ASK.value,
        input="How can I help?"
    )
    
    # Set up session
    session = basic_agent.create_session()

    assert session.current_step.get_available_routes() == ["end"]
    assert session.current_step.available_tools == ["test_tool", "another_test_tool"]

    # Set up mock responses
    session.llm.set_response(ask_response)
    
    # First interaction
    decision, _ = session.next()
    assert len(session.llm.messages_received) == 2
    assert session.llm.messages_received[0].role == "system"
    assert "Your Name: test_agent" in session.llm.messages_received[0].content
    assert "Test persona" in session.llm.messages_received[0].content
    assert session.llm.messages_received[1].role == "user"
    assert decision.action.value == Action.ASK.value
    assert decision.input == "How can I help?"

    ask_response = expected_decision_model(
        reasoning=["User input"],
        action = Action.ANSWER.value,
        input="I can help you with that."
    )
    session.llm.set_response(ask_response)
    # User response
    decision, _ = session.next("I need help")
    assert len(session.llm.messages_received) == 2
    assert session.llm.messages_received[1].role == "user"
    assert "<Step> start" in session.llm.messages_received[1].content
    assert "How can I help?" in session.llm.messages_received[1].content
    assert "I need help" in session.llm.messages_received[1].content
    assert decision.action.value == Action.ANSWER.value
    assert decision.input == "I can help you with that."


def test_tool_usage(basic_agent, test_tool_0, test_tool_1):
    """Test that the agent can properly use tools."""
    # Create response models with tool
    tool_model = create_route_decision_model(
        available_step_ids=["end"],
        tool_ids=["test_tool", "another_test_tool"],
        tool_models=[
            Tool.from_function(test_tool_0).get_args_model(),
            Tool.from_function(test_tool_1).get_args_model()
        ]
    )
    
    # Set up mock responses
    tool_response = tool_model(
        reasoning=["Need to use test tool"],
        action=Action.TOOL_CALL.value,
        tool_name="test_tool",
        tool_kwargs={"arg0": "test_arg"}
    )
    
    # Start session and use tool
    session = basic_agent.create_session()
    session.llm.set_response(tool_response)
    
    # Tool usage
    decision, tool_result = session.next("Use the tool")
    assert len(session.llm.messages_received) == 2
    assert session.llm.messages_received[1].role == "user"
    assert "Use the tool" in session.llm.messages_received[1].content
    assert decision.action.value == Action.TOOL_CALL.value
    assert decision.tool_name == "test_tool"
    assert tool_result == "Test tool 0 response: test_arg"
    
    # Verify tool message in history
    messages = [msg for msg in session.history if isinstance(msg, Message)]
    assert any(msg.role == "tool" for msg in messages)

def test_invalid_tool_args(basic_agent, test_tool_0, test_tool_1):
    """Test handling of invalid tool arguments."""
    tool_model = create_route_decision_model(
        available_step_ids=["end"],
        tool_ids=["test_tool", "another_test_tool"],
        tool_models=[
            Tool.from_function(test_tool_0).get_args_model(),
            Tool.from_function(test_tool_1).get_args_model()
        ]
    )
    
    # Set up response with invalid args
    invalid_response = tool_model(
        action=Action.TOOL_CALL.value,
        reasoning=["Testing invalid args"],
        tool_name="test_tool",
        tool_kwargs={"arg1": "value"}  # Wrong argument name
    )
    
    
    session = basic_agent.create_session()
    session.llm.set_response(invalid_response)

    with pytest.raises(InvalidArgumentsError):
        decision, _ = session.next("Use tool with invalid args")
    
    # Verify error message in history
    messages = [msg for msg in session.history if isinstance(msg, Message)]
    assert any(msg.role == "error" for msg in messages)

def test_config_loading(mock_llm, basic_steps, test_tool_0, test_tool_1):
    """Test loading agent from config."""
    config = AgentConfig(
        name="config_test",
        steps=basic_steps,
        start_step_id="start",
        persona="Config test persona",
        tool_arg_descriptions={
            "test_tool": {"arg0": "Test argument"},
            "another_test_tool": {"arg1": "Another test argument"}
        }, 
    )
    
    agent = Sofia.from_config(
        llm=mock_llm,
        config=config,
        tools=[test_tool_0, test_tool_1],
    )
    
    assert agent.name == "config_test"
    assert agent.persona == "Config test persona"
    assert len(agent.steps) == 2
    assert len(agent.tools) == 2

    session = agent.create_session()
    
    # Test that tool arg descriptions were properly loaded
    tool = session.tools["test_tool"]
    assert tool.parameters["arg0"]["description"] == "Test argument"