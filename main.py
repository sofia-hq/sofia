from typing import Dict, List, Optional, Union, Callable, Any, Literal
from enum import Enum
from openai import OpenAI
import uuid
import pickle
from loguru import logger
from pydantic import create_model, BaseModel, Field
from typing import Any, Dict, Type
import inspect

# Configure logger to log to a file
logger.add("flow_debug.log", level="DEBUG", rotation="1 MB", retention="10 days")

client = OpenAI()

TYPE_MAP = {str: "str", int: "int", float: "float", bool: "bool"}


# Models
class Action(Enum):
    MOVE = "move_to_next_step"
    ANSWER = "provide_answer"
    ASK = "ask_additional_info"
    TOOL_CALL = "call_tool"


def create_base_model(name: str, params: Dict[str, Dict[str, Any]]) -> Type[BaseModel]:
    fields = {}
    for field_name, config in params.items():
        field_type = config["type"]
        default_val = config.get("default", ...)
        description = config.get("description")

        if description is not None or description != "":
            field_info = Field(default=default_val, description=description)
        else:
            field_info = default_val

        fields[field_name] = (field_type, field_info)

    return create_model(name, **fields)


def create_route_decision_model(
    available_step_ids: list[str], tool_ids: list[str], tool_models: list[BaseModel]
) -> Type[BaseModel]:
    if len(tool_models) == 0:
        tool_kwargs_type = Literal[None]
    elif len(tool_models) == 1:
        tool_kwargs_type = Optional[tool_models[0]]
    else:
        tool_kwargs_type = Optional[Union[*tool_models]]

    return create_base_model(
        "RouteDecision",
        {
            "reasoning": {
                "type": List[str],
                "description": "Reasoning for the decision",
            },
            "action": {"type": Action, "description": "Action to take"},
            "next_step_id": {
                "type": (
                    Optional[Literal[*available_step_ids]]
                    if len(available_step_ids) > 0
                    else Literal[None]
                ),
                "default": None,
                "description": "Next step ID if action is MOVE (move to next step)",
            },
            "input": {
                "type": Optional[str],
                "default": None,
                "description": "Input (either a question or answer) if action is ASK (ask_) or ANSWER (provide_answer) - Make sure to use natural language.",
            },
            "tool_name": {
                "type": Optional[Literal[*tool_ids]] if len(tool_ids) > 0 else Literal[None],
                "default": None,
                "description": "Tool name if action is TOOL_CALL (call_tool)",
            },
            "tool_kwargs": {
                "type": tool_kwargs_type,
                "default": None,
                "description": "Tool arguments if action is TOOL_CALL (call_tool).",
            },
        },
    )


class Route(BaseModel):
    target: str
    condition: str


class Step(BaseModel):
    step_id: str
    description: str
    routes: List[Route] = []
    available_tools: List[str] = []

    def get_available_routes(self) -> List[str]:
        return [route.target for route in self.routes]


class Message(BaseModel):
    role: str
    content: str


class Tool(BaseModel):
    name: str
    description: str
    function: Callable
    parameters: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def from_function(cls, function: Callable) -> "Tool":
        sig = inspect.signature(function)
        params = {}
        for k, v in function.__annotations__.items():
            if k == "return":
                continue
            param_info = {"type": v}
            if (
                k in sig.parameters
                and sig.parameters[k].default is not inspect.Parameter.empty
            ):
                param_info["default"] = sig.parameters[k].default
            params[k] = param_info

        return cls(
            name=function.__name__,
            description=function.__doc__ or "",
            function=function,
            parameters=params,
        )

    def set_parameters(self, parameters: Dict[str, Dict[str, Any]]) -> None:
        self.parameters = parameters

    def get_arguments_basemodel(self) -> Type[BaseModel]:
        camel_case_fn_name = self.name.replace("_", " ").title().replace(" ", "")
        basemodel_name = f"{camel_case_fn_name}Args"
        return create_base_model(
            basemodel_name,
            self.parameters,
        )

    def run(self, **kwargs) -> Any:
        return self.function(**kwargs)

    @staticmethod
    def get_type(value: Any) -> str:
        if value not in TYPE_MAP:
            logger.error(f"Unsupported type '{value}' for parameter in tool.")
            raise ValueError(f"Unsupported type '{value}' for parameter in tool.")
        return TYPE_MAP.get(value, str(value))

    def validate_parameters(self, **kwargs) -> list[str]:
        err_msg = []
        for key, value in kwargs.items():
            if key not in self.parameters:
                err_msg.append(f"- Invalid parameter: {key}")
                continue
            elif isinstance(value, self.parameters[key]["type"]):
                err_msg.append(
                    f"- Invalid type for parameter '{key}': expected {self.get_type(self.parameters[key])}, got {type(value)}"
                )
        for key, value in self.parameters.items():
            if key not in kwargs:
                err_msg.append(
                    f"- Missing required parameter: {key} with type {self.get_type(value)}"
                )
        return err_msg

    def __str__(self) -> str:
        return f"Tool(name={self.name}, description={self.description})"

    def get_args_model(self) -> BaseModel:
        args = {}
        for key, value in self.parameters.items():
            if isinstance(value, str):
                args[key] = str
            elif isinstance(value, int):
                args[key] = int
            elif isinstance(value, float):
                args[key] = float
            elif isinstance(value, bool):
                args[key] = bool
            else:
                logger.error(f"Unsupported type '{value}' for parameter in tool.")
                raise ValueError(f"Unsupported type '{value}' for parameter in tool.")
        return BaseModel(**args)


