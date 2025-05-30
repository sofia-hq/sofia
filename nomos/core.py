"""Core models and logic for the SOFIA package, including flow management, session handling."""

import pickle
import uuid
from typing import Any, Callable, Dict, List, Optional, Union

from pydantic import BaseModel

from .config import AgentConfig
from .constants import ACTION_ENUMS
from .llms import LLMBase
from .memory.base import Memory
from .models.flow import (
    Message,
    Step,
    StepIdentifier,
    Summary,
    create_decision_model,
)
from .models.tool import FallbackError, Tool
from .utils.logging import log_debug, log_error, log_info


class Session:
    """Manages a single agent session, including step transitions, tool calls, and history."""

    def __init__(
        self,
        name: str,
        llm: LLMBase,
        memory: Memory,
        steps: Dict[str, Step],
        start_step_id: str,
        system_message: Optional[str] = None,
        persona: Optional[str] = None,
        tools: Optional[List[Callable | str]] = None,
        show_steps_desc: bool = False,
        max_errors: int = 3,
        max_iter: int = 5,
        config: Optional[AgentConfig] = None,
        history: Optional[List[Union[Message, StepIdentifier, Summary]]] = None,
        current_step_id: Optional[str] = None,
        session_id: Optional[str] = None,
        verbose: bool = False,
    ) -> None:
        """
        Initialize a Session.

        :param name: Name of the agent.
        :param llm: LLMBase instance.
        :param steps: Dictionary of step_id to Step.
        :param start_step_id: ID of the starting step.
        :param system_message: Optional system message.
        :param persona: Optional persona string.
        :param tools:  List of tool callables or package identifiers (e.g., "math:add").
        :param show_steps_desc: Whether to show step descriptions.
        :param max_errors: Maximum consecutive errors before stopping or fallback. (Defaults to 3)
        :param max_iter: Maximum number of decision loops for single action. (Defaults to 5)
        :param config: Optional AgentConfig.
        :param history: List of messages and steps in the session. (Optional)
        :param current_step_id: Current step ID. (Defaults to start_step_id)
        :param session_id: Unique session ID. (Defaults to a UUID)
        """
        # Fixed
        self.session_id = session_id or f"{name}_{str(uuid.uuid4())}"
        self.name = name
        self.llm = llm
        self.steps = steps
        self.show_steps_desc = show_steps_desc
        self.system_message = system_message
        self.persona = persona
        self.max_errors = max_errors
        self.max_iter = max_iter
        self.verbose = verbose
        self.config = config
        tool_arg_descs = (
            self.config.tool_arg_descriptions
            if self.config and self.config.tool_arg_descriptions
            else {}
        )
        tools_list = [
            (
                Tool.from_function(tool, tool_arg_descs)
                if callable(tool)
                else Tool.from_pkg(tool, tool_arg_descs)
            )
            for tool in tools or []
        ]
        self.tools = {tool.name: tool for tool in tools_list}
        # Variable
        self.memory = memory
        self.memory.context = history or []
        self.current_step: Step = (
            steps[current_step_id] if current_step_id else steps[start_step_id]
        )
        # For OpenTelemetry tracing context
        self._otel_root_span_ctx: Any = None

    def save_session(self) -> None:
        """Save the current session to disk as a pickle file."""
        with open(f"{self.session_id}.pkl", "wb") as f:
            pickle.dump(self, f)
        log_debug(f"Session {self.session_id} saved to disk.")

    @classmethod
    def load_session(cls, session_id: str) -> "Session":
        """
        Load a Session from disk by session_id.

        :param session_id: The session ID string.
        :return: Loaded Session instance.
        """
        with open(f"{session_id}.pkl", "rb") as f:
            log_debug(f"Session {session_id} loaded from disk.")
            return pickle.load(f)

    def to_dict(self) -> dict:
        """
        Convert the session to a dictionary representation.

        :return: Dictionary representation of the session.
        """
        return {
            "session_id": self.session_id,
            "current_step_id": self.current_step.step_id,
            "history": [msg.model_dump(mode="json") for msg in self.memory.context],
        }

    def _run_tool(self, tool_name: str, kwargs: Dict[str, Any]) -> Any:  # noqa: ANN401
        """
        Run a tool with the given name and arguments.

        :param tool_name: Name of the tool to run.
        :param kwargs: Arguments to pass to the tool.
        :return: Result of the tool execution.
        """
        tool = self.tools.get(tool_name)
        if not tool:
            log_error(f"Tool '{tool_name}' not found in session tools.")
            raise ValueError(
                f"Tool '{tool_name}' not found in session tools. Please check the tool name."
            )
        log_debug(f"Running tool: {tool_name} with args: {kwargs}")
        return tool.run(**kwargs)

    def _get_current_step_tools(self) -> List[Tool]:
        """
        Get the list of tools available in the current step.

        :return: List of Tool instances available in the current step.
        """
        tools = []
        for tool in self.current_step.tool_ids:
            _tool = self.tools.get(tool)
            if not _tool:
                log_error(f"Tool '{tool}' not found in session tools. Skipping.")
                continue
            tools.append(_tool)
        return tools

    def _add_message(self, role: str, message: str) -> None:
        """
        Add a message to the session history.

        :param role: Role of the message sender (e.g., 'user', 'assistant', 'tool').
        :param message: The message content.
        """
        self.memory.add(Message(role=role, content=message))
        log_debug(f"{role.title()} added: {message}")

    def _get_next_decision(self) -> BaseModel:
        """
        Get the next decision from the LLM based on the current step and history.

        :return: The decision made by the LLM.
        """
        route_decision_model = create_decision_model(
            current_step=self.current_step,
            current_step_tools=self._get_current_step_tools(),
        )
        decision = self.llm._get_output(
            steps=self.steps,
            current_step=self.current_step,
            tools=self.tools,
            history=self.memory.get_history(),
            response_format=route_decision_model,
            system_message=self.system_message,
            persona=self.persona,
        )
        log_debug(f"Model decision: {decision}")
        return decision

    def next(
        self,
        user_input: Optional[str] = None,
        no_errors: int = 0,
        next_count: int = 0,
        return_tool: bool = False,
        return_step_transition: bool = False,
    ) -> tuple[BaseModel, Any]:
        """
        Advance the session to the next step based on user input and LLM decision.

        :param user_input: Optional user input string.
        :param no_errors: Number of consecutive errors encountered.
        :param next_count: Number of times the next function has been called.
        :param return_tool: Whether to return tool results.
        :param return_step_transition: Whether to return step transition.
        :return: A tuple containing the decision and any tool results.
        """
        if no_errors >= self.max_errors:
            raise ValueError(
                f"Maximum errors reached ({self.max_errors}). Stopping session."
            )
        if next_count >= self.max_iter:
            if not self.current_step.auto_flow:
                self._add_message(
                    "fallback",
                    (
                        "Maximum iterations reached. Inform the user and based on the "
                        "available context, produce a fallback response."
                    ),
                )
                return self.next()
            else:
                raise RecursionError(
                    f"Maximum iterations reached ({self.max_iter}). Stopping session."
                )

        log_debug(f"User input received: {user_input}")
        self._add_message("user", user_input) if user_input else None
        log_debug(f"Current step: {self.current_step.step_id}")

        decision = self._get_next_decision()
        log_info(str(decision)) if self.verbose else log_debug(str(decision))
        log_debug(f"Action decided: {decision.action}")

        self.memory.add(self.current_step.get_step_identifier())
        action = decision.action.value
        response: Union[str, BaseModel] = decision.response
        if action in [ACTION_ENUMS["ASK"], ACTION_ENUMS["ANSWER"]]:
            self._add_message(self.name, str(response))
            return decision, None
        elif action == ACTION_ENUMS["TOOL_CALL"]:
            _error: Optional[Exception] = None
            try:
                assert (
                    response.__class__.__name__ == "ToolCall"
                ), "Expected ToolCall response"
                tool_name: str = response.tool_name  # type: ignore
                tool_kwargs_model: BaseModel = response.tool_kwargs  # type: ignore
                tool_kwargs: dict = tool_kwargs_model.model_dump()
                log_debug(f"Running tool: {tool_name} with args: {tool_kwargs}")
                try:
                    tool_results = self._run_tool(tool_name, tool_kwargs)
                    self._add_message(
                        "tool",
                        f"Tool {tool_name} executed successfully with args {tool_kwargs}.\nResults: {tool_results}",
                    )
                except Exception as e:
                    self._add_message(
                        "tool", f"Running tool {tool_name} with args {tool_kwargs}"
                    )
                    raise e
                log_info(f"Tool Results: {tool_results}") if self.verbose else None
            except FallbackError as e:
                _error = e
                self._add_message("fallback", str(e))
            except Exception as e:
                _error = e
                self._add_message("error", str(e))

            if return_tool and _error is None:
                return decision, tool_results
            return self.next(
                no_errors=no_errors + 1 if _error else 0,
                next_count=next_count + 1,
            )
        elif action == ACTION_ENUMS["MOVE"]:
            _error = None
            if response in self.current_step.get_available_routes():
                self.current_step = self.steps[response]
                log_debug(f"Moving to next step: {self.current_step.step_id}")
                self.memory.add(self.current_step.get_step_identifier())
            else:
                self._add_message(
                    "error",
                    f"Invalid route: {response} not in {self.current_step.get_available_routes()}",
                )
                _error = ValueError(
                    f"Invalid route: {response} not in {self.current_step.get_available_routes()}"
                )
            if return_step_transition:
                return decision, None
            return self.next(
                no_errors=no_errors + 1 if _error else 0,
                next_count=next_count + 1,
            )
        elif action == ACTION_ENUMS["END"]:
            self._add_message("end", "Session ended.")
            return decision, None
        else:
            self._add_message(
                "error",
                f"Unknown action: {action}. Please check the action type.",
            )
            return self.next(
                no_errors=no_errors + 1,
                next_count=next_count + 1,
            )


