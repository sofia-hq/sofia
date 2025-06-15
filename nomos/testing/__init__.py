from __future__ import annotations

from uuid import uuid4
from typing import List, Union

from pydantic import BaseModel, Field

from nomos.llms import LLMBase
from nomos.models.agent import Message, Summary, StepIdentifier


class SessionContext(BaseModel):
    """Container for session data required by :meth:`Agent.next`."""

    session_id: str = Field(default_factory=lambda: str(uuid4()))
    current_step_id: str | None = None
    history: List[Union[Summary, Message, StepIdentifier]] = Field(default_factory=list)


class AssertionResult(BaseModel):
    """LLM structured output for expectation checks."""

    reasoning: List[str] = Field(..., description="Step by step reasoning")
    success: bool = Field(..., description="Whether expectation is met")
    assertion: str | None = Field(None, description="Assertion message if failed")


def smart_assert(result: BaseModel, expectation: str, llm: LLMBase) -> None:
    """Use ``llm`` to verify that ``result`` meets ``expectation``."""

    messages = [
        Message(
            role="system",
            content=(
                "You evaluate if the agent output meets the expectation. "
                "Respond using the provided schema."
            ),
        ),
        Message(
            role="user",
            content=f"Expectation: {expectation}\nOutput: {result.model_dump_json()}",
        ),
    ]
    check = llm.get_output(messages=messages, response_format=AssertionResult)
    if not check.success:
        raise AssertionError(check.assertion or "Expectation not met")


__all__ = ["SessionContext", "smart_assert", "AssertionResult"]
