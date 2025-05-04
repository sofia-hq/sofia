import os

# Enable Debugging
os.environ["SOFIA_LOG_LEVEL"] = "DEBUG"
os.environ["SOFIA_ENABLE_LOGGING"] = "true"

from sofia_agent import *
from sofia_agent.llms import OpenAIChatLLM as LLM
from barista_tools import tools

# Define the LLM and Barista
llm = LLM()
config = AgentConfig.from_yaml("config.barista.yaml")
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
