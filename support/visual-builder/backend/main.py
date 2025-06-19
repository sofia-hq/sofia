"""Nomos Visual Builder Backend.

FastAPI backend server for the Nomos Visual Builder application.
"""

import glob
import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from nomos.api.models import ChatRequest, ChatResponse
from nomos.core import Agent, AgentConfig

from pydantic import BaseModel

app = FastAPI()

# Environment configuration
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

agent: Optional[Agent] = None


def clean_tools_directory() -> None:
    """Remove all .py files from tools directory except __init__.py."""
    tools_dir = "tools"
    if not os.path.exists(tools_dir):
        os.makedirs(tools_dir)

    # Keep __init__.py, remove all other .py files
    for py_file in glob.glob(os.path.join(tools_dir, "*.py")):
        if not py_file.endswith("__init__.py"):
            os.remove(py_file)


@app.post("/upload-tools")
async def upload_tools(files: List[UploadFile] = File(...)) -> Dict[str, Any]:  # type: ignore
    """Upload .py tool files to the tools directory."""
    try:
        # Clean existing tools first
        clean_tools_directory()

        uploaded_files = []
        for file in files:
            if not file.filename or not file.filename.endswith(".py"):
                continue

            file_path = os.path.join("tools", file.filename)
            content = await file.read()

            with open(file_path, "wb") as f:
                f.write(content)

            uploaded_files.append(file.filename)

        return {"status": "success", "uploaded_files": uploaded_files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ServerlessChatRequest(BaseModel):
    """Request model for serverless chat endpoint."""

    agent_config: AgentConfig
    chat_request: ChatRequest
    env_vars: Optional[Dict[str, str]] = None
    verbose: bool = False


@app.post("/chat")
def chat(request: ServerlessChatRequest) -> ChatResponse:
    """Handle serverless chat requests."""
    global agent
    from tools import tool_list

    if request.env_vars:
        # Set environment variables if provided
        for key, value in request.env_vars.items():
            os.environ[key] = value

    # Re-instantiate the agent if it doesn't exist or if the config has changed
    if (
        agent is None
        or agent.config.model_dump_json() != request.agent_config.model_dump_json()  # type: ignore
    ):
        agent = Agent.from_config(config=request.agent_config, tools=tool_list)

    # Process the chat request
    decision, tool_output, session_data = agent.next(
        **request.chat_request.model_dump(), verbose=request.verbose
    )
    return ChatResponse(
        response=decision.model_dump(mode="json"),
        tool_output=tool_output,
        session_data=session_data,
    )


if __name__ == "__main__":
    import uvicorn

    # Start the FastAPI server
    uvicorn.run("main:app", host="0.0.0.0", port=BACKEND_PORT, log_level="info")
