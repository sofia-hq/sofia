import os
from typing import Callable

tool_list: list[Callable] = []

for filename in os.listdir(os.path.dirname(__file__)):
    if filename.endswith(".py") and filename != "__init__.py":
        module_name = filename[:-3]  # Remove the .py extension
        module = __import__(f"tools.{module_name}", fromlist=[""])
        tool_list.extend(getattr(module, "tools", []))

__all__ = ["tool_list"]