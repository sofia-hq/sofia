"""Periodical summarization memory module."""

import math
from typing import Callable, List, Optional, Union

from sofia_agent.models.flow import Message, Step, Summary

from .base import Memory


class PeriodicalSummarizationMemory(Memory):
    """Memory module that summarizes periodically."""

    def __init__(
        self,
        token_counter: Callable,
        alpha: float = math.log(2) / 20,  # noqa
        W: int = 10,
        beta: float = 0.5,
        tau: float = 0.2,
        M: int = 2,
        N_max: int = 50,
        T_max: int = 2000,
        weights: Optional[dict] = None,
    ) -> None:
        """
        Initialize periodical summarization memory.

        :param token_counter: Function to count tokens in a string.
        :param alpha: Decay rate for recency. (Default: log(2)/20)
        :param W: Hard recency window size. (Default: 10)
        :param beta: Mix between window and decay. (Default: 0.5)
        :param tau: Threshold for summarization. (Default: 0.2)
        :param M: Always keep last M items. (Default: 2)
        :param N_max: Max items before summarization. (Default: 50)
        :param T_max: Max token count before summarization. (Default: 2000)
        :param weights: Weights for different types of messages. (Default: {"summary": 0.5, "tool": 0.8, "error": 0.0, "fallback": 0.0})
        """
        super().__init__()
        # Fixed
        self.alpha = alpha
        self.W = W
        self.beta = beta
        self.tau = tau
        self.M = M
        self.N_max = N_max
        self.T_max = T_max
        self.token_counter = token_counter
        self.weights = (
            {"summary": 0.5, "tool": 0.8, "error": 0.0, "fallback": 0.0}
            if weights is None
            else weights
        )
        # Variable
        self.summary_i = 0  # Index of the last summary

    def generate_summary(self, items: List[Union[Message, Summary]]) -> Summary:
        """Generate a summary from a list of items."""
        content = " ".join([str(item) for item in items])
        return Summary(content=content)

    def optimize(self) -> None:
        """Optimize memory usage by summarizing."""
        context_cpy = self.context[self.summary_i :]
        N = len(context_cpy)
        total_context = " ".join(
            [str(item) for item in context_cpy if not isinstance(item, Step)]
        )
        T: int = self.token_counter(total_context)

        if N <= self.N_max and T <= self.T_max:
            return

        # Compute scores
        scores = []
        for i, item in enumerate(context_cpy, start=1):
            d = N - i
            decay = math.exp(-self.alpha * d)
            r = 1.0 if d <= self.W else 0.0

            # Type-based weight
            if isinstance(item, Summary):
                w_type = self.weights.get("summary", 0.5)
            elif isinstance(item, Message):
                w_type = self.weights.get(item.role, 1.0)
            else:
                w_type = 0.0

            s = w_type * (self.beta * r + (1 - self.beta) * decay)
            scores.append((i, s))

        # Determine Raw and Summarize sets
        raw_indices = {i for i, s in scores if s >= self.tau}
        recent_indices = {i for i in range(N - self.M + 1, N + 1)}
        raw_indices |= recent_indices

        summarize_items = [
            context_cpy[i - 1] for i, s in scores if i not in raw_indices
        ]

        # Generate summary
        summary = self.generate_summary(summarize_items)
        # Update context (Previous context (-recent items) + summary + recent items)
        self.context = self.context[: -self.M] + [summary] + self.context[-self.M :]
        # Update summary index
        self.summary_i = len(self.context) - self.M - 1

    def get_history(self) -> List[Union[Message, Summary, Step]]:
        """Get the history of messages."""
        return self.context[self.summary_i :]


__all__ = ["PeriodicalSummarizationMemory"]
