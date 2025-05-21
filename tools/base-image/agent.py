"""SOFIA Agent Initialization."""

import os

from opentelemetry.sdk.resources import Resource

# Initialize Tracing
if os.getenv("ENABLE_TRACING", "false").lower() == "true":
    from sofia_agent.utils.tracing import initialize_tracing

    initialize_tracing(
        tracer_provider_kwargs={
            "resource": Resource(
                {
                    "service.name": os.getenv("SERVICE_NAME", "sofia-agent"),
                    "service.version": os.getenv("SERVICE_VERSION", "1.0.0"),
                }
            )
        }
    )

import sofia_agent as sa
from sofia_agent.llms.openai import OpenAI

from tools import tool_list

config = sa.AgentConfig.from_yaml(
    os.path.join(os.path.dirname(__file__), "config.agent.yaml")
)
llm = config.llm.get_llm() if hasattr(config, "llm") and config.llm else OpenAI()
agent = sa.Sofia.from_config(config, llm, tool_list)

# # Uncomment the following lines to run the agent in a standalone mode
# if __name__ == "__main__":
#     session = agent.create_session(verbose=True)

#     user_input = input("User: ")
#     while user_input.lower() != "exit":
#         decision, _ = session.next(user_input)
#         print(f"Agent: {decision.input}")
#         user_input = input("User: ")

__all__ = ["agent"]
