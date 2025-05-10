"""
LLM base classes and OpenAI LLM integration for SOFIA.
"""

import os
from typing import List, Optional, Union, Dict, Literal

from pydantic import BaseModel

from .constants import DEFAULT_SYSTEM_MESSAGE, DEFAULT_PERSONA
from .models.flow import Step, Message
from .models.tool import Tool
from .utils.logging import log_error


class LLMBase:
    """
    Abstract base class for LLM integrations in SOFIA.
    """

    __provider__: str = "base"

    def __init__(self):
        """
        Initialize the LLMBase class.
        """
        raise NotImplementedError("Subclasses should implement this method.")

    @staticmethod
    def get_routes_desc(steps: List[Step], current_step: Step) -> str:
        """
        Get a string description of available routes from the current step.

        :param steps: List of all steps.
        :param current_step: The current step.
        :return: String description of routes.
        """
        routes_desc = [
            f"- if '{r.condition}' then -> {steps[r.target].step_id}"
            for r in current_step.routes
        ]
        return "\n".join(routes_desc)

    @staticmethod
    def get_tools_desc(tools: Dict[str, Tool], available_tools: List[str]) -> str:
        """
        Get a string description of available tools for the current step.

        :param tools: Dictionary of tool name to Tool.
        :param available_tools: List of tool names available in this step.
        :return: String description of tools.
        """
        tools_desc = []
        for tool_name in available_tools:
            tool = tools.get(tool_name)
            if not tool:
                log_error(f"Tool '{tool_name}' not found in session tools. Skipping.")
                continue
            tools_desc.append(f"- {str(tool)}")
        return "\n".join(tools_desc)

    @staticmethod
    def format_history(history: List[Union[Message, Step]], max_errors: int = 3) -> str:
        """
        Format the chat history for display or LLM input.

        :param history: List of Message or Step objects.
        :param max_errors: Maximum number of consecutive errors to display.
        :return: String representation of the history.
        """
        history_str = []
        # log_debug(f"Formatting chat history: {history}")
        n_last_consecutive_errors = 0
        for item in history:
            if isinstance(item, Message):
                if item.role == "error":
                    n_last_consecutive_errors += 1
                else:
                    n_last_consecutive_errors = 0
            elif isinstance(item, Step):
                n_last_consecutive_errors = 0
        if n_last_consecutive_errors > max_errors:
            log_error(
                f"Too many consecutive errors in history. Only showing the last {max_errors} errors out of  {n_last_consecutive_errors}"
            )
        for i, item in enumerate(history):
            if isinstance(item, Message):
                if item.role == "error":
                    if n_last_consecutive_errors > max_errors:
                        if i < len(history) - max_errors:
                            continue
                    history_str.append(f"<Error> {item.content}")
                    continue
                if item.role == "fallback":
                    history_str.append(f"<Fallback> {item.content}")
                    continue
                if item.role == "tool":
                    history_str.append(f"<Tool> {item.content}")
                    continue
                history_str.append(f"[{item.role}] {item.content}")
            elif isinstance(item, Step):
                history_str.append(f"<Step> {item.step_id}")
        return "\n".join(history_str)

    def get_messages(
        self,
        name: str,
        steps: List[Step],
        current_step: Step,
        tools: Dict[str, Tool],
        history: List[Union[Message, Step]],
        system_message: str,
        persona: str,
    ) -> List[Message]:
        """
        Construct the list of messages to send to the LLM.

        :param name: Agent name.
        :param steps: List of steps.
        :param current_step: Current step.
        :param tools: Dictionary of tools.
        :param history: Conversation history.
        :param system_message: System prompt.
        :param persona: Agent persona.
        :return: List of Message objects.
        """
        messages = []
        system_prompt = system_message + "\n"
        system_prompt += f"Your Name: {name}" + "\n"
        system_prompt += f"Your Persona: {persona}" + "\n\n"
        system_prompt += f"Current Step: {current_step.step_id}" + "\n"
        system_prompt += f"Instructions: {current_step.description.strip()}" + "\n"
        system_prompt += (
            "Available Routes (Step and Condition required to move):\n"
            + self.get_routes_desc(steps, current_step)
        )
        if len(current_step.available_tools) > 0:
            system_prompt += "\nAvailable Tools:\n" + self.get_tools_desc(
                tools, current_step.tool_ids
            )
        messages.append(Message(role="system", content=system_prompt))
        messages.append(
            Message(role="user", content=f"History:\n{self.format_history(history)}")
        )
        return messages

    def get_output(
        self,
        messages: List[Message],
        response_format: BaseModel,
    ) -> BaseModel:
        """
        Get a structured response from the LLM.

        :param messages: List of Message objects.
        :param response_format: Pydantic model for the expected response.
        :return: Parsed response as a BaseModel.
        """
        raise NotImplementedError("Subclasses should implement this method.")

    def _get_output(
        self,
        name: str,
        steps: List[Step],
        current_step: Step,
        tools: Dict[str, Tool],
        history: List[Union[Message, Step]],
        response_format: BaseModel,
        system_message: Optional[str] = None,
        persona: Optional[str] = None,
    ) -> BaseModel:
        """
        Get a structured response from the LLM using the agent's context.

        :param name: Agent name.
        :param steps: List of steps.
        :param current_step: Current step.
        :param tools: Dictionary of tools.
        :param history: Conversation history.
        :param response_format: Pydantic model for the expected response.
        :param system_message: Optional system prompt.
        :param persona: Optional agent persona.
        :return: Parsed response as a BaseModel.
        """
        messages = self.get_messages(
            name=name,
            steps=steps,
            current_step=current_step,
            tools=tools,
            history=history,
            system_message=(
                system_message if system_message else DEFAULT_SYSTEM_MESSAGE.strip()
            ),
            persona=persona if persona else DEFAULT_PERSONA.strip(),
        )
        return self.get_output(messages=messages, response_format=response_format)


