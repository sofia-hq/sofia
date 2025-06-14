"""MCP Client for interacting with MCP servers."""

import json
import uuid
from contextlib import contextmanager
from typing import Any, Generator, List, Optional

import httpx

from ..models.mcp import MCPServerTransport, MCPToolCallResult
from ..utils.url import join_urls


class MCPClientError(Exception):
    """Custom exception for MCP client errors."""

    pass


class MCPServerResponse:
    """Represents a response from an MCP server.

    Attributes:
        response (httpx.Response): The HTTP response from the MCP server.
        transport (MCPServerTransport): The transport type used (default is MCPServerTransport.mcp).
    """

    def __init__(
        self,
        response: httpx.Response,
        transport: MCPServerTransport = MCPServerTransport.mcp,
    ) -> None:
        """Initialize the MCPServerResponse.

        :param response: The HTTP response from the MCP server.
        :param transport: The transport type used (default is MCPServerTransport.mcp).
        """
        self.response = response
        self.transport = transport

    @property
    def status_code(self) -> int:
        """
        Get the status code of the response.

        :return: The HTTP status code of the response.
        """
        return self.response.status_code

    @property
    def headers(self) -> dict[str, str]:
        """
        Get the headers of the response.

        :return: The HTTP headers of the response.
        """
        return self.response.headers

    @property
    def json(self) -> dict[str, Any]:
        """
        Parse the response as JSON.

        :return: Parsed JSON response.
        :raises MCPClientError: If the response is not parsable as JSON.
        """
        assert (
            self.transport == MCPServerTransport.mcp
        ), "Only MCP transport is supported"
        data = {}
        for line in map(str.strip, self.response.text.splitlines()):
            if line:
                key, value = map(str.strip, line.split(":", 1))
                try:
                    data[key] = json.loads(value)
                except json.JSONDecodeError:
                    data[key] = value

        return data


