"""Core models and logic for the Nomos package, including flow management and session handling."""

import contextlib
import os
import pickle
import uuid
from typing import Any, Callable, Dict, List, Optional, Union

from .config import AgentConfig
from .llms import LLMBase
from .memory.base import Memory
from .memory.flow import FlowMemoryComponent
from .models.agent import (
    Action,
    Decision,
    Message,
    SessionContext,
    Step,
    StepIdentifier,
    Summary,
    history_to_types,
)
from .models.flow import Flow, FlowContext
from .models.tool import FallbackError, Tool, ToolWrapper, get_tools
from .state_machine import StateMachine
from .utils.flow_utils import create_flows_from_config
from .utils.logging import log_debug, log_error, log_info


class Session:
    """Manages a single agent session, including step transitions, tool calls, and history."""

    def __init__(
        self,
        name: str,
        llm: LLMBase,
        embedding_model: LLMBase,
        memory: Memory,
        steps: Dict[str, Step],
        start_step_id: str,
        system_message: Optional[str] = None,
        persona: Optional[str] = None,
        tools: Optional[List[Union[Callable, ToolWrapper]]] = None,
        flows: Optional[List[Flow]] = None,
        show_steps_desc: bool = False,
        max_errors: int = 3,
        max_iter: int = 5,
        config: Optional[AgentConfig] = None,
        state: Optional[SessionContext] = None,
        session_id: Optional[str] = None,
        verbose: bool = False,
        **kwargs,
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
        :param state: Optional session state data.
        :param session_id: Unique session ID. (Defaults to a UUID)
        """
        # Fixed
        self.session_id = session_id or (state.session_id if state else None) or f"{name}_{str(uuid.uuid4())}"
        self.name = name
        self.llm = llm
        self.steps = steps
        self.show_steps_desc = show_steps_desc
        self.system_message = system_message
        self.persona = persona
        self.max_errors = max_errors
        self.max_iter = max_iter
        self.verbose = verbose
        self.config = config or AgentConfig(
            name=name,
            steps=list(steps.values()),
            start_step_id=start_step_id,
            system_message=system_message,
            persona=persona,
            show_steps_desc=show_steps_desc,
            max_errors=max_errors,
            max_iter=max_iter,
        )
        self.embedding_model = embedding_model


        tool_defs = (
            self.config.tools.tool_defs
            if self.config and self.config.tools.tool_defs
            else None
        )
        self.tools = get_tools(tools, tool_defs)
        # Compile state machine for fast transitions and flow lookups
        self.state_machine = StateMachine(
            self.steps,
            flows=flows,
            config=self.config,
            memory=memory,
            start_step_id=(state.current_step_id if state and state.current_step_id else start_step_id),
        )

        # Load memory and flow state
        if state and state.history:
            self.state_machine.memory.context = state.history
        if state and state.flow_state:
            self.state_machine.load_state(state.flow_state)

        self.session_id = session_id or (state.session_id if state else None) or f"{name}_{str(uuid.uuid4())}"
        # For OpenTelemetry tracing context
        self._otel_root_span_ctx: Any = None

    # ------------------------------------------------------------------
    # Convenience properties
    # ------------------------------------------------------------------
    @property
    def current_step(self) -> Step:
        return self.state_machine.current_step

    @property
    def memory(self) -> Memory:
        return self.state_machine.memory

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

    def to_dict(self) -> dict[str, Any]:
        """
        Convert the session to a dictionary representation.

        :return: Dictionary representation of the session.
        """
        session_dict = {
            "session_id": self.session_id,
            "current_step_id": self.current_step.step_id,
            "history": [msg.model_dump(mode="json") for msg in self.memory.context],
        }

        # Include flow state if active
        flow_state = self.state_machine.state_dict()
        if flow_state:
            session_dict["flow_state"] = flow_state  # type: ignore

        return session_dict

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
        message_obj = Message(role=role, content=message)

        # If we're in a flow, only update flow memory
        if self.state_machine.current_flow and self.state_machine.flow_context:
            flow_memory = self.state_machine.current_flow.get_memory()
            if flow_memory and isinstance(flow_memory, FlowMemoryComponent):
                flow_memory.add_to_context(message_obj)
            # Don't update session memory while in flow
        else:
            # Only update session memory when not in a flow
            self.memory.add(message_obj)

        log_debug(f"{role.title()} added: {message}")


    def _get_next_decision(self) -> Decision:
        """
        Get the next decision from the LLM based on the current step and history.

        :return: The decision made by the LLM.
        """
        _decision_model = self.llm._create_decision_model(
            current_step=self.current_step,
            current_step_tools=self._get_current_step_tools(),
        )

        # Get memory context - use flow memory if available, otherwise use session memory
        memory_context = self.memory.get_history()
        flow_memory_context = None

        if self.state_machine.current_flow and self.state_machine.flow_context:
            flow_memory = self.state_machine.current_flow.get_memory()
            if flow_memory and isinstance(flow_memory, FlowMemoryComponent):
                flow_memory_context = flow_memory.memory.context
        _decision = self.llm._get_output(
            steps=self.steps,
            current_step=self.current_step,
            tools=self.tools,
            history=flow_memory_context if flow_memory_context else memory_context,
            response_format=_decision_model,
            system_message=self.system_message,
            persona=self.persona,
            max_examples=self.config.max_examples,
            embedding_model=self.embedding_model,
        )

        # Convert to a Decision model
        decision = self.llm._create_decision_from_output(output=_decision)
        log_debug(f"Model decision: {decision}")
        return decision

    def next(
        self,
        user_input: Optional[str] = None,
        no_errors: int = 0,
        next_count: int = 0,
        return_tool: bool = False,
        return_step_transition: bool = False,
    ) -> tuple[Decision, Any]:
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

        # Check for flow transitions
        self.state_machine.handle_flow_transitions(
            self.current_step.step_id, self.session_id
        )

        decision = self._get_next_decision()
        log_info(str(decision)) if self.verbose else log_debug(str(decision))
        log_debug(f"Action decided: {decision.action}")

        self._add_step_identifier(self.current_step.get_step_identifier())
        if decision.action in [Action.ASK, Action.ANSWER]:
            self._add_message(self.name, str(decision.response))
            return decision, None
        elif decision.action == Action.TOOL_CALL:
            _error: Optional[Exception] = None
            try:
                assert decision.tool_call is not None, "Expected ToolCall response"
                tool_name = decision.tool_call.tool_name  # type: ignore
                tool_kwargs: dict = decision.tool_call.tool_kwargs.model_dump()
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
        elif decision.action == Action.MOVE:
            _error = None
            if self.state_machine.can_transition(
                self.state_machine.current_step_id, decision.step_transition
            ):
                # Check if we need to exit current flow before moving
                if self.state_machine.current_flow and self.state_machine.flow_context:
                    _, exits = self.state_machine.get_flow_transitions(
                        self.state_machine.current_step_id
                    )
                    if self.state_machine.current_flow.flow_id in exits:
                        self.state_machine._exit_flow(self.state_machine.current_step_id)

                self.state_machine.move(decision.step_transition)
                log_debug(f"Moving to next step: {self.state_machine.current_step_id}")
                self._add_step_identifier(self.current_step.get_step_identifier())

                # Check if we need to enter a new flow after moving
                self.state_machine.handle_flow_transitions(
                    self.state_machine.current_step_id, self.session_id
                )

            else:
                allowed = self.state_machine.transitions.get(
                    self.state_machine.current_step_id, []
                )
                self._add_message(
                    "error",
                    f"Invalid route: {decision.step_transition} not in {allowed}",
                )
                _error = ValueError(
                    f"Invalid route: {decision.step_transition} not in {allowed}"
                )
            if return_step_transition:
                return decision, None
            return self.next(
                no_errors=no_errors + 1 if _error else 0,
                next_count=next_count + 1,
            )
        elif decision.action == Action.END:
            # Clean up any active flows before ending
            if self.state_machine.current_flow and self.state_machine.flow_context:
                try:
                    self.state_machine.current_flow.cleanup(self.state_machine.flow_context)
                    log_debug(
                        f"Cleaned up flow '{self.state_machine.current_flow.flow_id}' on session end"
                    )
                except Exception as e:
                    log_error(f"Error cleaning up flow on session end: {e}")
                finally:
                    self.state_machine.current_flow = None
                    self.state_machine.flow_context = None

            self._add_message("end", "Session ended.")
            return decision, None
        else:
            self._add_message(
                "error",
                f"Unknown action: {decision.action}. Please check the action type.",
            )
            return self.next(
                no_errors=no_errors + 1,
                next_count=next_count + 1,
            )

    def _add_step_identifier(self, step_identifier: StepIdentifier) -> None:
        """
        Add a step identifier to the appropriate memory.

        :param step_identifier: The step identifier to add.
        """
        # If we're in a flow, only update flow memory
        if self.state_machine.current_flow and self.state_machine.flow_context:
            flow_memory = self.state_machine.current_flow.get_memory()
            if flow_memory and isinstance(flow_memory, FlowMemoryComponent):
                flow_memory.add_to_context(step_identifier)
            # Don't update session memory while in flow
        else:
            # Only update session memory when not in a flow
            self.memory.add(step_identifier)

        log_debug(f"Step identifier added: {step_identifier.step_id}")


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
        tools: Optional[List[Union[Callable, ToolWrapper]]] = None,
        flows: Optional[List[Flow]] = None,
        show_steps_desc: bool = False,
        max_errors: int = 3,
        max_iter: int = 5,
        config: Optional[AgentConfig] = None,
        embedding_model: Optional[LLMBase] = None,
    ) -> None:
        """
        Initialize an Agent.

        :param llm: LLMBase instance.
        :param name: Name of the agent.
        :param steps: List of Step objects.
        :param start_step_id: ID of the starting step.
        :param persona: Optional persona string.
        :param system_message: Optional system message.
        :param tools: List of tool callables or ToolWrapper instances.
        :param flows: Optional list of Flow objects.
        :param show_steps_desc: Whether to show step descriptions.
        :param max_errors: Maximum consecutive errors before stopping or fallback. (Defaults to 3)
        :param max_iter: Maximum number of decision loops for single action. (Defaults to 5)
        :param config: Optional AgentConfig.
        :param embedding_model: Optional LLMBase instance for embeddings.
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
        self.config = config
        self.embedding_model = (
            embedding_model
            or (config.get_embedding_model() if config else None)
            or self.llm
        )
        self._setup_logging()
        self.flows = flows or (
            list(create_flows_from_config(config).flows.values()) if config and config.flows else None
        )

        # Remove duplicates of tools based on their names or IDs
        seen = set()
        self.tools = []
        for tool in tools or []:
            tool_id = (
                tool.name
                if isinstance(tool, ToolWrapper)
                else getattr(tool, "__name__", None)
            )
            tool_id = tool_id or id(tool)  # Fallback to id if no name
            if tool_id not in seen:
                seen.add(tool_id)
                self.tools.append(tool)


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
                    if (isinstance(tool, ToolWrapper) and tool.name == step_tool) or (
                        callable(tool) and getattr(tool, "__name__", None) == step_tool
                    ):
                        break
                else:
                    log_error(
                        f"Tool {step_tool} not found in tools for step {step.step_id}"
                    )
                    raise ValueError(
                        f"Tool {step_tool} not found in tools for step {step.step_id}\nAvailable tools: {self.tools}"
                    )

        # Go through all the steps and if there are examples in them, perform batch embedding
        for step in self.steps.values():
            if step.examples:
                log_debug(
                    f"Step {step.step_id} has examples, performing batch embedding"
                )
                step.batch_embed_examples(embedding_model=self.embedding_model)

    @classmethod
    def from_config(
        cls,
        config: AgentConfig,
        llm: Optional[LLMBase] = None,
        tools: Optional[List[Union[Callable, ToolWrapper]]] = None,
    ) -> "Agent":
        """
        Create an Agent from an AgentConfig object.

        :param llm: LLMBase instance.
        :param config: AgentConfig instance.
        :param tools: List of tool callables.
        :return: Nomos instance.
        """
        if not llm:
            if not config.llm:
                raise ValueError(
                    "No LLM provided. Please provide an LLM or a config with an LLM."
                )
            llm = config.llm.get_llm()
        tools = tools or []
        tools.extend(config.tools.get_tools())
        return cls(
            llm=llm,
            name=config.name,
            steps=config.steps,
            start_step_id=config.start_step_id,
            system_message=config.system_message,
            persona=config.persona,
            tools=tools,
            show_steps_desc=config.show_steps_desc,
            max_errors=config.max_errors,
            max_iter=config.max_iter,
            config=config,
        )

    def _setup_logging(self) -> None:
        """Set up logging configuration."""
        # temporary fix until config is made available to other parts.
        if self.config and self.config.logging:
            logging_config = self.config.logging
            os.environ.setdefault(
                "NOMOS_ENABLE_LOGGING", str(logging_config.enable).lower()
            )
            if logging_config.handlers:
                os.environ.setdefault(
                    "NOMOS_LOG_LEVEL", logging_config.handlers[0].level.upper()
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
            flows=list(self.flows) if self.flows else None,
            show_steps_desc=self.show_steps_desc,
            max_errors=self.max_errors,
            max_iter=self.max_iter,
            verbose=verbose,
            config=self.config,
            embedding_model=self.embedding_model,
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

        # Support both legacy and new state keys
        state_data = session_data.get("state", {})
        if not state_data:
            state_data = {
                "current_step_id": session_data.get("current_step_id"),
                "history": session_data.get("history", []),
                "flow_state": session_data.get("flow_state"),
            }

        state = SessionContext(
            session_id=session_data.get("session_id", str(uuid.uuid4())),
            current_step_id=state_data.get("current_step_id"),
            history=history_to_types(state_data.get("history", [])),
            flow_state=state_data.get("flow_state"),
        )

        memory = (
            self.config.memory.get_memory()
            if self.config and self.config.memory
            else Memory()
        )

        session = Session(
            name=self.name,
            llm=self.llm,
            memory=memory,
            tools=self.tools,
            config=self.config,
            embedding_model=self.embedding_model,
            persona=self.persona,
            steps=self.steps,
            start_step_id=self.start,
            system_message=self.system_message,
            flows=list(self.flows) if self.flows else None,
            show_steps_desc=self.show_steps_desc,
            max_errors=self.max_errors,
            max_iter=self.max_iter,
            state=state,
        )

        return session

    def next(
        self,
        user_input: Optional[str] = None,
        session_data: Optional[Union[dict, SessionContext]] = None,
        verbose: bool = False,
    ) -> tuple[Decision, str, dict]:
        """
        Advance the session to the next step based on user input and LLM decision.

        :param user_input: Optional user input string.
        :param session_data: Optional session data dictionary.
        :param verbose: Whether to return verbose output.
        :return: A tuple containing the decision and session data.
        """
        if isinstance(session_data, SessionContext):
            session_data = session_data.model_dump(mode="json")
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
