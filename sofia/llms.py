from typing import List, Optional, Union, Dict

from openai import OpenAI
from pydantic import BaseModel

from .constants import DEFAULT_SYSTEM_MESSAGE, DEFAULT_PERSONA
from .models.flow import Step, Message
from .models.tool import Tool
from .utils.logging import log_error, log_debug


class LLMBase:
    def __init__(self):
        raise NotImplementedError("Subclasses should implement this method.")
    
    @staticmethod
    def get_routes_desc(steps: List[Step], current_step: Step) -> str:
        routes_desc = [
            f"- if '{r.condition}' then -> {steps[r.target].step_id}"
            for r in current_step.routes
        ]
        return "\n".join(routes_desc)
    
    @staticmethod
    def get_tools_desc(tools: Dict[str, Tool], available_tools: List[str]) -> str:
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
        Get the messages to send to the LLM.
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
        Get a structured response from the LLM.
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
    def __init__(self, model: str = "gpt-4o-mini"):
        self.model = model
        self.client = OpenAI()

    def get_output(
        self,
        messages: List[Message],
        response_format: BaseModel,
    ) -> BaseModel:
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