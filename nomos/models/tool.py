"""Tool abstractions and related logic for the NOMOS package."""

import inspect
from typing import Any, Callable, Dict, List, Literal, Optional, Type, Union

from docstring_parser import parse

from pydantic import BaseModel, HttpUrl, SecretStr, ValidationError

from ..mcp.client import MCPClient
from ..models.mcp import MCPServerTransport, MCPToolCallResult
from ..utils.url import join_urls
from ..utils.utils import create_base_model


class RemoteToolServer(BaseModel):
    """
    Represents a remote tool server that provides tools.

    Remote tool servers expose tools that can be discovered and used by Nomos agents.
    Each tool on the server is made available as a Tool object in Nomos.
    Attributes:
        url (HttpUrl): The base URL of the remote tool server.
        api_key (Optional[SecretStr]): API key for authentication with the remote tool server.
        name (str): Name of the remote tool server.
        path (Optional[str]): Path to the tools endpoint on the remote tool server.
    """

    name: str
    url: HttpUrl
    api_key: Optional[SecretStr] = None
    path: Optional[str] = ""

    def get_url(self) -> str:
        """
        Get the full URL of the MCP server, including the endpoint path.

        :return: The full URL as a string.
        """
        if self.path:
            return join_urls(str(self.url), self.path)

        return str(self.url)

    def get_tools(self) -> List["Tool"]:
        """
        Get a list of tool definitions available on the remote tool server.

        :return: A list of tool definitions, each as a dict with 'name', 'description', and 'parameters'.
        """
        raise NotImplementedError("This method should be implemented by subclasses.")

    def call_tool(self, tool: "Tool", **kwargs: Dict) -> MCPToolCallResult:
        """
        Call a tool on the remote tool server with the provided arguments.

        :param tool: The tool to call.
        :param kwargs: The arguments to pass to the tool's function.
        :return: The result of the tool's function.
        """
        raise NotImplementedError("This method should be implemented by subclasses.")


class MCPServer(RemoteToolServer):
    """
    Represents a Model Configuration Protocol (MCP) server that provides tools.

    MCP servers expose tools that can be discovered and used by Nomos agents.
    Each tool on the MCP server is made available as a Tool object in Nomos.
    Attributes:
        name (str): Name of the MCP server.
        url (HttpUrl): The base URL of the MCP server.
        api_key (Optional[SecretStr]): API key for authentication with the MCP server.
        path (Optional[str]): Path to the tools endpoint on the MCP server.
        server_transport (Optional[MCPServerTransport]): The transport type for the MCP server.
    Methods:
        get_url() -> str:
            Get the full URL of the MCP server, including the endpoint path.
        get_tools() -> List[Tool]:
            Get a list of tool definitions available on the MCP server.
        call_tool(tool_name: str, **kwargs) -> Any:
            Call a tool on the MCP server with the provided arguments.
    """

    server_transport: Optional[MCPServerTransport] = MCPServerTransport.mcp

    _server_type_to_builtin_type = {
        "integer": int,
        "string": str,
        "boolean": bool,
        "number": float,
        "array": list,
        "object": dict,
        "null": type(None),
    }

    def get_tools(self) -> List["Tool"]:
        """
        Get a list of tool definitions available on the MCP server.

        :return: A list of tool definitions, each as a dict with 'name', 'description', and 'parameters'.
        """
        tools: List["Tool"] = []
        client = MCPClient(
            str(self.url), path=self.path, transport=self.server_transport
        )
        tools_list = client.get_tools_list()

        for tool in tools_list:
            tool_name = tool["name"]
            tool_description = tool["description"]
            mapped_parameters = {}
            parameters = tool["inputSchema"].get("properties", {})
            for param_name, param_info in parameters.items():
                param_type = self._server_type_to_builtin_type.get(
                    param_info.get("type"), Any
                )
                param_description = param_info.get("title", "")
                mapped_parameters[param_name] = {
                    "type": param_type,
                    "description": param_description,
                }
            tool_obj = Tool(
                name=tool_name,
                description=tool_description,
                function=lambda *args, **kwargs: None,
                remote_server=self,
                parameters=mapped_parameters,
            )
            tools.append(tool_obj)

        return tools

    def call_tool(self, tool: "Tool", **kwargs: Dict) -> MCPToolCallResult:
        """
        Call a tool on the MCP server.

        :param tool_name: The name of the tool to call.
        :param kwargs: The arguments to pass to the tool's function.
        :return: The result of the tool's function.
        """
        client = MCPClient(
            str(self.url), path=self.path, transport=self.server_transport
        )
        return client.call_tool(tool.name, kwargs)


