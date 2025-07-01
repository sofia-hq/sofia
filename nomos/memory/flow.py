"""Flow-specific memory module that preserves complete information within an specified flow."""

import heapq
from typing import Any, Dict, List, Optional, Union
from concurrent.futures import Future, ThreadPoolExecutor
import threading

from pydantic import BaseModel


from .base import Memory
from ..constants import PERIODICAL_SUMMARIZATION_SYSTEM_MESSAGE
from ..llms import LLMBase, LLMConfig
from ..models.agent import Message, StepIdentifier, Summary
from ..models.flow import FlowComponent, FlowContext


class Retriver:
    """Base class for retrievers."""

    def __init__(self) -> None:
        """Initialize retriever."""
        self.context: list[str] = []

    def index(self, items: List[str], **kwargs) -> None:
        """Index items for retrieval."""
        raise NotImplementedError("Subclasses should implement this method.")

    def update(self, items: List[str], **kwargs) -> None:
        """Update indexed items."""
        raise NotImplementedError("Subclasses should implement this method.")

    def retrieve(self, query: str, **kwargs) -> list:
        """Retrieve items from memory based on a query."""
        raise NotImplementedError("Subclasses should implement this method.")


class BM25Retriever(Retriver):

    def __init__(self, **kwargs) -> None:
        """Initialize BM25 retriever."""
        import bm25s

        super().__init__()
        self.retriever = bm25s.BM25(**kwargs)

    def index(self, items: List[str], **kwargs) -> None:
        """Index items using BM25."""
        self.context.extend(items)
        self.retriever.index(self.context)

    def update(self, items: List[str], **kwargs) -> None:
        """Update indexed items."""
        self.context.extend(items)
        self.retriever.index(self.context)

    def retrieve(self, query: str, **kwargs) -> list:
        """Retrieve items using BM25 based on a query."""
        import bm25s

        if not self.context:
            return []
        query_tokens = bm25s.tokenize(query)
        results = self.retriever.retrieve(query_tokens, corpus=self.context, **kwargs)
        return results


class EmbeddingRetriever(Retriver):
    """Retriever that uses embeddings for similarity search."""

    def __init__(self, embedding_model: LLMBase) -> None:
        """Initialize embedding retriever."""
        super().__init__()
        self.embedding_model = embedding_model
        self.embeddings: list[list[float]] = []

    def index(self, items: List[str], **kwargs) -> None:
        """Index items using embeddings."""
        self.context = items
        self.embeddings = self.embedding_model.embed_batch(items)

    def update(self, items: List[str], **kwargs) -> None:
        """Update indexed items with new items."""
        self.context.extend(items)
        self.embeddings.extend(self.embedding_model.embed_batch(items))

    def retrieve(self, query: str, top_k: int = 5, **kwargs) -> list:
        """Retrieve items based on a query using embeddings."""
        if not self.context:
            return []
        query_emb = self.embedding_model.embed_text(query)
        scores = [
            (item, self.embedding_model.text_similarity(query_emb, emb))
            for item, emb in zip(self.context, self.embeddings)
        ]
        top_scores = heapq.nlargest(top_k, scores, key=lambda x: x[1])
        return [item for item, _ in top_scores]


class RetrieverConfig(BaseModel):
    """Configuration for a retriever."""

    method: str
    kwargs: Dict[str, Any] = {}

    def get_retriever(self, embedding_model: Optional["LLMBase"] = None) -> Retriver:
        """Get an instance of the retriever based on the configuration."""
        if self.method == "bm25":
            return BM25Retriever(**self.kwargs)
        if self.method == "embedding":
            if embedding_model is None:
                raise ValueError("Embedding model required for embedding retriever")
            return EmbeddingRetriever(embedding_model)
        raise ValueError(f"Unsupported retriever method: {self.method}")


