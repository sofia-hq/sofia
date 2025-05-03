"""
Tool abstractions and related logic for the SOFIA package.
"""

import inspect

from pydantic import BaseModel, ValidationError
from typing import Callable, Dict, Any, Type, Optional
from ..utils.utils import create_base_model


class Tool(BaseModel):
    name: str
    description: str
    function: Callable
    parameters: Dict[str, Dict[str, Any]] = {}
    _cached_args_model: Optional[Type[BaseModel]] = None

    @classmethod
    def from_function(cls, function: Callable, tool_arg_descs: Dict[str, Dict[str, str]] = {}) -> "Tool":
        sig = inspect.signature(function)
        description = function.__doc__.strip() if function.__doc__ else ""
        tool_arg_desc = tool_arg_descs.get(function.__name__, {})
        params = {}
        for k, v in function.__annotations__.items():
            if k == "return":
                continue
            param_info = {"type": v}
            if tool_arg_desc.get(k):
                param_info["description"] = tool_arg_desc[k]
            if (
                k in sig.parameters
                and sig.parameters[k].default is not inspect.Parameter.empty
            ):
                param_info["default"] = sig.parameters[k].default
            params[k] = param_info

        return cls(
            name=function.__name__,
            description=description,
            function=function,
            parameters=params,
        )

    def get_args_model(self) -> Type[BaseModel]:
        if self._cached_args_model:
            return self._cached_args_model
        camel_case_fn_name = self.name.replace("_", " ").title().replace(" ", "")
        basemodel_name = f"{camel_case_fn_name}Args"
        args_model = create_base_model(
            basemodel_name,
            self.parameters,
        )
        self._cached_args_model = args_model
        return args_model

    def run(self, **kwargs) -> Any:
        # Validate the arguments
        args_model = self.get_args_model()
        try:
            args_model(**kwargs)
        except ValidationError as e:
            raise InvalidArgumentsError(e)
        return self.function(**kwargs)

    def __str__(self) -> str:
        return f"Tool(name={self.name}, description={self.description})"


class FallbackError(Exception):
    """
    Fallback Instruction if a tool fails.
    So the agent can continue the flow.
    """
    def __init__(self, error: str, fallback: str):
        """
        Agent fallback exception.

        :param error: The error message.
        :param fallback: The fallback instruction.
        """
        super().__init__(error)
        self.error = error
        self.fallback = fallback

    def __str__(self):
        return f"Ran into an error: {self.error}. Follow this fallback instruction: {self.fallback}"

class InvalidArgumentsError(Exception):
    """
    Exception raised when an invalid argument is passed to a tool.
    """
    def __init__(self, error: ValidationError):
        """
        Invalid argument exception.

        :param error: The error message.
        """
        super().__init__(str(error))
        self.error = error

    def __str__(self):
        """
        Create a simplified validation error
        """
        errors = self.error.errors()
        error_messages = []
        for error in errors:
            msg = error.get("msg")
            error_messages.append(msg) if msg else None
        return f"Invalid arguments: {', '.join(error_messages)}. Please Try again with valid arguments."


__all__ = ["Tool", "Fallback"]