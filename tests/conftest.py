"""Common test fixtures for Sofia agent tests."""

import pytest
from typing import List
from pydantic import BaseModel

from nomos.models.flow import Message, Step, Route
from nomos.llms import LLMBase
from nomos.core import Agent
from nomos.utils.logging import log_error


class MockLLM(LLMBase):
    """Mock LLM for testing."""

    def __init__(self):
        """Initialize mock LLM."""
        self.response = None
        self.messages_received = []

    def set_response(self, response: BaseModel):
        """Set the responses that the mock LLM will return."""
        log_error(f"Setting mock response: {response}")
        self.response = response

    def get_output(
        self, messages: List[Message], response_format: BaseModel
    ) -> BaseModel:
        """Mock implementation that returns pre-set responses."""
        self.messages_received = messages

        if not self.response:
            raise ValueError("No more mock response available")
        # Check if the response schema matches the expected format schema
        assert (
            self.response.model_json_schema() == response_format.model_json_schema()
        ), f"Response schema mismatch: {self.response.model_json_schema()} != {response_format.model_json_schema()}"
        return self.response


@pytest.fixture
def mock_llm():
    """Fixture providing a mock LLM instance."""
    return MockLLM()


@pytest.fixture
def basic_steps():
    """Fixture providing basic steps for testing."""
    start_step = Step(
        step_id="start",
        description="Start step",
        routes=[Route(target="end", condition="User is done")],
        available_tools=["test_tool", "another_test_tool", "itertools:combinations"],
    )

    end_step = Step(
        step_id="end", description="End step", routes=[], available_tools=[]
    )

    return [start_step, end_step]


@pytest.fixture
def test_tool_0():
    """Fixture providing a test tool function."""

    def test_tool(arg0: str = "test") -> str:
        """Test tool function."""
        return f"Test tool 0 response: {arg0}"

    return test_tool


@pytest.fixture
def test_tool_1():
    """Fixture providing a second test tool function."""

    def another_test_tool(arg1: str = "test") -> str:
        """Test tool function."""
        return f"Test tool 1 response: {arg1}"

    return another_test_tool


@pytest.fixture
def basic_agent(mock_llm, basic_steps, test_tool_0, test_tool_1):
    """Fixture providing a basic Sofia agent instance."""
    return Agent(
        name="test_agent",
        llm=mock_llm,
        steps=basic_steps,
        start_step_id="start",
        tools=[test_tool_0, test_tool_1],
        persona="Test persona",
    )
