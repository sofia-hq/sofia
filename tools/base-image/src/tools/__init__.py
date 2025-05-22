"""This module imports all tools from the tools directory and makes them available in a list."""

import os

tool_list: list = []

for filename in os.listdir(os.path.dirname(__file__)):
    if filename.endswith(".py") and filename != "__init__.py":
        module_name = filename[:-3]  # Remove the .py extension
        module = __import__(f"src.tools.{module_name}", fromlist=[""])
        tool_list.extend(getattr(module, "tools", []))

__all__ = ["tool_list"]
