"""OpenAI LLM integration for SOFIA."""

from typing import List

from pydantic import BaseModel

from .base import LLMBase
from ..models.flow import Message


class OpenAI(LLMBase):
    """OpenAI Chat LLM integration for SOFIA."""

    __provider__: str = "openai"

    def __init__(self, model: str = "gpt-4o-mini", **kwargs) -> None:
        """
        Initialize the OpenAIChatLLM.

        :param model: Model name to use (default: gpt-4o-mini).
        :param kwargs: Additional parameters for OpenAI API.
        """
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError(
                "OpenAI package is not installed. Please install it using 'pip install sofia-agent[openai]."
            )

        self.model = model
        self.client = OpenAI(**kwargs)

    def get_output(
        self,
        messages: List[Message],
        response_format: BaseModel,
    ) -> BaseModel:
        """
        Get a structured response from the OpenAI LLM.

        :param messages: List of Message objects.
        :param response_format: Pydantic model for the expected response.
        :return: Parsed response as a BaseModel.
        """
        _messages = [msg.model_dump() for msg in messages]
        comp = self.client.beta.chat.completions.parse(
            model=self.model,
            messages=_messages,
            response_format=response_format,
        )
        return comp.choices[0].message.parsed


__all__ = ["OpenAI"]
