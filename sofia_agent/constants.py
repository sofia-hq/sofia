"""Constants for Sofia."""

DEFAULT_SYSTEM_MESSAGE = (
    "Your task is to decide the next action based on the current step, user input and history. "
    "Tool calls are only to gather information or to perform actions. (It will not be directly visible to the user) "
    "You can ask the user for more information, provide an answer, make tool calls or move to the next step (if available and required)."
)

DEFAULT_PERSONA = "You are a helpful assistant, kind and polite. Use human-like natural language when responding."

ACTION_ENUMS = {
    "MOVE": "move_to_next_step",
    "ANSWER": "provide_answer",
    "ASK": "ask_additional_info",
    "TOOL_CALL": "call_tool",
    "END": "end_flow",
}
