"""AgentConfig class for managing agent configurations."""

from pydantic_settings import BaseSettings
from typing import List, Dict, Optional, Literal

from .llms import LLMConfig
from .models.flow import Step


class AgentConfig(BaseSettings):
    """
    Configuration for the agent, including model settings and flow steps.

    Attributes:
        name (str): Name of the agent.
        persona (Optional[str]): Persona of the agent. Recommended to use a default persona.
        steps (List[Step]): List of steps in the flow.
        start_step_id (str): ID of the starting step.
        tool_arg_descriptions (Dict[str, Dict[str, str]]): Descriptions for tool arguments.
        system_message (Optional[str]): System message for the agent. Default system message will be used if not provided.
    Methods:
        from_yaml(file_path: str) -> "AgentConfig": Load configuration from a YAML file.
        to_yaml(file_path: str) -> None: Save configuration to a YAML file.
    """

    name: str
    persona: Optional[str] = None  # Recommended to use a default persona
    steps: List[Step]
    start_step_id: str
    tool_arg_descriptions: Optional[Dict[str, Dict[str, str]]]
    system_message: Optional[str] = (
        None  # Default system message will be used if not provided
    )
    show_steps_desc: bool = False
    max_errors: int = 3
    method: Literal["auto", "manual"] = "auto"  # Default to auto method

    llm: Optional[LLMConfig] = None  # Optional LLM configuration

    # Loading from YAML file
    @classmethod
    def from_yaml(cls, file_path: str) -> "AgentConfig":
        import yaml

        with open(file_path, "r") as file:
            data = yaml.safe_load(file)
        return cls(**data)

    def to_yaml(self, file_path: str) -> None:
        import yaml

        with open(file_path, "w") as file:
            yaml.dump(self.model_dump(), file)


__all__ = ["AgentConfig"]
