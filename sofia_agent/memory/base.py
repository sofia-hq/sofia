"""Base class for memory modules."""

import os
import pickle
from typing import List, Union

from pydantic import BaseModel

from sofia_agent.models.flow import Message, Step


class Summary(BaseModel):
    """Summary of a list of messages."""

    items: List[Union[Message, "Summary"]] = []
    content: str

    def __str__(self):
        return f"[Previous Summary] {self.content}"


class Memory:
    """Base class for memory modules."""

    def __init__(self) -> None:
        """Initialize memory."""
        self.context: List[Union[Message, Step, Summary]] = []

    def add(self, item: Union[Message, Step]) -> None:
        """Add an item to memory."""
        self.context.append(item)
        self.optimize()

    def clear(self) -> None:
        """Clear all items from memory."""
        self.context = []

    def optimize(self) -> None:
        """Optimize memory usage."""
        raise NotImplementedError("Optimize method not implemented.")
    
    def get_history(self) -> List[Union[Message, Summary, Step]]:
        """Get the history of messages."""
        raise NotImplementedError("Get history method not implemented.")

    def save(self, path: str) -> None:
        """Save memory to a file."""
        with open(path, "wb") as f:
            pickle.dump(self.context, f)

    def load(self, path: str) -> None:
        """Load memory from a file."""
        if os.path.exists(path):
            with open(path, "rb") as f:
                self.context = pickle.load(f)
        else:
            raise FileNotFoundError(f"Memory file {path} not found.")

    def to_dict(self) -> dict:
        """Convert memory to a dictionary."""
        return {"context": [item.model_dump(mode="json") for item in self.context]}


__all__ = ["Memory", "Summary"]