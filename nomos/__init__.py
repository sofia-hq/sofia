"""
Sofia Agent: SOFIA is an open-source, configurable multi-step agent framework for building advanced LLM-powered assistants.

Define your agent's persona, tools, and step-by-step flows in Python or YAML—perfect for conversational, workflow, and automation use cases.
"""

from .config import AgentConfig
from .core import Agent
from .models.flow import Action, Route, Step

__version__ = "0.1.15"
__author__ = "Chandra Irugalbandara"

__all__ = [
    "Agent",
    "AgentConfig",
    "Action",
    "Step",
    "Route",
]
