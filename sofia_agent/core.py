"""
Core models and logic for the SOFIA package, including flow management, session handling.
"""

import pickle
import uuid
from typing import Dict, List, Optional, Union, Callable, Any
from pydantic import BaseModel

from .utils.logging import log_debug, log_error
from .models.tool import Tool
from .models.flow import Action, Step, Message, create_route_decision_model
from .llms import LLMBase
from .config import AgentConfig


class FlowSession:
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
        config: Optional[AgentConfig] = None,
    ):
        ## Fixed
        self.session_id = f"{name}_{str(uuid.uuid4())}"
        self.name = name
        self.llm = llm
        self.steps = steps
        self.show_steps_desc = show_steps_desc
        self.system_message = system_message
        self.persona = persona
        self.config = config
        tool_arg_descs = self.config.tool_arg_descriptions if self.config and self.config.tool_arg_descriptions else {}
        tools_list = [Tool.from_function(tool, tool_arg_descs) for tool in tools]
        self.tools = {tool.name: tool for tool in tools_list}
        ## Variable
        self.history: List[Union[Message, Step]] = []
        self.current_step = steps[start_step_id]
        
    def save_session(self):
        with open(f"{self.session_id}.pkl", "wb") as f:
            pickle.dump(self, f)
        log_debug(f"Session {self.session_id} saved to disk.")

    @classmethod
    def load_session(cls, session_id: str) -> "FlowSession":
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
            tool_models=self._get_tool_models(),
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

    def next(self, user_input: Optional[str] = None) -> BaseModel:
        if user_input:
            log_debug(f"User input received: {user_input}")
            self._add_message("user", user_input)
        log_debug(f"Current step: {self.current_step.step_id}")
        decision = self._get_next_decision()
        self.history.append(self.current_step)
        log_debug(f"Action decided: {decision.action}")
        if decision.action == Action.ASK or decision.action == Action.ANSWER:
            self._add_message(self.name, decision.input)
            return decision
        elif decision.action == Action.TOOL_CALL:
            self._add_message("tool", f"Tool call: {decision.tool_name} with args: {decision.tool_kwargs}")
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
            except Exception as e:
                self._add_message("error", str(e))
            return self.next()
        elif decision.action == Action.MOVE:
            if decision.next_step_id in self.steps:
                if (
                    decision.next_step_id
                    not in self.current_step.get_available_routes()
                ):
                    self._add_message(
                        "error",
                        f"Invalid route: {decision.next_step_id} not in {self.current_step.get_available_routes()}",
                    )
                    return self.next()
                self.current_step = self.steps[decision.next_step_id]
                log_debug(f"Moving to next step: {self.current_step.step_id}")
                self.history.append(self.current_step)
                return self.next()
            else:
                self._add_message(
                    "error",
                    f"Next step ID {decision.next_step_id} not found in steps. Available steps: {self.current_step.get_available_routes()}"
                )
                return self.next()


class Sofia:
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
        config: Optional[AgentConfig] = None,
    ):
        self.llm = llm
        self.name = name
        self.steps = {s.step_id: s for s in steps}
        self.start = start_step_id
        self.system_message = system_message
        self.persona = persona
        self.show_steps_desc = show_steps_desc
        self.tools = tools
        self.config = config
        if start_step_id not in self.steps:
            log_error(f"Start step ID {start_step_id} not found in steps")
            raise ValueError(f"Start step ID {start_step_id} not found in steps")
        log_debug(f"FlowManager initialized with start step '{start_step_id}'")

    @classmethod
    def from_config(cls, llm: LLMBase, config: AgentConfig, tools: list[Callable] = []) -> "Sofia":
        return cls(
            llm=llm,
            name=config.name,
            steps=config.steps,
            start_step_id=config.start_step_id,
            system_message=config.system_message,
            persona=config.persona,
            tools=tools,
            show_steps_desc=config.show_steps_desc,
            config=config,
        )

    def create_session(self) -> FlowSession:
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
        )

    def load_session(self, session_id: str) -> FlowSession:
        log_debug(f"Loading session {session_id}")
        return FlowSession.load_session(session_id)


__all__ = ["FlowSession", "Sofia"]