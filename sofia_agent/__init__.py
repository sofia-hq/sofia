"""Sofia Agent: SOFIA is an open-source, configurable multi-step agent framework for
building advanced LLM-powered assistants. Define your agent's persona, tools,
 and step-by-step flows in Python or YAML—perfect for conversational, workflow,
 and automation use cases."""

from .core import Sofia
from .config import AgentConfig
from .models.flow import Action, Step, Route

__version__ = "0.1.4"
__author__ = "Chandra Irugalbandara"

__all__ = [
    "Sofia",
    "AgentConfig",
    "Action",
    "Step",
    "Route",
]
