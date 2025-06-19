"""Load tool modules for the API server."""

import os
import sys

TOOL_DIRS = os.getenv("TOOLS_PATH", os.path.dirname(__file__))

tool_list: list = []
for path in TOOL_DIRS.split(os.pathsep):
    if not path:
        continue
    if path not in sys.path:
        sys.path.insert(0, path)
    if not os.path.isdir(path):
        continue

    for filename in os.listdir(path):
        if filename.endswith(".py") and filename != "__init__.py":
            module_name = filename[:-3]
            module = __import__(module_name)
            tool_list.extend(getattr(module, "tools", []))

__all__ = ["tool_list"]
