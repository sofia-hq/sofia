"""
Flow models for Sofia's decision-making process.
"""

from enum import Enum
from typing import List, Literal, Optional, Type, Union

from pydantic import BaseModel

from ..utils.utils import create_base_model


class Action(Enum):
    """
    Enum representing possible actions the agent can take in a step.

    - MOVE: Move to the next step.
    - ANSWER: Provide an answer to the user.
    - ASK: Ask the user for additional information.
    - TOOL_CALL: Call a tool function.
    - END: End the flow (No further steps).
    """

    MOVE = "move_to_next_step"
    ANSWER = "provide_answer"
    ASK = "ask_additional_info"
    TOOL_CALL = "call_tool"
    END = "end_flow"


class Route(BaseModel):
    """
    Represents a route (transition) from one step to another in the flow.

    Attributes:
        target (str): The target step ID.
        condition (str): The condition for taking this route.
    """

    target: str
    condition: str


class Step(BaseModel):
    """
    Represents a step in the agent's flow.

    Attributes:
        step_id (str): Unique identifier for the step.
        description (str): Description of the step.
        routes (List[Route]): List of possible routes from this step.
        available_tools (List[str]): List of tool names available in this step.
    Methods:
        get_available_routes() -> List[str]: Get the list of available route targets.
    """

    step_id: str
    description: str
    routes: List[Route] = []
    available_tools: List[str] = []

    def get_available_routes(self) -> List[str]:
        """
        Get the list of available route targets from this step.

        :return: List of target step IDs.
        """
        return [route.target for route in self.routes]


class Message(BaseModel):
    """
    Represents a message in the conversation history.

    Attributes:
        role (str): The role of the message sender (e.g., 'user', 'assistant', 'tool').
        content (str): The message content.
    """

    role: Literal["user", "tool", "error", "fallback"] | str
    content: str


def create_route_decision_model(
    available_step_ids: list[str], tool_ids: list[str], tool_models: list[BaseModel]
) -> Type[BaseModel]:
    """
    Dynamically create a Pydantic model for route/tool decision output.

    :param available_step_ids: List of available step IDs for routing.
    :param tool_ids: List of available tool names.
    :param tool_models: List of Pydantic models for tool arguments.
    :return: A dynamically created Pydantic BaseModel for the decision.
    """
    params = {
        "reasoning": {
            "type": List[str],
            "description": "Reasoning for the decision",
        },
        "action": {"type": Action, "description": "Action to take"},
        "input": {
            "type": Optional[str],
            "default": None,
            "description": "Input (either a question or answer) if action is ASK (ask_) or ANSWER (provide_answer) - Make sure to use natural language.",
        },
    }

    if len(available_step_ids) > 0:
        params["next_step_id"] = {
            "type": Optional[Literal[*available_step_ids]],
            "default": None,
            "description": "Next step ID if action is MOVE (move to next step)",
        }

    if len(tool_ids) > 0 and len(tool_models) > 0:
        params["tool_name"] = {
            "type": Optional[Literal[*tool_ids]],
            "default": None,
            "description": "Tool name if action is TOOL_CALL (call_tool)",
        }
        params["tool_kwargs"] = {
            "type": Optional[tool_models[0]] if len(tool_models) == 1 else Optional[Union[*tool_models]],
            "default": None,
            "description": "Tool arguments if action is TOOL_CALL (call_tool).",
        }

    return create_base_model(
        "RouteDecision",
        params,
    )


__all__ = [
    "Action",
    "Route",
    "Step",
    "Message",
    "create_route_decision_model",
]
