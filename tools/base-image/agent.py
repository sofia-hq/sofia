import os

import sofia_agent as sa
from sofia_agent.llms import OpenAIChatLLM as LLM

from tools import tool_list

config = sa.AgentConfig.from_yaml(os.path.join(os.path.dirname(__file__), "config.agent.yaml"))
llm = config.llm.get_llm() if hasattr(config, "llm") and config.llm else LLM()
agent = sa.Sofia.from_config(llm, config, tool_list)

__all__ = ["agent"]