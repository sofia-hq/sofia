"""Mistral LLM integration for SOFIA."""

import os
from typing import List

from pydantic import BaseModel

from .base import LLMBase
from ..models.flow import Message


class Mistral(LLMBase):
    """Mistral AI LLM integration for SOFIA."""

    __provider__: str = "mistral"

    def __init__(self, model: str = "ministral-8b-latest", **kwargs) -> None:
        """
        Initialize the MistralAI LLM.

        :param model: Model name to use (default: ministral-8b-latest).
        :param kwargs: Additional parameters for Mistral API.
        """
        try:
            from mistralai import Mistral
        except ImportError:
            raise ImportError(
                "Mistral package is not installed. Please install it using 'pip install sofia-agent[mistral]."
            )

        self.model = model
        api_key = os.environ["MISTRAL_API_KEY"]
        self.client = Mistral(api_key=api_key, **kwargs)

    def get_output(
        self,
        messages: List[Message],
        response_format: BaseModel,
    ) -> BaseModel:
        """
        Get a structured response from the Mistral LLM.

        :param messages: List of Message objects.
        :param response_format: Pydantic model for the expected response.
        :return: Parsed response as a BaseModel.
        """
        _messages = [msg.model_dump() for msg in messages]
        r = {"type": "json_schema", "schema": response_format.model_json_schema()}
        print(r)
        # TODO: Fix the issue where the mistralai client doesnt support None values
        comp = self.client.chat.parse(
            model=self.model, messages=_messages, response_format=response_format
        )
        return comp.choices[0].message.parsed


__all__ = ["Mistral"]
