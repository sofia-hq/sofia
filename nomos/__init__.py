"""
Nomos is an open-source, configurable multi-step agent framework for building advanced LLM-powered assistants.

Define your agent's persona, tools, and step-by-step flows in Python or YAML—perfect for conversational, workflow, and automation use cases.
"""

from .config import AgentConfig, ServerConfig
from .core import Agent
from .models.agent import Action, Route, SessionContext, Step, StepIdentifier, Summary
from .models.flow import Flow, FlowComponent, FlowConfig, FlowContext, FlowManager
from .server import run_server
from .testing import smart_assert
from .testing.e2e import Scenario, ScenarioRunner

__version__ = "0.2.3"
__author__ = "DoWhile"

__all__ = [
    "Agent",
    "AgentConfig",
    "ServerConfig",
    "Action",
    "Step",
    "StepIdentifier",
    "Summary",
    "Route",
    "Flow",
    "FlowManager",
    "FlowContext",
    "FlowComponent",
    "FlowConfig",
    "run_server",
    "SessionContext",
    "smart_assert",
    "ScenarioRunner",
    "Scenario",
]
