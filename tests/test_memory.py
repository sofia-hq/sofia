import pytest
import threading
from concurrent.futures import ThreadPoolExecutor

from nomos.memory.flow import FlowMemory, Retriver
from nomos.memory.summary import PeriodicalSummarizationMemory
from nomos.memory.base import Memory
from nomos.models.agent import Message, Summary
from nomos.llms.base import LLMBase


class StubRetriever(Retriver):
    def index(self, items, **kwargs):
        pass

    def update(self, items, **kwargs):
        pass

    def retrieve(self, query, **kwargs):
        return []


class CounterLLM(LLMBase):
    def __init__(self):
        self.counted = []

    def get_output(self, messages, response_format, **kwargs):
        raise NotImplementedError

    def generate(self, messages, **kwargs):
        raise NotImplementedError

    def token_counter(self, text: str) -> int:
        self.counted.append(text)
        return 42


def test_llm_base_token_counter_default(mock_llm):
    assert mock_llm.token_counter("hello world") == 2


def test_periodical_memory_token_counter_uses_llm():
    llm = CounterLLM()
    mem = PeriodicalSummarizationMemory(llm=llm)
    assert mem.token_counter("abc") == 42
    assert llm.counted == ["abc"]


def test_flow_memory_enter_appends_summary():
    llm = CounterLLM()
    memory = FlowMemory.__new__(FlowMemory)
    Memory.__init__(memory)
    memory._executor = ThreadPoolExecutor(max_workers=1)
    memory._lock = threading.Lock()
    memory.llm = llm
    memory.retriever = StubRetriever()
    memory.context = []
    memory._generate_summary = lambda items: Summary(summary=["sum"])

    previous = [Message(role="user", content="hi")]
    memory._enter(previous)
    if memory._enter_future:
        memory._enter_future.result()

    assert len(memory.context) == 1
    assert isinstance(memory.context[0], Summary)
