"""
Core models and logic for the SOFIA package, including flow management, session handling.
"""

import pickle
import uuid
from typing import Dict, List, Optional, Union, Callable, Any, Literal
from pydantic import BaseModel

from .utils.logging import log_debug, log_error
from .models.tool import Tool, InvalidArgumentsError, FallbackError
from .models.flow import Action, Step, Message, create_route_decision_model
from .llms import LLMBase
from .config import AgentConfig


class FlowSession:
    """
    Manages a single agent session, including step transitions, tool calls, and history.
    """
    def __init__(
        self,
        name: str,
        llm: LLMBase,
        steps: Dict[str, Step],
        start_step_id: str,
        system_message: Optional[str] = None,
        persona: Optional[str] = None,
        tools: List[Callable] = [],
        show_steps_desc: bool = False,
        max_errors: int = 3,
        method: Literal["auto", "manual"] = "auto",
        config: Optional[AgentConfig] = None,
    ):
        """
        Initialize a FlowSession.

        :param name: Name of the agent.
        :param llm: LLMBase instance.
        :param steps: Dictionary of step_id to Step.
        :param start_step_id: ID of the starting step.
        :param system_message: Optional system message.
        :param persona: Optional persona string.
        :param tools: List of tool callables.
        :param show_steps_desc: Whether to show step descriptions.
        :param max_errors: Maximum consecutive errors before stopping or fallback.
        :param method: Method of handling errors or steps or tool calls.
        :param config: Optional AgentConfig.
        """
        ## Fixed
        self.session_id = f"{name}_{str(uuid.uuid4())}"
        self.name = name
        self.llm = llm
        self.steps = steps
        self.show_steps_desc = show_steps_desc
        self.system_message = system_message
        self.persona = persona
        self.max_errors = max_errors
        self.method = method
        self.config = config
        tool_arg_descs = self.config.tool_arg_descriptions if self.config and self.config.tool_arg_descriptions else {}
        tools_list = [Tool.from_function(tool, tool_arg_descs) for tool in tools]
        self.tools = {tool.name: tool for tool in tools_list}
        ## Variable
        self.history: List[Union[Message, Step]] = []
        self.current_step = steps[start_step_id]
        
    def save_session(self):
        """
        Save the current session to disk as a pickle file.
        """
        with open(f"{self.session_id}.pkl", "wb") as f:
            pickle.dump(self, f)
        log_debug(f"Session {self.session_id} saved to disk.")

    @classmethod
    def load_session(cls, session_id: str) -> "FlowSession":
        """
        Load a FlowSession from disk by session_id.

        :param session_id: The session ID string.
        :return: Loaded FlowSession instance.
        """
        with open(f"{session_id}.pkl", "rb") as f:
            log_debug(f"Session {session_id} loaded from disk.")
            return pickle.load(f)
        
    def _run_tool(self, tool_name: str, kwargs: Dict[str, Any]) -> Any:
        tool = self.tools.get(tool_name)
        if not tool:
            log_error(f"Tool '{tool_name}' not found in session tools.")
            raise ValueError(
                f"Tool '{tool_name}' not found in session tools. Please check the tool name."
            )
        log_debug(f"Running tool: {tool_name} with args: {kwargs}")
        return tool.run(**kwargs)

    def _get_tool_models(self) -> list[BaseModel]:
        tool_models = []
        for tool in self.current_step.available_tools:
            _tool = self.tools.get(tool)
            if not _tool:
                log_error(f"Tool '{tool}' not found in session tools. Skipping.")
                continue
            tool_models.append(_tool.get_args_model())
        return tool_models

    def _add_message(self, role: str, message: str):
        self.history.append(Message(role=role, content=message))
        log_debug(f"{role.title()} added: {message}")

    def _get_next_decision(self) -> BaseModel:
        route_decision_model = create_route_decision_model(
            available_step_ids=self.current_step.get_available_routes(),
            tool_ids=self.current_step.available_tools,
            tool_models=self._get_tool_models()
        )
        decision = self.llm._get_output(
            name=self.name,
            steps=self.steps,
            current_step=self.current_step,
            tools=self.tools,
            history=self.history,
            response_format=route_decision_model,
            system_message=self.system_message,
            persona=self.persona,
        )
        log_debug(f"Model decision: {decision}")
        return decision

    def next(self, user_input: Optional[str] = None, no_errors: int = 0) -> tuple[BaseModel, Any]:
        """
        Advance the session to the next step based on user input and LLM decision.

        :param user_input: Optional user input string.
        :param no_errors: Number of consecutive errors encountered.
        :return: A tuple containing the decision and any tool results.
        """
        if user_input:
            log_debug(f"User input received: {user_input}")
            self._add_message("user", user_input)
        log_debug(f"Current step: {self.current_step.step_id}")
        decision = self._get_next_decision()
        self.history.append(self.current_step)
        log_debug(f"Action decided: {decision.action}")
        if decision.action == Action.ASK or decision.action == Action.ANSWER:
            self._add_message(self.name, decision.input)
            return decision, None
        elif decision.action == Action.TOOL_CALL:
            self._add_message("tool", f"Tool call: {decision.tool_name} with args: {decision.tool_kwargs}")
            _error = None
            try:
                tool_kwargs = (
                    decision.tool_kwargs.model_dump()
                    if isinstance(decision.tool_kwargs, BaseModel)
                    else {}
                )
                log_debug(
                    f"Running tool: {decision.tool_name} with args: {tool_kwargs}"
                )
                tool_results = self._run_tool(decision.tool_name, tool_kwargs)
                self._add_message("tool", f"Tool result: {tool_results}")
            except InvalidArgumentsError as e:
                _error = e
                self._add_message("error", str(e))
            except FallbackError as e:
                _error = e
                self._add_message("fallback", str(e))
            except Exception as e:
                _error = e
                self._add_message("error", str(e))
            if self.method == "manual":
                if _error is not None:
                    raise _error
                return decision, tool_results
            return self.next(no_errors=no_errors + 1) if _error is not None else self.next()
        elif decision.action == Action.MOVE:
            _error = None
            if decision.next_step_id in self.current_step.get_available_routes():
                self.current_step = self.steps[decision.next_step_id]
                log_debug(f"Moving to next step: {self.current_step.step_id}")
                self.history.append(self.current_step)
            else:
                self._add_message(
                    "error",
                    f"Invalid route: {decision.next_step_id} not in {self.current_step.get_available_routes()}",
                )
                _error = ValueError(
                    f"Invalid route: {decision.next_step_id} not in {self.current_step.get_available_routes()}"
                )
            if self.method == "manual":
                if _error is not None:
                    raise _error
                return decision, None
            return self.next()
        elif decision.action == Action.END:
            self._add_message("end", "Session ended.")
            return decision, None


