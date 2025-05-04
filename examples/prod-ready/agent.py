import os

import sofia_agent as sa
from sofia_agent.llms import OpenAIChatLLM as LLM

from tools import tools

llm = LLM()
config = sa.AgentConfig.from_yaml(os.path.join(os.path.dirname(__file__), "config.agent.yaml"))
agent = sa.Sofia.from_config(llm, config, tools)

if __name__ == "__main__":
    # Start the conversation
    sess = agent.create_session()

    user_input = None
    while True:
        decision, _ = sess.next(user_input)
        if decision.action.value in [sa.Action.ASK.value, sa.Action.ANSWER.value]:
            user_input = input(f"Assistant: {decision.input}\nYou: ")
        elif decision.action.value == sa.Action.END.value:
            print("Session ended.")
            break
        else:
            print("Unknown action. Exiting.")
            break

    _save = input("Do you want to save the session? (y/n): ")
    if _save.lower() == "y":
        sess.save_session()

__all__ = ["agent"]