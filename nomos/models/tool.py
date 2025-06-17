"""Tool abstractions and related logic for the SOFIA package."""

import inspect
from typing import Any, Callable, Dict, Optional, Type, Union

from docstring_parser import parse

from pydantic import BaseModel, ValidationError

from ..utils.utils import convert_camelcase_to_snakecase, create_base_model


class Tool(BaseModel):
    """
    Represents a tool that can be used in the agent's flow.

    Attributes:
        name (str): The name of the tool.
        description (str): A brief description of the tool.
        function (Callable): The function to be executed when the tool is called.
        parameters (Dict[str, Dict[str, Any]]): A dictionary of parameters for the function.
    Methods:
        from_function(function: Callable, tool_arg_descs: Dict[str, Dict[str, str]]) -> Tool:
            Create a Tool instance from a function and its argument descriptions.
        from_pkg(identifier: str, tool_arg_descs: Dict[str, Dict[str, str]]) -> Tool:
            Create a Tool instance from a package identifier.
        get_args_model() -> Type[BaseModel]:
            Get the Pydantic model for the tool's arguments.
        run(**kwargs) -> str:
            Execute the tool with the provided arguments.
    """

    name: str
    description: str
    function: Callable
    parameters: Dict[str, Dict[str, Any]] = {}
    _cached_args_model: Optional[Type[BaseModel]] = None

    @classmethod
    def from_function(
        cls,
        function: Callable,
        tool_arg_descs: Optional[Dict[str, Dict[str, str]]] = None,
    ) -> "Tool":
        """
        Create a Tool instance from a function and its argument descriptions.

        :param function: The function to be executed when the tool is called.
        :param tool_arg_descs: A dictionary of argument descriptions for the function.
        :return: An instance of Tool.
        """
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
        if tool_arg_descs is None:
            tool_arg_descs = {}
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
        cls, identifier: str, tool_arg_descs: Optional[Dict[str, Dict[str, str]]] = None
    ) -> "Tool":
        """
        Create a Tool instance from a package identifier.

        :param identifier: The package identifier in the format "library_name:tool_name".
        """
        library_name, tool_name = identifier.split(":")
        try:
            module = __import__(library_name)
            if tool_arg_descs is None:
                tool_arg_descs = {}
            _tool_arg_descs = getattr(module, "tool_arg_descs", tool_arg_descs)
            for submodule in tool_name.split("."):
                module = getattr(module, submodule)
            assert callable(module), f"{module} is not callable"
            return cls.from_function(module, _tool_arg_descs)
        except Exception as e:
            raise ValueError(f"Could not load tool {identifier}: {e}")

    @classmethod
    def from_langchain_tool(cls) -> None:
        """TODO: Create a Tool instance from a LangChain tool."""
        return

    @classmethod
    def from_crewai_tool(
        cls, tool_id: str, tool_kwargs: Optional[dict] = None
    ) -> "Tool":
        """
        Create a Tool instance from a CrewAI tool.

        :param tool_id: The ID of the CrewAI tool. eg- FileReadTool
        :param tool_kwargs: Optional keyword arguments for the CrewAI tool.
        :return: An instance of Tool.
        """
        from crewai.tools import BaseTool
        from pydantic import create_model, BaseModel, ConfigDict

        def rename_pydantic_model(
            model: type[BaseModel], new_name: str
        ) -> type[BaseModel]:
            """Rename a Pydantic model while preserving its fields and defaults."""
            fields = {
                name: (field.annotation, field)
                for name, field in model.model_fields.items()
            }
            return create_model(
                new_name, **fields, __config__=ConfigDict(extra="forbid")
            )

        tool_kwargs = tool_kwargs or {}

        module = __import__("crewai_tools", fromlist=[tool_id])
        tool_class = getattr(module, tool_id, None)
        assert (
            tool_class is not None
        ), f"Tool class {tool_id} not found in crewai_tools module"

        try:
            tool_instance = tool_class(**tool_kwargs)
            assert isinstance(
                tool_instance, BaseTool
            ), f"{tool_id} is not a valid CrewAI tool"
            structured_tool = tool_instance.to_structured_tool()
            fn_name = convert_camelcase_to_snakecase(tool_id)
            camel_case_fn_name = fn_name.replace("_", " ").title().replace(" ", "")
            new_tool_args_model = rename_pydantic_model(
                structured_tool.args_schema, f"{camel_case_fn_name}Args"
            )
            return cls(
                name=fn_name,
                description=tool_instance.name,
                function=tool_instance.run,
                parameters={},
                _cached_args_model=new_tool_args_model,
            )
        except Exception as e:
            raise ValueError(f"Could not load CrewAI tool {tool_id}: {e}")

    def get_args_model(self) -> Type[BaseModel]:
        """
        Get the Pydantic model for the tool's arguments.

        :return: A Pydantic model representing the tool's arguments.
        """
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

    def run(self, *args, **kwargs) -> str:
        """
        Execute the tool with the provided arguments.

        :param kwargs: The arguments to be passed to the tool's function.
        :return: The result of the tool's function.
        """
        # Validate the arguments
        args_model = self.get_args_model()
        try:
            args_model(**kwargs)
        except ValidationError as e:
            raise InvalidArgumentsError(e)
        return str(self.function(*args, **kwargs))

    def __str__(self) -> str:
        """String representation of the Tool instance."""
        return f"Tool(name={self.name}, description={self.description})"