# Implementation
class FlowSession:
    def __init__(
        self,
        steps: Dict[str, Step],
        start_step_id: str,
        ask_permission: bool = False,
        system_message: Optional[str] = None,
        tools: List[Callable] = [],
        show_steps_desc: bool = False,
    ):
        self.session_id = str(uuid.uuid4())
        self.steps = steps
        self.show_steps_desc = show_steps_desc
        self.current_step = steps[start_step_id]
        self.chat_history: List[Union[Message, Step]] = []
        self.ask_permission = ask_permission
        self.system_message = system_message
        tools_list = [Tool.from_function(tool) for tool in tools]
        self.tools = {tool.name: tool for tool in tools_list}

    def _run_tool(self, tool_name: str, kwargs: Dict[str, Any]) -> Any:
        tool = self.tools.get(tool_name)
        if not tool:
            logger.error(f"Tool '{tool_name}' not found in session tools.")
            raise ValueError(
                f"Tool '{tool_name}' not found in session tools. Please check the tool name."
            )
        logger.debug(f"Running tool: {tool_name} with args: {kwargs}")
        return tool.run(**kwargs)

    def get_tools_desc(self, tools: List[str]) -> str:
        tools_desc = []
        for tool_name in tools:
            tool = self.tools.get(tool_name)
            if not tool:
                logger.error(
                    f"Tool '{tool_name}' not found in session tools. Skipping."
                )
                continue
            tools_desc.append(f"- {str(tool)}")
        return "\n".join(tools_desc)

    def get_tool_models(self) -> list[BaseModel]:
        tool_models = []
        for tool in self.current_step.available_tools:
            tool_model = self.tools.get(tool)
            if not tool_model:
                logger.error(f"Tool '{tool}' not found in session tools. Skipping.")
                continue
            if len(tool_model.parameters) == 0:
                continue
            tool_models.append(tool_model.get_arguments_basemodel())
        return tool_models

    def save_session(self):
        with open(f"{self.session_id}.pkl", "wb") as f:
            pickle.dump(self, f)
        logger.debug(f"Session {self.session_id} saved to disk.")

    @classmethod
    def load_session(cls, session_id: str) -> "FlowSession":
        with open(f"{session_id}.pkl", "rb") as f:
            logger.debug(f"Session {session_id} loaded from disk.")
            return pickle.load(f)

    def format_chat_history(self) -> str:
        chat_history_str = []
        logger.debug(f"Formatting chat history: {self.chat_history}")
        for i, item in enumerate(self.chat_history):
            if isinstance(item, Message):
                if item.role == "error" and i < len(self.chat_history) - 1:
                    continue
                chat_history_str.append(f"[{item.role}] {item.content}")
            elif isinstance(item, Step):
                chat_history_str.append(f"<Step> {item.step_id}")
        return "\n".join(chat_history_str)

    def add_user_input(self, message: str):
        self.chat_history.append(Message(role="user", content=message))
        logger.debug(f"User input added: {message}")

    def add_assistant_message(self, message: str):
        self.chat_history.append(Message(role="assistant", content=message))
        logger.debug(f"Assistant message added: {message}")

    def add_tool_message(self, message: str):
        self.chat_history.append(Message(role="tool", content=message))
        logger.debug(f"Tool message added: {message}")

    def add_tool_result(self, message: str):
        self.chat_history.append(Message(role="tool_result", content=message))
        logger.debug(f"Tool result added: {message}")

    def add_error_message(self, message: str):
        self.chat_history.append(Message(role="error", content=message))
        logger.error(f"Error message added: {message}")

    def get_routes_desc(self) -> str:
        routes_desc = [
            f"- if '{r.condition}' then -> {self.steps[r.target].step_id}"
            for r in self.current_step.routes
        ]
        return "\n".join(routes_desc)

    def get_steps_desc(self) -> str:
        steps_desc = [f"- {s.step_id}: {s.description}" for s in self.steps.values()]
        return "\n".join(steps_desc)

    def get_messages(self) -> List[dict]:
        messages = []
        system_prompt = ""
        if self.system_message:
            system_prompt = self.system_message + "\n\n"
        if self.show_steps_desc:
            system_prompt += "Step Descriptions:\n" + self.get_steps_desc() + "\n\n"
        system_prompt += f"Current Step: {self.current_step.step_id}" + "\n"
        system_prompt += "Available Routes:\n" + self.get_routes_desc()
        if len(self.current_step.available_tools) > 0:
            system_prompt += "\nAvailable Tools:\n" + self.get_tools_desc(
                self.current_step.available_tools
            )
        messages.append({"role": "system", "content": system_prompt})
        messages.append(
            {"role": "user", "content": f"History:\n{self.format_chat_history()}"}
        )
        return messages

    def get_next_decision(self) -> BaseModel:
        messages = self.get_messages()
        logger.debug(f"Calling OpenAI with messages: {messages}")
        comp = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=messages,
            response_format=create_route_decision_model(
                available_step_ids=self.current_step.get_available_routes(),
                tool_ids=self.current_step.available_tools,
                tool_models=self.get_tool_models(),
            ),
        )
        decision = comp.choices[0].message.parsed
        logger.debug(f"Model decision: {decision}")
        return decision

    def next(self, user_input: Optional[str] = None) -> tuple[Action, str | Step]:
        if user_input:
            logger.debug(f"User input received: {user_input}")
            self.add_user_input(user_input)
        logger.debug(f"Current step: {self.current_step.step_id}")
        decision = self.get_next_decision()
        self.chat_history.append(self.current_step)
        logger.debug(f"Action decided: {decision.action}")
        if decision.action == Action.ASK or decision.action == Action.ANSWER:
            self.add_assistant_message(decision.input)
            return Action.ASK, decision.input
        elif decision.action == Action.TOOL_CALL:
            self.add_tool_message(
                f"Tool call: {decision.tool_name} with args: {decision.tool_kwargs}"
            )
            try:
                tool_kwargs = (
                    decision.tool_kwargs.model_dump()
                    if isinstance(decision.tool_kwargs, BaseModel)
                    else {}
                )
                logger.debug(
                    f"Running tool: {decision.tool_name} with args: {tool_kwargs}"
                )
                tool_results = self._run_tool(decision.tool_name, tool_kwargs)
                self.add_tool_result(f"Tool result: {tool_results}")
                if self.ask_permission:
                    return Action.TOOL_CALL, tool_results
            except Exception as e:
                self.add_error_message(str(e))
            return self.next()
        elif decision.action == Action.MOVE:
            if decision.next_step_id in self.steps:
                if (
                    decision.next_step_id
                    not in self.current_step.get_available_routes()
                ):
                    self.add_error_message(
                        f"Invalid route: {decision.next_step_id} not in {self.current_step.get_available_routes()}"
                    )
                    return self.next()
                self.current_step = self.steps[decision.next_step_id]
                logger.debug(f"Moving to next step: {self.current_step.step_id}")
                if self.ask_permission:
                    return Action.MOVE, self.current_step
                self.chat_history.append(self.current_step)
                return self.next()
            else:
                logger.error(f"Next step ID {decision.next_step_id} not found in steps")
                self.add_error_message(
                    f"Next step ID {decision.next_step_id} not found in steps, Available steps: {self.current_step.get_available_routes()}"
                )
                return self.next()


