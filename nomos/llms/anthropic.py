"""Anthropic LLMs integration for Nomos."""

from typing import List

from pydantic import BaseModel

from .base import LLMBase
from ..models.agent import Message


class Anthropic(LLMBase):
    """Anthropic Chat LLM integration for Nomos."""

    __provider__: str = "anthropic"

    def __init__(self, model: str = "claude-3-sonnet-20240229", **kwargs) -> None:
        """Initialize the Anthropic LLM."""
        pass

    def get_output(
        self,
        messages: List[Message],
        response_format: BaseModel,
        **kwargs: dict,
    ) -> BaseModel:
        """
        Get a structured response from the Anthropic LLM.

        :param messages: List of Message objects.
        :param response_format: Pydantic model for the expected response.
        :param kwargs: Additional parameters for Anthropic API.
        :return: Parsed response as a BaseModel.
        """
        raise NotImplementedError("Anthropic LLM integration is not yet implemented.")

    def generate(
        self,
        messages: List[Message],
        **kwargs: dict,
    ) -> str:
        """
        Generate a plain text response from the Anthropic LLM.

        :param messages: List of Message objects.
        :param kwargs: Additional parameters for Anthropic API.
        :return: Generated text response.
        """
        raise NotImplementedError("Anthropic LLM integration is not yet implemented.")

    def token_counter(self, text) -> int:
        """Count the number of tokens in the given text."""
        return super().token_counter(text)


__all__ = ["Anthropic"]
