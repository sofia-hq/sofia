import os

# Enable Debugging
os.environ["SOFIA_LOG_LEVEL"] = "DEBUG"
os.environ["SOFIA_ENABLE_LOGGING"] = "true"

from sofia_agent import *
from barista_tools import tools
from sofia_agent.llms.openai import OpenAI

# Define the LLM and Barista
config = AgentConfig.from_yaml("config.barista.yaml")
llm = config.llm.get_llm() if hasattr(config, "llm") and config.llm else OpenAI()
barista = Sofia.from_config(llm, config, tools)

# Start the conversation
sess = barista.create_session()

user_input = None
while True:
    decision, _ = sess.next(user_input)
    if decision.action.value in [Action.ASK.value, Action.ANSWER.value]:
        user_input = input(f"Assistant: {decision.input}\nYou: ")
    elif decision.action.value == Action.END.value:
        print("Session ended.")
        break
    else:
        print("Unknown action. Exiting.")
        break

_save = input("Do you want to save the session? (y/n): ")
if _save.lower() == "y":
    sess.save_session()
