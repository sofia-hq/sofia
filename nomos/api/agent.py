"""SOFIA Agent Initialization."""

import os

from opentelemetry.sdk.resources import Resource

# Initialize Tracing
if os.getenv("ENABLE_TRACING", "false").lower() == "true":
    from nomos.utils.tracing import initialize_tracing

    initialize_tracing(
        tracer_provider_kwargs={
            "resource": Resource(
                {
                    "service.name": os.getenv("SERVICE_NAME", "nomos-agent"),
                    "service.version": os.getenv("SERVICE_VERSION", "0.0.1"),
                }
            )
        }
    )

import nomos  # noqa
from nomos.llms.openai import OpenAI

from .tools import tool_list

config = nomos.AgentConfig.from_yaml(os.getenv("CONFIG_PATH", "config.agent.yaml"))
llm = config.llm.get_llm() if hasattr(config, "llm") and config.llm else OpenAI()
agent = nomos.Agent.from_config(config, llm, tool_list)

# # Uncomment the following lines to run the agent in a standalone mode
# if __name__ == "__main__":
#     session = agent.create_session(verbose=True)

#     user_input = input("User: ")
#     while user_input.lower() != "exit":
#         decision, _ = session.next(user_input)
#         print(f"Agent: {decision.input}")
#         user_input = input("User: ")

__all__ = ["agent"]
