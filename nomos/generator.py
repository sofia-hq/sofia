"""Agent configuration generator for Nomos."""

from nomos.models.flow import Route, Message
from pydantic import BaseModel, Field
from typing import Optional
from nomos.llms import LLMConfig
import yaml


class Step(BaseModel):
    """
    Represents a step in the agent's workflow.
    """
    step_id: str = Field(..., description="Unique identifier for the step")
    description: str = Field(..., description="Description of what this step does")
    routes: list[Route] = Field(
        default_factory=list,
        description="List of routes that can be taken from this step"
    )
    available_tools: list[str] = Field(
        default_factory=list,
        description="List of tools available to the agent in this step (Only choose from the given tools)"
    )
    auto_flow: bool = Field(
        default=False,
        description="Flag indicating a step in a workflow where agent should not require user input to continue"
    )


class AgentConfiguration(BaseModel):
    """
    Configuration for the agent.
    """
    name: str = Field(..., description="Name of the agent (eg. 'example_agent')")
    persona: str = Field(..., description="Description of the agent's purpose and high-level goals")
    steps: list[Step] = Field(
        default_factory=list,
        description=""
    )
    start_step_id: Optional[str] = Field(
        default=None,
        description="ID of the step to start with. If not provided, the first step will be used."
    )


def validate_agent_configuration(config: AgentConfiguration) -> Optional[str]:
    """
    Validate the agent configuration.
    """
    errors = []
    available_steps = [step.step_id for step in config.steps]
    if config.start_step_id not in available_steps:
        errors.append(f" - Start step ID '{config.start_step_id}' is not valid. It must be one of the defined steps.")
    for step in config.steps:
        for route in step.routes:
            if route.target not in available_steps:
                errors.append(f"- Route in step '{step.step_id}' points to an invalid target step ID '{route.target}'.")
    return "\n".join(errors) if errors else None


REASONING_PROMPT = """
You are an expert agent configuration generator. Agent contains a set of steps and flows that the agent can take to achieve a specific goal.
Each step has a unique ID, a description, tools it can use, and routes to other steps.
You will be given a use case and a list of available tools (if any).

Your task is to identify the steps we need to cover all the cases in the usecase, identify which step should be routed to which step, and which tools should be available in each step.
You will generate a plan that includes the steps, their IDs, descriptions, available tools, and routes. Think step by step and do not rush.
"""

AGENT_CONFIG_GENERATION_PROMPT = """
You are an expert agent configuration generator. You will be given a use case and a list of available tools (if any).
Your task is to generate a valid agent configuration based on the provided use case and tools and the plan
"""


def generate_agent_config(
    llm_config: LLMConfig,
    usecase: str,
    tools_available: str = "",
    max_tries: int = 3,
) -> AgentConfiguration:
    """
    Generate a basic agent configuration based on the use case.
    """
    
    llm = llm_config.get_llm()

    messages = [
        Message(role="system", content=REASONING_PROMPT.strip()),
        Message(role="user", content=f"Usecase: {usecase}\nTools available: {tools_available}")
    ]
    plan = llm.generate(messages=messages)

    print(f"Generated plan: {plan}")

    # Iteratively create the agent configuration from the response
    messages = [
        Message(role="system", content=AGENT_CONFIG_GENERATION_PROMPT.strip()),
        Message(role="user", content=f"Usecase: {usecase}\nTools available: {tools_available}\nPlan: {plan}")
    ]
    _retries = 0
    response: Optional[AgentConfiguration] = None
    while True:
        if _retries >= max_tries:
            print("Max retries reached. Saving the last response.")
            break
        response = llm.get_output(messages=messages, response_format=AgentConfiguration)
        errors = validate_agent_configuration(response) if response else "Failed to get the Configuration."
        print(f"Validation errors: {errors}")
        if not errors:
            break
        messages.append(Message(role="assistant", content=response.model_dump_json() if response else ""))
        messages.append(Message(role="user", content=f"Errors found in the configuration:\n{errors}\nPlease fix them and try again."))
        _retries += 1

    if not response:
        raise ValueError("Failed to generate a valid agent configuration after multiple attempts.")
    return response


def save_yaml_config(config: AgentConfiguration, filename: str) -> None:
    """
    Save the agent configuration to a YAML file.
    """
    with open(filename, 'w') as file:
        yaml.dump(config.model_dump(), file, default_flow_style=False, sort_keys=False)