class Sofia:
    """
    Main interface for creating and managing SOFIA agents.
    """
    def __init__(
        self,
        llm: LLMBase,
        name: str,
        steps: List[Step],
        start_step_id: str,
        persona: Optional[str] = None,
        system_message: Optional[str] = None,
        tools: List[Callable] = [],
        show_steps_desc: bool = False,
        max_errors: int = 3,
        method: Literal["auto", "manual"] = "auto",
        config: Optional[AgentConfig] = None,
    ):
        """
        Initialize a Sofia agent.

        :param llm: LLMBase instance.
        :param name: Name of the agent.
        :param steps: List of Step objects.
        :param start_step_id: ID of the starting step.
        :param persona: Optional persona string.
        :param system_message: Optional system message.
        :param tools: List of tool callables.
        :param show_steps_desc: Whether to show step descriptions.
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
        self.method = method
        self.tools = tools
        self.config = config
        if start_step_id not in self.steps:
            log_error(f"Start step ID {start_step_id} not found in steps")
            raise ValueError(f"Start step ID {start_step_id} not found in steps")
        log_debug(f"FlowManager initialized with start step '{start_step_id}'")

    @classmethod
    def from_config(cls, llm: LLMBase, config: AgentConfig, tools: list[Callable] = []) -> "Sofia":
        """
        Create a Sofia agent from an AgentConfig object.

        :param llm: LLMBase instance.
        :param config: AgentConfig instance.
        :param tools: List of tool callables.
        :return: Sofia instance.
        """
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
            method=config.method,
            config=config,
        )

    def create_session(self) -> FlowSession:
        """
        Create a new FlowSession for this agent.

        :return: FlowSession instance.
        """
        log_debug("Creating new session")
        return FlowSession(
            name=self.name,
            llm=self.llm,
            steps=self.steps,
            start_step_id=self.start,
            system_message=self.system_message,
            persona=self.persona,
            tools=self.tools,
            show_steps_desc=self.show_steps_desc,
            max_errors=self.max_errors,
            method=self.method,
            config=self.config,
        )

    def load_session(self, session_id: str) -> FlowSession:
        """
        Load a FlowSession by session_id.

        :param session_id: The session ID string.
        :return: Loaded FlowSession instance.
        """
        log_debug(f"Loading session {session_id}")
        return FlowSession.load_session(session_id)


__all__ = ["FlowSession", "Sofia"]