"""Flow models for Nomos's decision-making process."""

from enum import Enum
from typing import (
    Any,
    Callable,
    Dict,
    List,
    Literal,
    Optional,
    TYPE_CHECKING,
    Union,
)
from uuid import uuid4

from pydantic import BaseModel, Field

from ..utils.utils import create_base_model, create_enum

if TYPE_CHECKING:
    from ..llms.base import LLMBase


class Action(Enum):
    """
    Enum representing the possible actions in the agent's flow.

    Attributes:
        MOVE: Transition to another step.
        ANSWER: Provide an answer to the user.
        ASK: Ask the user for input.
        TOOL_CALL: Call a tool with arguments.
        END: End the flow.
    """

    MOVE = "MOVE"
    ANSWER = "ANSWER"
    ASK = "ASK"
    TOOL_CALL = "TOOL_CALL"
    END = "END"


class Route(BaseModel):
    """
    Represents a route (transition) from one step to another in the flow.

    Attributes:
        target (str): The target step ID.
        condition (str): The condition for taking this route.
    """

    target: str = Field(
        ...,
        description="Target step ID to move to when this route is taken.",
    )
    condition: str = Field(
        ...,
        description="Condition that must be met to take this route.",
    )

    def __str__(self) -> str:
        """Return a string representation of the route."""
        return f"- if '{self.condition}' then -> {self.target}"


class StepIdentifier(BaseModel):
    """
    Represents a step identifier in the flow.

    Attributes:
        step_id (str): Unique identifier for the step.
    """

    step_id: str


class DecisionExample(BaseModel):
    """Represents an example decision made by the agent."""

    context: str
    decision: Union["Decision", str]
    visibility: Literal["always", "never", "dynamic"] = "dynamic"
    _ctx_embedding: Optional[List[float]] = None

    def __str__(self) -> str:
        """Return a string representation of the decision example."""
        return f"{self.context} -> {self.decision}"

    def embedding(self, EmbeddingModel: "LLMBase") -> List[float]:
        """Get the context embedding if available."""
        if self._ctx_embedding is not None:
            return self._ctx_embedding
        self._ctx_embedding = EmbeddingModel.embed_text(self.context)
        return self._ctx_embedding