class FlowMemory(Memory):
    """Memory that preserves complete information within an flow."""

    def __init__(
        self,
        llm: Optional[LLMConfig] = None,
        retriever: Optional[RetrieverConfig] = None,
    ) -> None:
        """Initialize FlowMemory."""
        super().__init__()
        retriever = retriever or RetrieverConfig(method="embedding")
        llm = llm or LLMConfig(provider="openai", model="gpt-4o-mini")
        self.llm = llm.get_llm()
        self.retriever = retriever.get_retriever(self.llm)
        self.context = []
        self._executor = ThreadPoolExecutor(max_workers=1)
        self._enter_future: Optional[Future] = None
        self._exit_future: Optional[Future] = None
        self._lock = threading.Lock()

    def _enter(
        self, previous_context: Optional[List[Union[Message, Summary]]] = None
    ) -> None:
        """Enter the flow memory, optionally using previous context."""
        if previous_context:
            def task() -> Summary:
                return self._generate_summary(previous_context)

            def callback(fut: Future) -> None:
                try:
                    summary = fut.result()
                    with self._lock:
                        self.context.append(summary)
                        self.retriever.index([str(summary)])
                finally:
                    self._enter_future = None

            self._enter_future = self._executor.submit(task)
            self._enter_future.add_done_callback(callback)

    def _exit(self) -> Future:
        """Exit the flow memory and return a future summary of the context."""

        def task() -> Summary:
            if self._enter_future:
                try:
                    self._enter_future.result()
                finally:
                    self._enter_future = None
            items = [
                item for item in self.context if isinstance(item, (Message, Summary))
            ]
            return self._generate_summary(items)

        self._exit_future = self._executor.submit(task)
        return self._exit_future

    def _generate_summary(self, items: List[Union[Message, Summary]]) -> Summary:
        """Generate a summary from a list of items."""
        items_str = "\n".join([str(item) for item in items])
        summary = self.llm.get_output(
            messages=[
                Message(role="system", content=PERIODICAL_SUMMARIZATION_SYSTEM_MESSAGE),
                Message(
                    role="user",
                    content=f"Summarize the following Context:\n\n{items_str}",
                ),
            ],
            response_format=Summary,
        )
        assert isinstance(summary, Summary), "Summary generation failed."
        return summary

    def _search(self, query: str, **kwargs) -> list:
        """Search for items in memory that match the query."""
        return self.retriever.retrieve(query, **kwargs)

    def add_message(self, message: Message) -> None:
        """Add a message to the flow context."""
        self.context.append(message)
        self.retriever.update([str(message)])

    def get_context_summary(self) -> str:
        """Get a summary of the current context."""
        if not self.context:
            return "No context available."

        return "\n".join([str(item) for item in self.context[-10:]])  # Last 10 items


class FlowMemoryComponent(FlowComponent):
    """Flow-specific memory component."""

    def __init__(
        self,
        llm: Optional[Dict[str, Any]] = None,
        retriever: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> None:
        """Initialize FlowMemoryComponent."""
        llm = LLMConfig(**llm) if llm else None
        retriever = RetrieverConfig(**retriever) if retriever else None
        self.memory = FlowMemory(llm=llm, retriever=retriever)

    def enter(self, context: FlowContext) -> None:
        """Initialize memory when entering flow."""
        self.memory._enter(context.previous_context)

    def exit(self, context: FlowContext) -> Future:
        """Generate summary when exiting flow."""
        return self.memory._exit()

    def cleanup(self, context: FlowContext) -> None:
        """Clean up memory resources."""
        # Clear context or perform other cleanup
        self.memory.context.clear()

    def search(self, query: str, **kwargs) -> list:
        """Search in flow memory."""
        return self.memory._search(query, **kwargs)

    def add_to_context(self, item: Union[Message, Summary, StepIdentifier]) -> None:
        """Add item to flow memory context."""
        self.memory.context.append(item)
        self.memory.retriever.update([str(item)])


__all__ = [
    "FlowMemory",
    "RetrieverConfig",
    "FlowMemoryComponent",
    "EmbeddingRetriever",
]
