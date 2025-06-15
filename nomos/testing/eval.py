from __future__ import annotations

from enum import Enum
from typing import List, Any

from pydantic import BaseModel, Field

from nomos.core import Agent
from nomos.models.agent import Message

from . import SessionContext, smart_assert


class SimulationDecision(Enum):
    CONTINUE = "Continue the conversation"
    ASSERT = "Expectation are not met, assert with a reason"


class NextInput(BaseModel):
    reasoning: List[str] = Field(
        ..., description="Reason Step by step on deciding what to do next"
    )
    decision: SimulationDecision = Field(
        ..., description="What to do next, either continue the conversation or assert"
    )
    input: str | None = Field(
        None,
        description=(
            "The input that need to be given to the agent next,"
            " If decided to continue the conversation"
        ),
    )
    assertion: str | None = Field(
        None, description="The assertion that need to be made if the decision is to assert"
    )


class Scenario(BaseModel):
    scenario: str
    expectation: str


class ScenarioRunner:
    """Run a scenario against an agent and verify expectations."""

    @staticmethod
    def run(agent: Agent, scenario: Scenario, max_turns: int = 5) -> List[dict]:
        llm = agent.llm
        context = SessionContext()
        session_data: dict[str, Any] = context.model_dump(mode="json")
        history: List[dict] = []

        user_input = scenario.scenario
        turns = 0
        while True:
            decision, _, session_data = agent.next(user_input, session_data)
            history.append(session_data)
            smart_assert(decision, scenario.expectation, llm)

            action = getattr(decision, "action", None)
            if getattr(action, "value", action) == "END":
                break
            if turns >= max_turns:
                break

            next_input = llm.get_output(
                messages=[
                    Message(
                        role="system",
                        content=(
                            "You are simulating a user interacting with an agent. "
                            "Decide the next input or assert if the expectation is not met."
                        ),
                    ),
                    Message(
                        role="user",
                        content=(
                            f"Expectation: {scenario.expectation}\n"
                            f"Agent Output: {decision.model_dump_json()}"
                        ),
                    ),
                ],
                response_format=NextInput,
            )

            if next_input.decision == SimulationDecision.ASSERT:
                raise AssertionError(next_input.assertion or "Expectation not met")

            if next_input.input is None:
                break
            user_input = next_input.input
            turns += 1

        return history


__all__ = ["ScenarioRunner", "Scenario", "SimulationDecision", "NextInput"]
