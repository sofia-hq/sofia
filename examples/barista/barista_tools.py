import uuid
from typing import Literal, Optional

from nomos.utils.logging import log_info

# Simulate Inventory
coffee_cart = []
sales = []


# Tool Implementations
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


def add_to_cart(coffee_type: str, size: str, price: float) -> str:
    """
    Add a coffee item to the cart.
    """
    global coffee_cart
    item_id = str(uuid.uuid4())
    log_info(
        f"Adding item to cart: {item_id}, Coffee Type: {coffee_type}, Size: {size}, Price: {price}"
    )
    coffee_cart.append(
        {
            "item_id": item_id,
            "coffee_type": coffee_type,
            "size": size,
            "price": price,
        }
    )
    current_total = get_total_price()
    return f"Item {item_id} added to cart. Current total: ${current_total:.2f}"


def get_total_price() -> float:
    """
    Calculate the total price of all orders in the cart.
    """
    total_price = sum(item["price"] for item in coffee_cart)
    return total_price


def remove_item(item_id: str) -> str:
    """
    Remove an item from the cart.
    """
    global coffee_cart
    coffee_cart = [item for item in coffee_cart if item["item_id"] != item_id]
    return f"Item {item_id} removed successfully."


def clear_cart() -> str:
    """
    Clear all items from the cart.
    """
    global coffee_cart
    coffee_cart = []
    return "All items cleared successfully."


def get_order_summary() -> str:
    """
    Get a summary of all items in the cart.
    """
    if not coffee_cart:
        return "No Items in the cart."
    summary = "\n".join(
        f"Item ID: {item['item_id']}, Coffee: {item['coffee_type']}, Size: {item['size']}, Price: ${item['price']:.2f}"
        for item in coffee_cart
    )
    return f"Order Summary:\n{summary}\nTotal Price: ${get_total_price():.2f}"


def finalize_order(
    payment_method: Literal["Card", "Cash"], payment: Optional[float] = None
) -> str:
    """
    Finalize the order and clear the cart.
    """
    global coffee_cart
    if not coffee_cart:
        return "No orders to finalize."
    total_price = get_total_price()
    balance = payment - total_price if (payment and payment_method == "Cash") else None
    if balance < 0:
        return (
            f"Insufficient payment amount for the order. Requires ${-balance:.2f} more."
        )
    sales.append(
        {
            "order_id": str(uuid.uuid4()),
            "total_price": total_price,
            "payment_method": payment_method,
            "payment": payment,
            "balance": payment - total_price if payment else None,
            "items": coffee_cart.copy(),
        }
    )
    clear_cart()
    if balance is not None or balance > 0:
        return (
            f"Order finalized! Total price: ${total_price:.2f}. "
            f"Payment method: {payment_method}. Change: ${balance:.2f}. Thank you for your order!"
        )
    return (
        f"Order finalized! Total price: ${total_price:.2f}. Thank you for your order!"
    )


tools = [
    get_available_coffee_options,
    add_to_cart,
    get_total_price,
    remove_item,
    clear_cart,
    get_order_summary,
    finalize_order,
]

__all__ = ["tools"]
