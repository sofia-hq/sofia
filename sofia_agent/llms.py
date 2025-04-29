"""
LLM base classes and OpenAI LLM integration for SOFIA.
"""

from typing import List, Optional, Union, Dict

from pydantic import BaseModel

from .constants import DEFAULT_SYSTEM_MESSAGE, DEFAULT_PERSONA
from .models.flow import Step, Message
from .models.tool import Tool
from .utils.logging import log_error, log_debug


class LLMBase:
    """
    Abstract base class for LLM integrations in SOFIA.
    """
    def __init__(self):
        """
        Initialize the LLM base class. Subclasses should implement this method.
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
                log_error(
                    f"Tool '{tool_name}' not found in session tools. Skipping."
                )
                continue
            tools_desc.append(f"- {str(tool)}")
        return "\n".join(tools_desc)
    
    @staticmethod
    def format_history(history: List[Union[Message, Step]]) -> str:
        """
        Format the chat history for display or LLM input.

        :param history: List of Message or Step objects.
        :return: String representation of the history.
        """
        history_str = []
        log_debug(f"Formatting chat history: {history}")
        for i, item in enumerate(history):
            if isinstance(item, Message):
                if item.role == "error" and i < len(history) - 1:
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
        system_prompt += "Available Routes (Step and Condition required to move):\n" + self.get_routes_desc(steps, current_step)
        if len(current_step.available_tools) > 0:
            system_prompt += "\nAvailable Tools:\n" + self.get_tools_desc(
                tools, current_step.available_tools
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

    def _get_output(self,
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
            system_message=system_message if system_message else DEFAULT_SYSTEM_MESSAGE.strip(),
            persona=persona if persona else DEFAULT_PERSONA.strip(),
        )
        return self.get_output(
            messages=messages,
            response_format=response_format
        )
        
    
class OpenAIChatLLM(LLMBase):
    """
    OpenAI Chat LLM integration for SOFIA.
    """
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
        _messages = [
            msg.model_dump()
            for msg in messages
        ]
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
    def __init__(self, model: str = "mistral-7b", **kwargs):
        """
        Initialize the MistralAI LLM.

        :param model: Model name to use (default: mistral-7b).
        :param kwargs: Additional parameters for Mistral API.
        """
        from mistralai import Mistral
        self.model = model
        self.client = Mistral(**kwargs)

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
        _messages = [
            msg.model_dump()
            for msg in messages
        ]
        comp = self.client.chat.parse(
            model=self.model,
            messages=_messages,
            response_format=response_format,
        )
        return comp.choices[0].message.parsed


class GeminiLLM(LLMBase):
    """
    Gemini LLM integration for SOFIA.
    """
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
            config = types.GenerateContentConfig(
                system_instruction= system_message,
                response_mime_type='application/json',
                response_schema=response_format
            )
        )
        return comp.parsed