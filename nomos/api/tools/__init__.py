"""Load tool modules for the API server."""

import os
import sys

TOOL_DIR = os.getenv("TOOLS_PATH", os.path.dirname(__file__))
if TOOL_DIR not in sys.path:
    sys.path.insert(0, TOOL_DIR)

tool_list: list = []
for filename in os.listdir(TOOL_DIR):
    if filename.endswith(".py") and filename != "__init__.py":
        module_name = filename[:-3]
        module = __import__(module_name)
        tool_list.extend(getattr(module, "tools", []))

__all__ = ["tool_list"]
