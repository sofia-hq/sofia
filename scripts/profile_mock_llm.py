#!/usr/bin/env python
"""Profile Nomos with the built-in MockLLM."""

import argparse
import cProfile
import pstats
from typing import List

from nomos.config import AgentConfig, ToolsConfig
from nomos.core import Agent
from nomos.models.agent import Action, Step, Route
from nomos.models.tool import ToolDef, ArgDef
from nomos.llms.base import LLMBase


class MockLLM(LLMBase):
    """Simple LLM mock used for profiling."""

    def __init__(self) -> None:
        self.responses: List = []
        self.messages_received: List = []
        self._generate_response: str | None = None

    def set_response(self, response, append: bool = False) -> None:
        if append:
            self.responses.append(response)
        else:
            self.responses = [response]

    def set_generate_response(self, response: str) -> None:
        self._generate_response = response

    def generate(self, messages: List, **kwargs) -> str:
        self.messages_received = messages
        if self._generate_response is None:
            raise ValueError("No generate response available")
        return self._generate_response

    def get_output(self, messages: List, response_format, **kwargs):
        self.messages_received = messages
        if not self.responses:
            raise ValueError("No more mock response available")
        response = self.responses.pop(0)
        if not self.responses:
            self.responses.append(response)
        # Avoid expensive model_json_schema comparison during profiling
        assert type(response) is response_format
        return response

    def embed_text(self, text: str) -> List[float]:
        vector = [0.0] * 26
        for ch in text.lower():
            if "a" <= ch <= "z":
                vector[ord(ch) - 97] += 1.0
        return vector

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [self.embed_text(t) for t in texts]


def build_agent() -> Agent:
    """Construct a minimal agent for profiling."""

    def test_tool(arg0: str = "test") -> str:
        return f"Test tool response: {arg0}"

    steps = [
        Step(
            step_id="start",
            description="Start step",
            routes=[Route(target="end", condition="done")],
            available_tools=["test_tool"],
        ),
        Step(step_id="end", description="End step", routes=[], available_tools=[]),
    ]

    config = AgentConfig(
        name="profile_agent",
        persona="Profiling persona",
        steps=steps,
        start_step_id="start",
        tools=ToolsConfig(
            tool_defs={
                "test_tool": ToolDef(args=[ArgDef(key="arg0", desc="Test argument")])
            }
        ),
    )
    llm = MockLLM()
    agent = Agent.from_config(config=config, llm=llm, tools=[test_tool])
    return agent




def run_scenarios(agent: Agent, iterations: int = 10) -> None:
    """Execute several typical actions for profiling."""

    for _ in range(iterations):
        session = agent.create_session(verbose=False)
        tool = session.tools["test_tool"]

        # RESPOND action
        decision_model = agent.llm._create_decision_model(
            current_step=session.current_step,
            current_step_tools=(tool,),
        )
        resp = decision_model(
            reasoning=["hi"], action=Action.RESPOND.value, response="ok"
        )
        agent.llm.set_response(resp)
        session.next("hello")

        # TOOL_CALL action
        decision_model = agent.llm._create_decision_model(
            current_step=session.current_step,
            current_step_tools=(tool,),
        )
        resp = decision_model(
            reasoning=["tool"],
            action=Action.TOOL_CALL.value,
            tool_call={"tool_name": "test_tool", "tool_kwargs": {"arg0": "a"}},
        )
        agent.llm.set_response(resp)
        session.next("use", return_tool=True)

        # MOVE action
        decision_model = agent.llm._create_decision_model(
            current_step=session.current_step,
            current_step_tools=(tool,),
        )
        resp = decision_model(
            reasoning=["move"], action=Action.MOVE.value, step_id="end"
        )
        agent.llm.set_response(resp)
        session.next("go", return_step_id=True)


def profile(iterations: int, output: str) -> None:
    """Profile the agent interactions and print summary stats."""
    agent = build_agent()
    pr = cProfile.Profile()
    pr.enable()
    run_scenarios(agent, iterations)
    pr.disable()
    pr.dump_stats(output)
    stats = pstats.Stats(pr).sort_stats("cumtime")
    stats.print_stats(20)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Profile Nomos with MockLLM")
    parser.add_argument(
        "-n",
        "--iterations",
        type=int,
        default=10,
        help="Number of iterations per scenario",
    )
    parser.add_argument(
        "-o", "--output", default="profile.stats", help="Stats file to write"
    )
    args = parser.parse_args()
    profile(args.iterations, args.output)