class Tool(BaseModel):
    """
    Represents a tool that can be used in the agent's flow.

    Attributes:
        name (str): The name of the tool.
        description (str): A brief description of the tool.
        function (Callable): The function to be executed when the tool is called.
        parameters (Dict[str, Dict[str, Any]]): A dictionary of parameters for the function.
        remote_server (Optional[RemoteToolServer]): The remote tool server providing the tool.
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
    remote_server: Optional[RemoteToolServer] = None
    args_model: Optional[Type[BaseModel]] = None

    @classmethod
    def from_function(
        cls,
        function: Callable,
        tool_arg_descs: Optional[Dict[str, Dict[str, str]]] = None,
        name: Optional[str] = None,
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
        for _name, param in sig.parameters.items():
            param_info = {
                "type": (
                    param.annotation
                    if param.annotation is not inspect.Parameter.empty
                    else Any
                )
            }
            if tool_arg_desc.get(_name):
                param_info["description"] = tool_arg_desc[_name]
            if param.default is not inspect.Parameter.empty:
                param_info["default"] = param.default
            params[_name] = param_info
        return cls(
            name=name or function.__name__,
            description=description,
            function=function,
            parameters=params,
        )

    @classmethod
    def from_pkg(
        cls,
        name: str,
        identifier: str,
        tool_arg_descs: Optional[Dict[str, Dict[str, str]]] = None,
    ) -> "Tool":
        """
        Create a Tool instance from a package identifier.

        :param identifier: The package identifier in the format "itertools.combinations", "package.submodule.submodule.function", etc.
        """
        tool_arg_descs = tool_arg_descs or {}
        if "." not in identifier:
            raise ValueError(
                f"Invalid tool identifier: {identifier}. It should be in the format 'package.submodule.function'."
            )
        module_name, function_name = identifier.rsplit(".", 1)
        try:
            module = __import__(module_name, fromlist=[function_name])
            function = getattr(module, function_name, None)
            assert (
                function is not None
            ), f"Function '{function_name}' not found in module '{module_name}'."
            assert callable(
                function
            ), f"'{function_name}' in module '{module_name}' is not callable."
            return cls.from_function(function, tool_arg_descs, name)
        except Exception as e:
            raise ValueError(f"Could not load tool {identifier}: {e}")

    @classmethod
    def is_package_tool(cls, identifier: str) -> bool:
        """
        Check if a tool identifier corresponds to a package tool.

        :param identifier: The tool identifier.
        :return: True if the tool is a package tool, False otherwise.
        """
        return ":" in identifier and not cls.is_remote_tool(identifier)

    @classmethod
    def is_mcp_tool(cls, identifier: str) -> bool:
        """
        Check if a tool identifier corresponds to an MCP tool.

        :param identifier: The tool identifier.
        :return: True if the tool is an MCP tool, False otherwise.
        """
        return identifier.startswith("mcp:") and len(identifier.split(":")) == 3

    @classmethod
    def is_remote_tool(cls, identifier: str) -> bool:
        """
        Check if a tool identifier corresponds to a remote tool.

        :param identifier: The tool identifier.
        :return: True if the tool is a remote tool, False otherwise.
        """
        if cls.is_mcp_tool(identifier):
            return True

        return False

    @classmethod
    def get_remote_server_name_from_tool_name(cls, identifier: str) -> Optional[str]:
        """
        Get the remote server name from a tool identifier.

        :param identifier: The tool identifier in format "mcp:server_name:tool_name".
        :return: The remote server name if found, None otherwise.
        """
        if cls.is_remote_tool(identifier):
            parts = identifier.split(":")
            if len(parts) >= 3:
                return parts[1]

        return None

    @classmethod
    def get_tool_name_from_remote_tool_name(cls, identifier: str) -> Optional[str]:
        """
        Get the tool name from a remote tool identifier.

        :param identifier: The tool identifier in format "mcp:server_name:tool_name".
        :return: The tool name if found, None otherwise.
        """
        if cls.is_remote_tool(identifier):
            parts = identifier.split(":")
            if len(parts) >= 3:
                return parts[2]

        return None

    @classmethod
    def from_langchain_tool(cls) -> None:
        """TODO: Create a Tool instance from a LangChain tool."""
        return

    @classmethod
    def from_crewai_tool(
        cls, name: str, tool_id: str, tool_kwargs: Optional[dict] = None
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
            camel_case_fn_name = name.replace("_", " ").title().replace(" ", "")
            new_tool_args_model = rename_pydantic_model(
                structured_tool.args_schema, f"{camel_case_fn_name}Args"
            )
            return cls(
                name=name,
                description=tool_instance.name,
                function=tool_instance.run,
                parameters={},
                args_model=new_tool_args_model,
            )
        except Exception as e:
            raise ValueError(f"Could not load CrewAI tool {tool_id}: {e}")

    def get_args_model(self) -> Type[BaseModel]:
        """
        Get the Pydantic model for the tool's arguments.

        :return: A Pydantic model representing the tool's arguments.
        """
        if self.args_model:
            return self.args_model
        camel_case_fn_name = self.name.replace("_", " ").title().replace(" ", "")
        basemodel_name = f"{camel_case_fn_name}Args"
        args_model = create_base_model(
            basemodel_name,
            self.parameters,
        )
        self.args_model = args_model
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

        if self.remote_server:
            tool_call_result = self.remote_server.call_tool(self, **kwargs)
            if tool_call_result.error:
                raise ToolCallError(tool_call_result.error)

            return tool_call_result.content  # type: ignore

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


class ToolCallError(Exception):
    """Exception raised when a tool call fails."""

    def __init__(self, error: str) -> None:
        """
        Tool call exception.

        :param error: The error message.
        """
        super().__init__(error)
        self.error = error

    def __str__(self) -> str:
        """Create a simplified tool call error."""
        return f"Tool call failed with error: {self.error}"


class ToolWrapper(BaseModel):
    """Represents a wrapper for a tool."""

    tool_type: Literal["pkg", "crewai", "langchain"]
    tool_identifier: str
    name: str
    kwargs: Optional[dict] = None

    def get_tool(
        self, tool_arg_descs: Optional[Dict[str, Dict[str, str]]] = None
    ) -> Tool:
        """
        Get a Tool instance from the tool identifier.

        :return: An instance of Tool.
        """
        if self.tool_type == "pkg":
            return Tool.from_pkg(
                name=self.name,
                identifier=self.tool_identifier,
                tool_arg_descs=tool_arg_descs,
            )
        if self.tool_type == "crewai":
            return Tool.from_crewai_tool(
                name=self.name, tool_id=self.tool_identifier, tool_kwargs=self.kwargs
            )
        # if self.tool_type == "langchain":
        #     return Tool.from_langchain_tool(
        #         name=self.name, tool=self.tool_identifier, tool_kwargs=self.kwargs
        #     )
        raise ValueError(
            f"Unsupported tool type: {self.tool_type}. Supported types are 'pkg', 'crewai', and 'langchain'."
        )


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
    "ToolWrapper",
]