class Agent:
    """Main interface for creating and managing Nomos Agents."""

    def __init__(
        self,
        llm: LLMBase,
        name: str,
        steps: List[Step],
        start_step_id: str,
        persona: Optional[str] = None,
        system_message: Optional[str] = None,
        tools: Optional[List[Callable | str]] = None,
        show_steps_desc: bool = False,
        max_errors: int = 3,
        max_iter: int = 5,
        config: Optional[AgentConfig] = None,
    ) -> None:
        """
        Initialize an Agent.

        :param llm: LLMBase instance.
        :param name: Name of the agent.
        :param steps: List of Step objects.
        :param start_step_id: ID of the starting step.
        :param persona: Optional persona string.
        :param system_message: Optional system message.
        :param tools: List of tool callables.
        :param show_steps_desc: Whether to show step descriptions.
        :param max_errors: Maximum consecutive errors before stopping or fallback. (Defaults to 3)
        :param max_iter: Maximum number of decision loops for single action. (Defaults to 5)
        :param config: Optional AgentConfig.
        """
        self.llm = llm
        self.name = name
        self.steps = {s.step_id: s for s in steps}
        self.start = start_step_id
        self.system_message = system_message
        self.persona = persona
        self.show_steps_desc = show_steps_desc
        self.max_errors = max_errors
        self.max_iter = max_iter
        tool_set = set(tools) if tools else set()
        for step in self.steps.values():
            _pkg_tools = [tool for tool in step.available_tools if ":" in tool]
            tool_set.update(_pkg_tools)
        self.tools = list(tool_set)
        self.config = config

        # Validate start step ID
        if start_step_id not in self.steps:
            log_error(f"Start step ID {start_step_id} not found in steps")
            raise ValueError(f"Start step ID {start_step_id} not found in steps")
        # Validate step IDs in routes
        for step in self.steps.values():
            for route in step.routes:
                if route.target not in self.steps:
                    log_error(
                        f"Route target {route.target} not found in steps for step {step.step_id}"
                    )
                    raise ValueError(
                        f"Route target {route.target} not found in steps for step {step.step_id}"
                    )
        # Validate tool names
        for step in self.steps.values():
            for step_tool in step.available_tools:
                for tool in self.tools:
                    if (callable(tool) and tool.__name__ == step_tool) or (
                        isinstance(tool, str) and tool == step_tool
                    ):
                        break
                else:
                    log_error(
                        f"Tool {step_tool} not found in tools for step {step.step_id}"
                    )
                    raise ValueError(
                        f"Tool {step_tool} not found in tools for step {step.step_id}"
                    )
        log_debug(f"FlowManager initialized with start step '{start_step_id}'")

    @classmethod
    def from_config(
        cls,
        config: AgentConfig,
        llm: Optional[LLMBase] = None,
        tools: Optional[List[Callable | str]] = None,
    ) -> "Agent":
        """
        Create an Agent from an AgentConfig object.

        :param llm: LLMBase instance.
        :param config: AgentConfig instance.
        :param tools: List of tool callables.
        :return: Sofia instance.
        """
        if not llm:
            if not config.llm:
                raise ValueError(
                    "No LLM provided. Please provide an LLM or a config with an LLM."
                )
            llm = config.llm.get_llm()
        return cls(
            llm=llm,
            name=config.name,
            steps=config.steps,
            start_step_id=config.start_step_id,
            system_message=config.system_message,
            persona=config.persona,
            tools=tools or [],
            show_steps_desc=config.show_steps_desc,
            max_errors=config.max_errors,
            max_iter=config.max_iter,
            config=config,
        )

    def create_session(
        self, memory: Optional[Memory] = None, verbose: bool = False
    ) -> Session:
        """
        Create a new Session for this agent.

        :param memory: Optional Memory instance.
        :param verbose: Whether to return verbose output.
        :return: Session instance.
        """
        log_debug("Creating new session")
        if not memory:
            memory = (
                self.config.memory.get_memory()
                if self.config and self.config.memory
                else Memory()
            )
        return Session(
            name=self.name,
            llm=self.llm,
            memory=memory,
            steps=self.steps,
            start_step_id=self.start,
            system_message=self.system_message,
            persona=self.persona,
            tools=self.tools,
            show_steps_desc=self.show_steps_desc,
            max_errors=self.max_errors,
            max_iter=self.max_iter,
            verbose=verbose,
            config=self.config,
        )

    def load_session(self, session_id: str) -> Session:
        """
        Load a Session by session_id.

        :param session_id: The session ID string.
        :return: Loaded Session instance.
        """
        log_debug(f"Loading session {session_id}")
        return Session.load_session(session_id)

    def get_session_from_dict(self, session_data: dict) -> Session:
        """
        Create a Session from a dictionary.

        :param session_data: Dictionary containing session data.
        :return: Session instance.
        """
        log_debug(f"Creating session from dict: {session_data}")

        # Convert the History items into list of Message or Step
        new_session_data = session_data.copy()
        new_session_data["history"] = []
        for history_item in session_data.get("history", []):
            if isinstance(history_item, dict):
                if "role" in history_item:
                    new_session_data["history"].append(Message(**history_item))
                elif "step_id" in history_item:
                    new_session_data["history"].append(StepIdentifier(**history_item))
                elif "content" in history_item:
                    new_session_data["history"].append(Summary(**history_item))
            else:
                raise ValueError(
                    f"Invalid history item: {history_item}. Must be a dict."
                )

        memory = (
            self.config.memory.get_memory()
            if self.config and self.config.memory
            else Memory()
        )
        return Session(
            name=self.name,
            llm=self.llm,
            memory=memory,
            tools=self.tools,
            config=self.config,
            persona=self.persona,
            steps=self.steps,
            start_step_id=self.start,
            system_message=self.system_message,
            show_steps_desc=self.show_steps_desc,
            max_errors=self.max_errors,
            max_iter=self.max_iter,
            **new_session_data,
        )

    def next(
        self,
        user_input: Optional[str] = None,
        session_data: Optional[dict] = None,
        verbose: bool = False,
    ) -> tuple[BaseModel, str, dict]:
        """
        Advance the session to the next step based on user input and LLM decision.

        :param user_input: Optional user input string.
        :param session_data: Optional session data dictionary.
        :param verbose: Whether to return verbose output.
        :return: A tuple containing the decision and session data.
        """
        session = (
            self.get_session_from_dict(session_data)
            if session_data
            else self.create_session()
        )
        decision, tool_output = session.next(
            user_input=user_input, return_tool=verbose, return_step_transition=verbose
        )
        return decision, tool_output, session.to_dict()


__all__ = ["Session", "Agent"]
