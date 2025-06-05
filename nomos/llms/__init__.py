"""LLM base classes and OpenAI LLM integration for SOFIA."""

from typing import Dict, Literal

from pydantic import BaseModel

from .base import LLMBase
from .google import Gemini
from .huggingface import HuggingFace
from .mistral import Mistral
from .ollama import Ollama
from .openai import OpenAI


LLMS: list = [OpenAI, Mistral, Gemini, Ollama, HuggingFace]


class LLMConfig(BaseModel):
    """
    Configuration class for LLM integrations in SOFIA.

    Attributes:
        type (str): Type of LLM integration (e.g., "openai", "mistral", "gemini").
        model (str): Model name to use.
        kwargs (dict): Additional parameters for the LLM API.
    """

    provider: Literal["openai", "mistral", "google", "ollama", "huggingface"]
    model: str
    kwargs: Dict[str, str] = {}

    def get_llm(self) -> LLMBase:
        """
        Get the appropriate LLM instance based on the configuration.

        :return: An instance of the specified LLM integration.
        """
        for llm in LLMS:
            if llm.__provider__ == self.provider:
                return llm(model=self.model, **self.kwargs)
        raise ValueError(f"Unsupported LLM provider: {self.provider}")


__all__ = [
    "LLMConfig",
    "LLMBase",
    "OpenAI",
    "Gemini",
    "Mistral",
    "Ollama",
    "HuggingFace",
]