class Step(BaseModel):
    """
    Represents a step in the agent's flow.

    Attributes:
        step_id (str): Unique identifier for the step.
        description (str): Description of the step.
        routes (List[Route]): List of possible routes from this step.
        available_tools (List[str]): List of tool names available in this step.
        tools (List[Tool]): List of Tool objects available in this step.
        answer_model (Optional[Dict[str, Dict[str, Any]]]): Pydantic model for the agent's answer structure.
        auto_flow (bool): Flag indicating if the step should automatically flow without additonal inputs or answering.
        provide_suggestions (bool): Flag indicating if the step should provide suggestions to the user.
    Methods:
        get_available_routes() -> List[str]: Get the list of available route targets.
    """

    step_id: str
    description: str
    routes: List[Route] = []
    available_tools: List[str] = []
    answer_model: Optional[Union[Dict[str, Dict[str, Any]], BaseModel]] = None
    auto_flow: bool = False
    quick_suggestions: bool = False
    flow_id: Optional[str] = None  # Add this to associate steps with flows
    examples: Optional[List[DecisionExample]] = None

    def model_post_init(self, __context) -> None:
        """Validate that auto_flow steps have at least one tool or route."""
        if self.auto_flow and not (self.routes or self.available_tools):
            raise ValueError(
                f"Step '{self.step_id}': When auto_flow is True, at least one tool or route must be available"
            )
        if self.auto_flow and self.quick_suggestions:
            raise ValueError(
                f"Step '{self.step_id}': When auto_flow is True, quick_suggestions cannot be True"
            )

    def get_answer_model(self) -> BaseModel:
        """
        Get the Pydantic model for the agent's answer structure.

        :return: Pydantic model for the answer structure.
        """
        if isinstance(self.answer_model, dict):
            return create_base_model("AnswerModel", self.answer_model)
        elif isinstance(self.answer_model, BaseModel):
            return self.answer_model
        else:
            raise ValueError(
                f"Step '{self.step_id}': answer_model must be a dictionary or a Pydantic model"
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
        return self.available_tools

    def get_step_identifier(self) -> StepIdentifier:
        """
        Get the step identifier for this step.

        :return: StepIdentifier object.
        """
        return StepIdentifier(step_id=self.step_id)

    def __str__(self) -> str:
        """Return a string representation of the step."""
        return f"[Step] {self.step_id}: {self.description}"

    def get_examples(
        self,
        embedding_model: "LLMBase",
        similarity_fn: Callable,
        max_examples: int,
        context_emb: List[float],
        threshold: float = 0.5,
    ) -> List[DecisionExample]:
        """
        Get examples for this step based on the provided context.

        :param similarity_fn: Function to compute similarity between contexts.
        :param max_examples: Maximum number of examples to return.
        :param context_emb: Embedding of the context to compare against examples.
        :param threshold: Minimum similarity score to include an example.
        :return: List of tuples containing DecisionExample and its similarity score.
        """
        _always = [
            (example, 1.0)
            for example in self.examples or []
            if example.visibility == "always"
        ]
        dynamic_examples = [
            example
            for example in self.examples or []
            if example.visibility == "dynamic"
        ]
        _examples = [
            (example, similarity_fn(example.embedding(embedding_model), context_emb))
            for example in dynamic_examples
        ]
        _examples = sorted(_examples, key=lambda x: x[1], reverse=True)[
            : max_examples - len(_always)
        ]
        examples = _always + _examples
        return [example for example, similarity in examples if similarity >= threshold]

    def batch_embed_examples(self, embedding_model: "LLMBase") -> None:
        """
        Batch embed examples for this step.

        :param embedding_model: The LLMBase instance to use for embedding.
        :param max_examples: Maximum number of examples to embed.
        """
        if not self.examples:
            return
        ctxs = [example.context for example in self.examples]
        embeddings = embedding_model.embed_batch(ctxs)
        for example, emb in zip(self.examples, embeddings):
            example._ctx_embedding = emb


class Message(BaseModel):
    """
    Represents a message in the conversation history.

    Attributes:
        role (str): The role of the message sender (e.g., 'user', 'assistant', 'tool').
        content (str): The message content.
    """

    role: Union[Literal["user", "tool", "error", "fallback"], str]
    content: str

    def __str__(self) -> str:
        """Return a string representation of the message."""
        return f"[{self.role.title()}] {self.content}"


class Summary(BaseModel):
    """Summary of a list of messages."""

    summary: List[str] = Field(
        ..., description="Detailed summary of the Context. (Min 5 items)"
    )

    @property
    def content(self) -> str:
        """Get the summary content as a single string (markdown list)."""
        return "\n".join(f"- {item}" for item in self.summary if item.strip())

    def __str__(self) -> str:
        """Return a string representation of the summary."""
        return f"[Past Summary] {self.content}"


class State(BaseModel):
    """Container for session data required by ``Agent.next``."""

    session_id: str = Field(default_factory=lambda: str(uuid4()))
    current_step_id: Optional[str] = None
    history: List[Union[Summary, Message, StepIdentifier]] = Field(default_factory=list)
    flow_state: Optional[Dict[str, Any]] = None


class ToolCall(BaseModel):
    """
    Represents a tool call made by the agent.

    Attributes:
        tool_name (str): Name of the tool to call.
        tool_kwargs (BaseModel): Arguments to pass to the tool.
    """

    tool_name: str
    tool_kwargs: BaseModel


class Decision(BaseModel):
    """
    Represents the decision made by the agent at a step.

    Attributes:
        reasoning (List[str]): Step by step reasoning to decide.
        action (Action): The next action to take.
        response (Optional[Union[str, BaseModel]]): Response if ASK or ANSWER.
        suggestions (Optional[List[str]]): Quick user input suggestions if ASK.
        step_transition (Optional[str]): Step ID to transition to if MOVE.
        tool_call (Optional[Dict[str, Any]]): Tool call details if TOOL_CALL.
    """

    reasoning: List[str]
    action: Action
    response: Optional[Union[str, BaseModel]] = None
    suggestions: Optional[List[str]] = None
    step_transition: Optional[str] = None
    tool_call: Optional[ToolCall] = None

    def __str__(self) -> str:
        """Return a string representation of the decision."""
        if self.action in [Action.ANSWER, Action.ASK]:
            return f"action: {self.action.value}, response: {self.response}"
        elif self.action == Action.MOVE:
            return (
                f"action: {self.action.value}, step_transition: {self.step_transition}"
            )
        elif self.action == Action.TOOL_CALL and self.tool_call:
            return f"action: {self.action.value}, tool_call: {self.tool_call.tool_name} with args {self.tool_call.tool_kwargs.model_dump_json()}"
        elif self.action == Action.END:
            return f"action: {self.action.value}"
        else:
            raise ValueError(f"Unknown action: {self.action}")


def create_action_enum(actions: List[str]) -> Enum:
    """
    Dynamically create an Enum class for actions.

    :param name: Name of the enum.
    :param actions: Dictionary of action names to values.
    :return: A dynamically created Enum class.
    """
    actions_dict = {
        action: action.upper() for action in actions if isinstance(action, str)
    }
    return create_enum("Action", actions_dict)


def history_to_types(
    context: List[dict],
) -> List[Union[Message, Summary, StepIdentifier]]:
    """
    Convert a history dictionary to a list of Message, Summary, or StepIdentifier objects.

    :param context: Dictionary containing the history.
    :return: List of Message, Summary, or StepIdentifier objects.
    """
    history = []
    for item in context:
        if isinstance(item, dict):
            if "role" in item and "content" in item:
                history.append(Message(**item))
            elif "summary" in item:
                history.append(Summary(**item))
            elif "step_id" in item:
                history.append(StepIdentifier(**item))
        else:
            raise ValueError(f"Unknown history item type: {type(item)}")
    return history


__all__ = [
    "Action",
    "Route",
    "Step",
    "ToolCall",
    "Message",
    "Summary",
    "State",
    "Decision",
    "create_action_enum",
    "DecisionExample",
    "StepIdentifier",
    "history_to_types",
]
