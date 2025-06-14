import atexit
import os
import subprocess
from typing import Dict, Optional

import requests
from fastapi import Body, FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

nomos_process: Optional[subprocess.Popen] = None
server_port: int = 8080


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
    global nomos_process
    if nomos_process:
        terminate(nomos_process)
        nomos_process = None


atexit.register(cleanup)


class ResetPayload(BaseModel):
    yaml: str
    env: Dict[str, str]


@app.post("/reset")
def reset(payload: ResetPayload):
    """Reset the running Nomos server with new configuration."""
    global nomos_process, server_port

    with open("config.agent.yaml", "w", encoding="utf-8") as fh:
        fh.write(payload.yaml)

    for key, value in payload.env.items():
        os.environ[str(key)] = str(value)

    if nomos_process and nomos_process.poll() is None:
        terminate(nomos_process)
        nomos_process = None

    cmd = [
        "nomos",
        "serve",
        "--config",
        "config.agent.yaml",
        "--port",
        str(server_port),
    ]
    nomos_process = subprocess.Popen(cmd)
    return {"status": "started", "port": server_port}


@app.post("/chat")
def chat(data: dict = Body(...)):
    """Forward chat requests to the running Nomos server."""
    if nomos_process is None or nomos_process.poll() is not None:
        raise HTTPException(status_code=400, detail="Nomos server not running")

    url = f"http://localhost:{server_port}/chat"
    try:
        resp = requests.post(url, json=data, timeout=60)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        raise HTTPException(status_code=500, detail=str(exc))

