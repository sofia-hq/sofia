import os

# Enable Debugging
os.environ["SOFIA_LOG_LEVEL"] = "DEBUG"
os.environ["SOFIA_ENABLE_LOGGING"] = "true"

from nomos import *
from nomos.llms import OpenAI
from .barista_tools import tools

# Step Definitions
start_step = Step(
    step_id="start",
    description=(
        "Greet the customer and ask how can I help them. (e.g., 'Hello! How can I help you today?')"
        "Use the `get_available_coffee_options` tool to get the available coffee options if you need to."
        "If the customer presented a coffee preference themself, use the `get_available_coffee_options` tool "
        "to get the available coffee options and see whether its available in the available coffee options."
        "Otherwise recommend the available coffee options to the customer."
        "When the customer is ready to order, move to the `order_coffee` step."
    ),
    available_tools=["get_available_coffee_options"],
    routes=[
        Route(
            target="take_coffee_order",
            condition="Customer is ready to place a new order",
        )
    ],
)

take_coffee_order_step = Step(
    step_id="take_coffee_order",
    description=(
        "Ask the customer for their coffee preference and size."
        "Use the `get_available_coffee_options` tool to get the available coffee options. (if needed)"
        "If the customer wants to add more items, use the `add_to_cart` tool to add the item to the cart."
        "If the customer wants to remove an item, use the `remove_item` tool."
        "If the customer wants to start over, use the `clear_cart` tool to clear the cart."
        "If the customer wants to finalize the order, move to the `finalize_order` step."
        "If the customer wants to cancel the order, move to the `end` step."
    ),
    available_tools=[
        "get_available_coffee_options",
        "add_to_cart",
        "remove_item",
        "clear_cart",
    ],
    routes=[
        Route(
            target="finalize_order",
            condition="User wants to finalize the order",
        ),
        Route(
            target="end",
            condition="Customer wants to cancel the order",
        ),
    ],
)

finalize_order_step = Step(
    step_id="finalize_order",
    description=(
        "Get the order summary using the `get_order_summary` tool and inform the customer about the total price."
        " and repeat the order summary and get the confirmation from the customer."
        "If the customer wants to finalize the order, use the `finalize_order` tool to complete the order."
        "If the customer wants to change the order or add more items, move to the `take_coffee_order` step."
        "If the customer wants to cancel the order, move to the `end` step."
    ),
    available_tools=["get_order_summary", "finalize_order"],
    routes=[
        Route(
            target="end",
            condition="Order is finalized or canceled",
        ),
        Route(
            target="take_coffee_order",
            condition="Customer wants to change the order or add more items or start over",
        ),
    ],
)

end_step = Step(
    step_id="end",
    description="Clear the cart and end the conversation graciously.",
    available_tools=["clear_cart"],
    routes=[],
)

# Initialize the LLM and Sofia agent
llm = OpenAI()
barista = Agent(
    name="barista",
    llm=llm,
    steps=[start_step, take_coffee_order_step, finalize_order_step, end_step],
    start_step_id="start",
    tools=tools,
    persona=(
        "You are a helpful barista assistant at 'Starbucks'. You are kind and polite. "
        "When responding, you use human-like natural language, professionally and politely."
    ),
)

# Create a new session
sess = barista.create_session()

# Simulating a conversation (You can use fastapi or any other method to get user input)
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
    # Save the session
    sess.save_session()
