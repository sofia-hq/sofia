"""Memory Management Modules for Sofia Agent."""

from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel

from .base import Memory
from .summary import PeriodicalSummarizationMemory


class MemoryConfig(BaseModel):
    """
    Configuration class for memory management in Sofia Agent.

    Attributes:
        type (str): Type of memory management (e.g., "memory", "no_memory").
        kwargs (dict): Additional parameters for the memory management.
    """

    type: Literal["base", "summarization"] = "base"
    kwargs: Optional[Dict[str, Any]] = None

    def get_memory(self) -> Memory:
        """
        Get the appropriate memory instance based on the configuration.

        :return: An instance of the specified memory management.
        """
        if self.type == "base":
            return Memory()
        elif self.type == "summarization":
            return PeriodicalSummarizationMemory(**self.kwargs or {})
        else:
            raise ValueError(f"Unsupported memory type: {self.type}")