class FallbackError(Exception):
    """
    Fallback Instruction if a tool fails.

    So the agent can continue the flow.
    """

    def __init__(self, error: str, fallback: str) -> None:
        """
        Agent fallback exception.

        :param error: The error message.
        :param fallback: The fallback instruction.
        """
        super().__init__(error)
        self.error = error
        self.fallback = fallback

    def __str__(self) -> str:
        """Create a simplified validation error."""
        return f"Ran into an error: {self.error}. Follow this fallback instruction: {self.fallback}"


class InvalidArgumentsError(Exception):
    """Exception raised when an invalid argument is passed to a tool."""

    def __init__(self, error: ValidationError) -> None:
        """
        Invalid argument exception.

        :param error: The error message.
        """
        super().__init__(str(error))
        self.error = error

    def __str__(self) -> str:
        """Create a simplified validation error."""
        errors = self.error.errors()
        error_messages = []
        for error in errors:
            msg = error.get("msg")
            error_messages.append(msg) if msg else None
        return f"Invalid arguments: {', '.join(error_messages)}. Please Try again with valid arguments."


class ToolWrapper(BaseModel):
    """Represents a wrapper for a tool."""

    def get_tool(self, *args, **kwargs) -> Tool:
        raise NotImplementedError("get_tool method must be implemented in subclasses.")


class PkgTool(ToolWrapper):
    """
    Represents a tool that can be loaded from a package.

    Attributes:
        identifier (str): The package identifier in the format "library_name:tool_name".
    """

    identifier: str

    def get_tool(
        self, tool_arg_desc: Optional[Dict[str, Dict[str, str]]] = None
    ) -> Tool:
        """
        Get a Tool instance from the package identifier.

        :param tool_arg_desc: A dictionary of argument descriptions for the function.
        :return: An instance of Tool.
        """
        return Tool.from_pkg(self.identifier, tool_arg_desc)


class CrewAITool(ToolWrapper):
    """
    Represents a CrewAI tool.

    Attributes:
        tool_id (str): The ID of the CrewAI tool.
        tool_kwargs (Optional[dict]): Optional keyword arguments for the CrewAI tool.
    """

    tool_id: str
    tool_kwargs: Optional[dict] = None

    def get_tool(self, *args, **kwargs) -> Tool:
        """
        Get a Tool instance from the CrewAI tool ID.

        :param tool_arg_desc: A dictionary of argument descriptions for the function.
        :return: An instance of Tool.
        """
        return Tool.from_crewai_tool(self.tool_id, self.tool_kwargs)


class LangChainTool(ToolWrapper):
    """
    Represents a LangChain tool.

    Attributes:
        tool (Any): The LangChain tool instance.
    """

    tool: Any

    def get_tool(self, *args, **kwargs) -> Tool:
        """
        Get a Tool instance from the LangChain tool.

        :return: An instance of Tool.
        """
        return Tool.from_langchain_tool()


def get_tools(
    tools: Optional[list[Union[Callable, ToolWrapper]]], tool_arg_desc: dict
) -> dict[str, Tool]:
    """
    Get a list of Tool instances from a list of functions or tool identifiers.

    :param tools: A list of functions or tool identifiers.
    :param tool_arg_desc: A dictionary mapping function names to argument descriptions.
    :return: A dictionary mapping tool names to Tool instances.
    """
    _tools: dict[str, Tool] = {}
    for tool in tools or []:
        _tool = None
        if callable(tool):
            _tool = Tool.from_function(tool, tool_arg_desc)
        if isinstance(tool, ToolWrapper):
            _tool = tool.get_tool(tool_arg_desc)
        assert _tool is not None, "Tool must be a callable or a ToolWrapper instance"
        _tools[_tool.name] = _tool
    return _tools


__all__ = [
    "Tool",
    "FallbackError",
    "get_tools",
    "PkgTool",
    "CrewAITool",
    "LangChainTool",
]
