"""
Tool abstractions and related logic for the SOFIA package.
"""

import inspect

from pydantic import BaseModel
from typing import Callable, Dict, Any, Type
from ..utils.utils import create_base_model


class Tool(BaseModel):
    name: str
    description: str
    function: Callable
    parameters: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def from_function(cls, function: Callable, tool_arg_descs: Dict[str, str] = {}) -> "Tool":
        sig = inspect.signature(function)
        description = function.__doc__.strip() if function.__doc__ else ""
        tool_arg_desc = tool_arg_descs.get(function.__name__)
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
        camel_case_fn_name = self.name.replace("_", " ").title().replace(" ", "")
        basemodel_name = f"{camel_case_fn_name}Args"
        return create_base_model(
            basemodel_name,
            self.parameters,
        )

    def run(self, **kwargs) -> Any:
        return self.function(**kwargs)

    def __str__(self) -> str:
        return f"Tool(name={self.name}, description={self.description})"
    

__all__ = ["Tool"]