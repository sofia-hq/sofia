from pydantic_settings import BaseSettings
from typing import List, Dict, Any

# from .core import Step  # Uncomment and implement Step in core.py later

class AgentConfig(BaseSettings):
    """
    Configuration for a SOFIA agent, loaded from YAML.
    - steps: List of step definitions (see Step class).
    - tool_arg_descriptions: Dict mapping tool names to argument descriptions.
    """
    steps: List[Any]  # Replace Any with 'Step' when Step is implemented
    tool_arg_descriptions: Dict[str, Dict[str, str]]

    # Implementation for YAML loading and validation will be added later.