class MCPClient:
    """Client for interacting with MCP servers."""

    def __init__(
        self,
        base_url: str,
        path: Optional[str] = None,
        transport: Optional[MCPServerTransport] = MCPServerTransport.mcp,
        client_name: str = "nomos-client",
        protocol_version: str = "2025-03-26",
    ) -> None:
        """
        Initialize the MCP client.

        :param base_url: The base URL of the MCP server.
        :param path: Optional path to the MCP endpoint.
        :param transport: The transport type to use (default is MCPServerTransport.mcp).
        :param client_name: Name of the client.
        :param protocol_version: The protocol version to use.
        """
        self.base_url = base_url
        self.transport = transport
        if path:
            if self.transport == MCPServerTransport.mcp:
                self.path = "mcp/"
            else:
                self.path = ""

        self.client_name = client_name
        self.protocol_version = protocol_version

    @property
    def server_url(self) -> str:
        """
        Get the server URL for the MCP client.

        :return: The full URL to the MCP server.
        """
        return (
            join_urls(self.base_url, self.path) + "/" if self.path.endswith("/") else ""
        )

    @contextmanager
    def session(self) -> Generator[str, None, None]:
        """Create a session with the MCP server."""
        session_id = self._create_session()
        self._send_initialized_notification(session_id)
        try:
            yield session_id
        finally:
            # Clean up the session if needed
            pass

    def _request(
        self,
        method: str,
        headers: Optional[dict] = None,
        payload: Optional[dict] = None,
    ) -> MCPServerResponse:
        """
        Make a request to the MCP server.

        :param method: The method to call.
        :param headers: Optional headers for the request.
        :param payload: The JSON payload for the request.
        :return: The response from the server.
        :raises MCPClientError: If the request fails.
        """
        response = httpx.request(method, self.server_url, headers=headers, json=payload)
        try:
            response.raise_for_status()  # Raise an error for bad responses
        except httpx.HTTPStatusError as e:
            raise MCPClientError(f"Failed to call {method}: {e.response.text}")

        return MCPServerResponse(response)

    def _jsonrpc_request(
        self,
        method: str,
        headers: Optional[dict] = None,
        payload: Optional[dict] = None,
        rpc_version: Optional[str] = "2.0",
    ) -> MCPServerResponse:
        """
        Make a JSON-RPC request to the MCP server.

        :param method: The method to call.
        :param headers: Optional headers for the request.
        :param payload: The JSON payload for the request.
        :return: The response from the server.
        :raises MCPClientError: If the request fails.
        """
        headers = headers or {}
        headers.update(
            {
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
                "mcp-protocol-version": self.protocol_version,
            }
        )

        payload = payload or {}
        payload["jsonrpc"] = rpc_version

        response = self._request(method, headers, payload)
        return response

    def _create_session(self) -> str:
        """
        Create a session with the MCP server.

        :return: The session ID.
        :raises MCPClientError: If the session creation fails.
        """
        assert (
            self.transport == MCPServerTransport.mcp
        ), "Only MCP transport is supported"
        return self._jsonrpc_request(
            "POST",
            payload={
                "id": str(uuid.uuid4()),
                "method": "initialize",
                "params": {
                    "clientInfo": {"name": self.client_name, "version": "1.0"},
                    "protocolVersion": self.protocol_version,
                    "capabilities": {},
                },
            },
        ).headers["mcp-session-id"]

    def send_notification(self, session_id: str, method: str) -> MCPServerResponse:
        """
        Send a notification to the MCP server.

        :param session_id: The session ID obtained from create_session.
        :param method: The method name for the notification.
        :raises MCPClientError: If the notification fails.
        """
        assert (
            self.transport == MCPServerTransport.mcp
        ), "Only MCP transport is supported"
        return self._jsonrpc_request(
            "POST",
            headers={"mcp-session-id": session_id},
            payload={
                "method": method,
            },
        )

    def _send_initialized_notification(self, session_id: str) -> MCPServerResponse:
        """
        Send the initialized notification to the MCP server.

        :param session_id: The session ID obtained from create_session.
        :raises MCPClientError: If the notification fails.
        """
        return self.send_notification(session_id, "notifications/initialized")

    def get_tools_list(self, progress_token: str = "progress-token") -> List:
        """
        Get the list of tools available on the MCP server.

        :param progress_token: Optional progress token for tracking.
        :return: List of tools available on the server.
        :raises MCPClientError: If the request fails.
        """
        assert (
            self.transport == MCPServerTransport.mcp
        ), "Only MCP transport is supported"
        with self.session() as session_id:
            payload = {
                "id": str(uuid.uuid4()),
                "method": "tools/list",
                "params": {"_meta": {"progressToken": progress_token}},
            }
            headers = {
                "mcp-session-id": session_id,
            }
            res = self._jsonrpc_request("POST", headers=headers, payload=payload)
            return res.json["data"]["result"]["tools"]

    def call_tool(
        self, tool_name: str, params: dict, progress_token: str = "progress-token"
    ) -> MCPToolCallResult:
        """
        Call a specific tool on the MCP server.

        :param tool_name: The name of the tool to call.
        :param params: The parameters for the tool.
        :param progress_token: Optional progress token for tracking.
        :return: The response from the tool call.
        :raises MCPClientError: If the tool call fails.
        """
        assert (
            self.transport == MCPServerTransport.mcp
        ), "Only MCP transport is supported"
        with self.session() as session_id:
            payload = {
                "id": str(uuid.uuid4()),
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": params.copy() if isinstance(params, dict) else params,
                    "_meta": {"progressToken": progress_token},
                },
            }
            headers = {
                "mcp-session-id": session_id,
            }
            res = self._jsonrpc_request("POST", headers=headers, payload=payload)
            result_data = res.json["data"]["result"]
            return MCPToolCallResult(
                tool_call_id=res.json["data"]["id"],
                content=(
                    result_data["content"][0].get("text")
                    if not result_data["isError"]
                    else None
                ),
                error=(
                    result_data["content"][0].get("text")
                    if result_data["isError"]
                    else None
                ),
            )
