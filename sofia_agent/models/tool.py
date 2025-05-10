"""
Tool abstractions and related logic for the SOFIA package.
"""

import inspect

from pydantic import BaseModel, ValidationError
from typing import Callable, Dict, Any, Type, Optional
from docstring_parser import parse
from ..utils.utils import create_base_model


class Tool(BaseModel):
    name: str
    description: str
    function: Callable
    parameters: Dict[str, Dict[str, Any]] = {}
    _cached_args_model: Optional[Type[BaseModel]] = None

    @classmethod
    def from_function(
        cls, function: Callable, tool_arg_descs: Dict[str, Dict[str, str]] = {}
    ) -> "Tool":
        sig = inspect.signature(function)
        description = (
            parse(function.__doc__.strip()).short_description
            if function.__doc__
            else None
        )
        description = description or ""

        tool_arg_desc_doc_params = (
            parse(function.__doc__.strip()).params if function.__doc__ else []
        )
        tool_arg_desc_doc = {
            param.arg_name: param.description
            for param in tool_arg_desc_doc_params
            if param.description
        }
        tool_arg_desc = tool_arg_descs.get(function.__name__, {})
        tool_arg_desc_doc.update(tool_arg_desc)
        tool_arg_desc = tool_arg_desc_doc.copy()

        params = {}
        for name, param in sig.parameters.items():
            param_info = {
                "type": (
                    param.annotation
                    if param.annotation is not inspect.Parameter.empty
                    else Any
                )
            }
            if tool_arg_desc.get(name):
                param_info["description"] = tool_arg_desc[name]
            if param.default is not inspect.Parameter.empty:
                param_info["default"] = param.default
            params[name] = param_info

        return cls(
            name=function.__name__,
            description=description,
            function=function,
            parameters=params,
        )

    @classmethod
    def from_pkg(
        cls, identifier: str, tool_arg_descs: Dict[str, Dict[str, str]] = {}
    ) -> "Tool":
        """
        Create a Tool instance from a package identifier
        :param identifier: The package identifier in the format "library_name:tool_name".
        """
        library_name, tool_name = identifier.split(":")
        try:
            module = __import__(library_name)
            _tool_arg_descs = getattr(module, "tool_arg_descs", tool_arg_descs)
            for submodule in tool_name.split("."):
                module = getattr(module, submodule)
            return cls.from_function(module, _tool_arg_descs)
        except Exception as e:
            raise ValueError(f"Could not load tool {identifier}: {e}")

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
