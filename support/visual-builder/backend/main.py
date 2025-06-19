"""Nomos Visual Builder Backend.

FastAPI backend server for the Nomos Visual Builder application.
Provides endpoints for managing Nomos agents, uploading tools, and forwarding chat requests.
"""

import atexit
import glob
import os
import signal
import socket
import subprocess
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

import requests


# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Environment configuration
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
NOMOS_SERVER_PORT = int(os.getenv("NOMOS_SERVER_PORT", "8003"))

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

nomos_process: Optional[subprocess.Popen] = None
server_port: int = NOMOS_SERVER_PORT


def terminate(proc: subprocess.Popen) -> None:
    """Terminate a process and its children."""
    if proc.poll() is not None:
        return
    try:
        import psutil

        ps_proc = psutil.Process(proc.pid)
        for child in ps_proc.children(recursive=True):
            child.terminate()
        ps_proc.terminate()
        _, alive = psutil.wait_procs([ps_proc], timeout=3)
        for item in alive:
            item.kill()
    except Exception:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()


def cleanup() -> None:
    """Cleanup function to terminate the Nomos process on exit."""
    global nomos_process
    if nomos_process:
        terminate(nomos_process)
        nomos_process = None


def kill_process_on_port(port: int) -> None:
    """Kill any process running on the specified port."""
    try:
        import psutil

        for proc in psutil.process_iter(["pid", "name", "connections"]):
            try:
                connections = proc.info["connections"]
                if connections:
                    for conn in connections:
                        if conn.laddr.port == port:
                            print(
                                f"Killing process {proc.info['pid']} ({proc.info['name']}) on port {port}"
                            )
                            proc.terminate()
                            try:
                                proc.wait(timeout=3)
                            except psutil.TimeoutExpired:
                                proc.kill()
                            return
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
    except ImportError:
        # Fallback using lsof and kill
        try:
            result = subprocess.run(
                ["lsof", "-ti", f":{port}"], capture_output=True, text=True, check=False
            )
            if result.stdout.strip():
                pids = result.stdout.strip().split("\n")
                for pid in pids:
                    if pid:
                        print(f"Killing process {pid} on port {port}")
                        os.kill(int(pid), signal.SIGTERM)
        except Exception as e:
            print(f"Could not kill process on port {port}: {e}")


def is_port_in_use(port: int) -> bool:
    """Check if a port is currently in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("localhost", port)) == 0


atexit.register(cleanup)


class ResetPayload(BaseModel):
    """Payload for resetting the Nomos server configuration."""

    yaml: str
    env: Dict[str, str]


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


@app.post("/reset")
def reset(payload: ResetPayload) -> Dict[str, str]:
    """Reset the running Nomos server with new configuration."""
    global nomos_process

    with open("config.agent.yaml", "w", encoding="utf-8") as fh:
        fh.write(payload.yaml)

    for key, value in payload.env.items():
        os.environ[str(key)] = str(value)

    # Kill existing nomos process if running
    if nomos_process and nomos_process.poll() is None:
        terminate(nomos_process)
        nomos_process = None

    # Check if port is in use and kill any process using it
    if is_port_in_use(server_port):
        kill_process_on_port(server_port)
        # Wait a bit for the port to be freed
        import time

        time.sleep(1)

    cmd = [
        "nomos",
        "serve",
        "--config",
        "config.agent.yaml",
        "--port",
        str(server_port),
    ]

    # Start the nomos server
    try:
        nomos_process = subprocess.Popen(cmd)

        # Wait a moment and check if it started successfully
        import time

        time.sleep(3)

        if nomos_process.poll() is not None:
            nomos_process = None
            raise HTTPException(status_code=500, detail="Nomos server failed to start")

    except Exception as e:
        nomos_process = None
        raise HTTPException(
            status_code=500, detail=f"Failed to start nomos server: {str(e)}"
        )

    return {"status": "started"}


@app.post("/chat")
def chat(data: dict = Body(...)) -> dict:
    """Forward chat requests to the running Nomos server."""
    if nomos_process is None or nomos_process.poll() is not None:
        raise HTTPException(status_code=400, detail="Nomos server not running")

    url = f"http://localhost:{server_port}/chat"
    try:
        resp = requests.post(url, json=data, timeout=60)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        raise HTTPException(status_code=500, detail=f"Nomos server error: {str(exc)}")


if __name__ == "__main__":
    import uvicorn

    # Start the FastAPI server
    uvicorn.run("main:app", host="0.0.0.0", port=BACKEND_PORT, log_level="info")
