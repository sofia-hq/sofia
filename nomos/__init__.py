"""
Nomos is an open-source, configurable multi-step agent framework for building advanced LLM-powered assistants.

Define your agent's persona, tools, and step-by-step flows in Python or YAML—perfect for conversational, workflow, and automation use cases.
"""

from .config import AgentConfig, ServerConfig
from .core import Agent
from .models.agent import Action, Route, Step
from .models.flow import Flow, FlowComponent, FlowConfig, FlowContext, FlowManager
from .server import run_server
from .utils.flow_utils import create_flows_from_config

__version__ = "0.2.2"
__author__ = "DoWhile"

__all__ = [
    "Agent",
    "AgentConfig",
    "ServerConfig",
    "Action",
    "Step",
    "Route",
    "Flow",
    "FlowManager",
    "FlowContext",
    "FlowComponent",
    "FlowConfig",
    "run_server",
    "create_flows_from_config",
]