class FlowManager:
    def __init__(
        self,
        steps: List[Step],
        start_step_id: str,
        system_message: Optional[str] = None,
        tools: List[Callable] = [],
        show_steps_desc: bool = False,
    ):
        self.steps = {s.step_id: s for s in steps}
        self.start = start_step_id
        self.system_message = system_message
        self.show_steps_desc = show_steps_desc
        self.tools = tools
        if start_step_id not in self.steps:
            logger.error(f"Start step ID {start_step_id} not found in steps")
            raise ValueError(f"Start step ID {start_step_id} not found in steps")
        logger.debug(f"FlowManager initialized with start step '{start_step_id}'")

    def create_session(self, ask_permission: bool = False) -> FlowSession:
        logger.debug(f"Creating new session with ask_permission={ask_permission}")
        return FlowSession(
            self.steps,
            self.start,
            ask_permission,
            self.system_message,
            self.tools,
            self.show_steps_desc,
        )

    def load_session(self, session_id: str) -> FlowSession:
        logger.debug(f"Loading session {session_id}")
        return FlowSession.load_session(session_id)


if __name__ == "__main__":
    # Flow step for a coffee order and coffee related questions

    def place_order(coffee_type: str, size: str, price: float) -> str:
        """
        Place an order for coffee.
        """
        order_id = str(uuid.uuid4())
        logger.info(
            f"Order placed: {order_id} for {size} {coffee_type} at ${price:.2f}"
        )
        return f"Order placed successfully! Your order ID is {order_id}."

    def get_available_coffee_options() -> str:
        """
        Get available coffee options, sizes, and prices.
        """
        coffee_options = [
            {
                "type": "Espresso",
                "sizes": ["Small", "Medium", "Large"],
                "prices": [2.5, 3.0, 3.5],
            },
            {
                "type": "Latte",
                "sizes": ["Small", "Medium", "Large"],
                "prices": [3.0, 3.5, 4.0],
            },
            {
                "type": "Cappuccino",
                "sizes": ["Small", "Medium", "Large"],
                "prices": [3.0, 3.5, 4.0],
            },
        ]
        return f"Available coffee options: {coffee_options}"

    start_step = Step(
        step_id="start",
        description=(
            "Greet the user and ask if they want to order coffee. If the user want to know about different "
            "coffee options use the `get_available_coffee_options` tool to get the available coffee options. "
            "Then ask the user for their choice."
        ),
        available_tools=["get_available_coffee_options"],
        routes=[Route(target="order_coffee", condition="User wants to order coffee")],
    )

    order_coffee_step = Step(
        step_id="order_coffee",
        description=(
            "If the user havent provided the any preference, provide them with the available coffee options."
            " Use the `get_available_coffee_options` tool to get the available coffee options if you need to."
            " Gather all the required information from the user to place the order."
            " Then use the `place_order` tool to place the order. and provide the order ID."
        ),
        available_tools=["place_order", "get_available_coffee_options"],
        routes=[
            Route(
                target="start",
                condition="User wants to start over or place a new order",
            ),
        ],
    )

    # Define the system message for the decision maker (Optional)
    DECISION_MAKER_SYSTEM_MESSAGE = """
    Your task is to decide the next action based on the current step, user input and history.
    Tool calls are only to gather information or to perform actions. (It will not be directly visible to the user)
    You can ask the user for more information, provide an answer, make tool calls or move to the next step (if available and required).
    """

    steps = [start_step, order_coffee_step]
    flow_manager = FlowManager(
        steps,
        start_step_id="start",
        system_message=DECISION_MAKER_SYSTEM_MESSAGE,
        tools=[place_order, get_available_coffee_options],
        show_steps_desc=False,
    )

    # Create a new session
    flow_session = flow_manager.create_session(True)

    # Simulating a conversation
    user_input = None
    while True:
        action, result = flow_session.next(user_input)
        if action == Action.ASK or action == Action.ANSWER:
            user_input = input(f"Assistant: {result}\nYou: ")
        elif action == Action.MOVE:
            print(f"Moving to next step: {result.step_id}")
            cont = input("Do you want to continue? (y/n): ")
            if cont.lower() not in ["y", "yes"]:
                break
            user_input = None
        elif action == Action.TOOL_CALL:
            print(f"Tool call result: {result}")
            cont = input("Do you want to continue? (y/n): ")
            if cont.lower() not in ["y", "yes"]:
                break
            user_input = None
        else:
            print("Unknown action. Exiting.")
            break

    flow_session.save_session()
