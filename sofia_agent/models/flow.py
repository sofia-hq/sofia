"""
Flow models for Sofia's decision-making process.
"""

from enum import Enum
from typing import List, Literal, Optional, Type, Union

from pydantic import BaseModel

from ..utils.utils import create_base_model, create_enum
from ..constants import ACTION_ENUMS
from .tool import Tool

Action = Enum("Action", ACTION_ENUMS)


class Route(BaseModel):
    """
    Represents a route (transition) from one step to another in the flow.

    Attributes:
        target (str): The target step ID.
        condition (str): The condition for taking this route.
    """

    target: str
    condition: str


class StepIdentifier(BaseModel):
    """
    Represents a step identifier in the flow.

    Attributes:
        step_id (str): Unique identifier for the step.
    """

    step_id: str


class Step(BaseModel):
    """
    Represents a step in the agent's flow.

    Attributes:
        step_id (str): Unique identifier for the step.
        description (str): Description of the step.
        routes (List[Route]): List of possible routes from this step.
        available_tools (List[str]): List of tool names available in this step.
        tools (List[Tool]): List of Tool objects available in this step.
        auto_flow (bool): Flag indicating if the step should automatically flow without additonal inputs or answering.
        provide_suggestions (bool): Flag indicating if the step should provide suggestions to the user.
    Methods:
        get_available_routes() -> List[str]: Get the list of available route targets.
    """

    step_id: str
    description: str
    routes: List[Route] = []
    available_tools: List[str] = []
    auto_flow: bool = False
    provide_suggestions: bool = False

    def model_post_init(self, __context):
        """Validate that auto_flow steps have at least one tool or route."""
        if self.auto_flow and not (self.routes or self.available_tools):
            raise ValueError(
                f"Step '{self.step_id}': When auto_flow is True, at least one tool or route must be available"
            )
        if self.auto_flow and self.provide_suggestions:
            raise ValueError(
                f"Step '{self.step_id}': When auto_flow is True, provide_suggestions cannot be True"
            )

    def get_available_routes(self) -> List[str]:
        """
        Get the list of available route targets from this step.

        :return: List of target step IDs.
        """
        return [route.target for route in self.routes]

    @property
    def tool_ids(self) -> List[str]:
        """
        Get the list of available tool names from this step.

        :return: List of tool names.
        """
        return [
            Tool.from_pkg(tool).name if ":" in tool else tool
            for tool in self.available_tools
        ]

    def get_step_identifier(self) -> StepIdentifier:
        """
        Get the step identifier for this step.

        :return: StepIdentifier object.
        """
        return StepIdentifier(step_id=self.step_id)


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
    current_step: Step, current_step_tools: list[Tool]
) -> Type[BaseModel]:
    """
    Dynamically create a Pydantic model for route/tool decision output.

    :param available_step_ids: List of available step IDs for routing.
    :param tool_ids: List of available tool names.
    :param tool_models: List of Pydantic models for tool arguments.
    :return: A dynamically created Pydantic BaseModel for the decision.
    """
    available_step_ids = current_step.get_available_routes()
    tool_ids = [tool.name for tool in current_step_tools]
    tool_models = [tool.get_args_model() for tool in current_step_tools]
    action_ids = (
        (["ASK", "ANSWER", "END"] if not current_step.auto_flow else ["END"])
        + (["MOVE"] if available_step_ids else [])
        + (["TOOL_CALL"] if tool_ids else [])
    )

    ActionEnum = create_action_enum(action_ids)
    params = {
        "reasoning": {
            "type": List[str],
            "description": "Reasoning for the decision",
        },
        "action": {"type": ActionEnum, "description": "Action to take"},
    }

    if not current_step.auto_flow:
        params["input"] = {
            "type": Optional[str],
            "default": None,
            "description": "Input (either a question or answer) if action is ASK (ask) or ANSWER (provide_answer)",
        }
        if current_step.provide_suggestions:
            params["suggestions"] = {
                "type": List[str],
                "description": "Suggestions for the user if action is ASK (ask) or ANSWER (provide_answer) - Minimum 2 suggestions",
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
            "type": (
                Optional[tool_models[0]]
                if len(tool_models) == 1
                else Optional[Union[*tool_models]]
            ),
            "default": None,
            "description": "Tool arguments if action is TOOL_CALL (call_tool).",
        }

    return create_base_model(
        "RouteDecision",
        params,
    )


def create_action_enum(actions: list[str]) -> Action:
    """
    Dynamically create an Enum class for actions.

    :param name: Name of the enum.
    :param actions: Dictionary of action names to values.
    :return: A dynamically created Enum class.
    """
    actions = {
        action: ACTION_ENUMS[action] for action in actions if action in ACTION_ENUMS
    }
    return create_enum("Action", actions)


__all__ = [
    "Action",
    "Route",
    "Step",
    "Message",
    "create_route_decision_model",
]
