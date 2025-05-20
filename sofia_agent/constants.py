"""Constants for Sofia."""

DEFAULT_SYSTEM_MESSAGE = "Your task is to decide the next action based on the current step, user input and history."

DEFAULT_PERSONA = "You are a helpful assistant, kind and polite. Use human-like natural language when responding."

ACTION_ENUMS = {
    "MOVE": "move_to_next_step",
    "ANSWER": "provide_answer",
    "ASK": "ask_info",
    "TOOL_CALL": "call_tool",
    "END": "end_flow",
}