class OpenAIChatLLM(LLMBase):
    """
    OpenAI Chat LLM integration for SOFIA.
    """

    __provider__: str = "openai"

    def __init__(self, model: str = "gpt-4o-mini", **kwargs):
        """
        Initialize the OpenAIChatLLM.

        :param model: Model name to use (default: gpt-4o-mini).
        :param kwargs: Additional parameters for OpenAI API.
        """
        from openai import OpenAI

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


class MistralAILLM(LLMBase):
    """
    Mistral AI LLM integration for SOFIA.
    """

    __provider__: str = "mistral"

    def __init__(self, model: str = "ministral-8b-latest", **kwargs):
        """
        Initialize the MistralAI LLM.

        :param model: Model name to use (default: ministral-8b-latest).
        :param kwargs: Additional parameters for Mistral API.
        """
        from mistralai import Mistral

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


class GeminiLLM(LLMBase):
    """
    Gemini LLM integration for SOFIA.
    """

    __provider__: str = "google"

    def __init__(self, model: str = "gemini-2.0-flash", **kwargs):
        """
        Initialize the Gemini LLM.

        :param model: Model name to use (default: gemini-2.0-flash).
        :param kwargs: Additional parameters for Gemini API.
        """
        from google.genai import Client

        self.model = model
        self.client = Client(**kwargs)

    def get_output(
        self,
        messages: List[Message],
        response_format: BaseModel,
    ) -> BaseModel:
        """
        Get a structured response from the Gemini LLM.

        :param messages: List of Message objects.
        :param response_format: Pydantic model for the expected response.
        :return: Parsed response as a BaseModel.
        """
        from google.genai import types

        system_message = next(msg.content for msg in messages if msg.role == "system")
        user_message = next(msg.content for msg in messages if msg.role == "user")

        comp = self.client.chat.parse(
            model=self.model,
            contents=[user_message],
            config=types.GenerateContentConfig(
                system_instruction=system_message,
                response_mime_type="application/json",
                response_schema=response_format,
            ),
        )
        return comp.parsed


LLMS = [OpenAIChatLLM, MistralAILLM, GeminiLLM]


class LLMConfig(BaseModel):
    """
    Configuration class for LLM integrations in SOFIA.

    Attributes:
        type (str): Type of LLM integration (e.g., "openai", "mistral", "gemini").
        model (str): Model name to use.
        kwargs (dict): Additional parameters for the LLM API.
    """

    provider: Literal["openai", "mistral", "google"]
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
