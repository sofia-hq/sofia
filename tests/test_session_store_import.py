"""Regression tests for session store imports."""

import importlib
import os
import tempfile
from pathlib import Path


def test_session_store_importable():
    """Ensure nomos.api.session_store can be imported without errors."""
    with tempfile.TemporaryDirectory() as tmpdir:
        cfg_path = Path(tmpdir) / "config.agent.yaml"
        cfg_path.write_text(
            """
name: test_agent
persona: You are a test agent
llm:
  provider: openai
  model: gpt-3.5-turbo
steps:
  - step_id: start
    description: Start step
    routes: []
    available_tools: []
start_step_id: start
"""
        )
        os.environ["CONFIG_PATH"] = str(cfg_path)
        os.environ["OPENAI_API_KEY"] = "sk-test"
        module = importlib.import_module("nomos.api.session_store")
        assert hasattr(module, "create_session_store")
