
import uuid

from sofia.models.flow import Action, Step, Route
from sofia.utils.logging import log_info
from sofia.core import Sofia
from sofia.llms import OpenAIChatLLM

llm = OpenAIChatLLM()

def place_order(coffee_type: str, size: str, price: float) -> str:
    """
    Place an order for coffee.
    """
    order_id = str(uuid.uuid4())
    log_info(
        f"Order placed: {order_id} for {size} {coffee_type} at ${price:.2f}"
    )
    return f"Order placed successfully! Your order ID is {order_id}."

def get_available_coffee_options() -> str:
    """
    Get available coffee options, sizes, and prices.
    """
    coffee_options = [
        {
            "type": "Espresso",
            "sizes": ["Small", "Medium", "Large"],
            "prices": [2.5, 3.0, 3.5],
        },
        {
            "type": "Latte",
            "sizes": ["Small", "Medium", "Large"],
            "prices": [3.0, 3.5, 4.0],
        },
        {
            "type": "Cappuccino",
            "sizes": ["Small", "Medium", "Large"],
            "prices": [3.0, 3.5, 4.0],
        },
    ]
    return f"Available coffee options: {coffee_options}"

start_step = Step(
    step_id="start",
    description=(
        "Greet the user and ask if they want to order coffee. If the user want to know about different "
        "coffee options use the `get_available_coffee_options` tool to get the available coffee options. "
        "Then ask the user for their choice."
    ),
    available_tools=["get_available_coffee_options"],
    routes=[Route(target="order_coffee", condition="User wants to order coffee")],
)

order_coffee_step = Step(
    step_id="order_coffee",
    description=(
        "If the user havent provided the any preference, provide them with the available coffee options."
        " Use the `get_available_coffee_options` tool to get the available coffee options if you need to."
        " Gather all the required information from the user to place the order."
        " Then use the `place_order` tool to place the order. and provide the order ID."
    ),
    available_tools=["place_order", "get_available_coffee_options"],
    routes=[
        Route(
            target="start",
            condition="User wants to start over or place a new order",
        ),
    ],
)

coffee_assistant = Sofia(
    llm=llm,
    steps=[start_step, order_coffee_step],
    start_step_id="start",
    tools=[place_order, get_available_coffee_options],
)
# Create a new session
sess = coffee_assistant.create_session()

# Simulating a conversation
user_input = None
while True:
    action, result = sess.next(user_input)
    if action == Action.ASK or action == Action.ANSWER:
        user_input = input(f"Assistant: {result}\nYou: ")
    else:
        print("Unknown action. Exiting.")
        break

_save = input("Do you want to save the session? (y/n): ")
if _save.lower() == "y":
    # Save the session
    sess.save_session()
