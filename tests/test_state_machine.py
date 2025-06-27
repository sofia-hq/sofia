import pytest

from nomos.models.agent import Step, Route
from nomos.models.flow import FlowConfig, Flow, FlowManager, FlowContext
from nomos.memory.base import Memory
from nomos.state_machine import StateMachine


def test_state_machine_valid_transition():
    steps = {
        "start": Step(step_id="start", description="start", routes=[Route(target="end", condition="")]),
        "end": Step(step_id="end", description="end", routes=[]),
    }
    sm = StateMachine(steps)
    assert sm.can_transition("start", "end")
    assert sm.transition("start", "end") == "end"


def test_state_machine_invalid_transition():
    steps = {
        "a": Step(step_id="a", description="a", routes=[]),
    }
    sm = StateMachine(steps)
    with pytest.raises(ValueError):
        sm.transition("a", "b")


def test_state_machine_flow_transitions():
    steps = {
        "s1": Step(step_id="s1", description="s1", routes=[Route(target="s2", condition="")]),
        "s2": Step(step_id="s2", description="s2", routes=[]),
    }
    flow_cfg = FlowConfig(flow_id="f1", enters=["s1"], exits=["s2"])
    flow = Flow(config=flow_cfg, steps=list(steps.values()))
    manager = FlowManager()
    manager.register_flow(flow)

    sm = StateMachine(steps, manager)

    enters, exits = sm.get_flow_transitions("s1")
    assert enters == ["f1"]
    assert exits == []

    enters, exits = sm.get_flow_transitions("s2")
    assert enters == []
    assert exits == ["f1"]


def test_state_machine_state_restore():
    steps = {
        "a": Step(step_id="a", description="a", routes=[]),
    }
    flow_cfg = FlowConfig(flow_id="f1", enters=["a"], exits=[])
    flow = Flow(config=flow_cfg, steps=list(steps.values()))
    manager = FlowManager()
    manager.register_flow(flow)

    sm = StateMachine(steps, manager, memory=Memory())
    sm.handle_flow_transitions("a", "session")
    state = sm.state_dict()
    assert state is not None

    new_sm = StateMachine(steps, manager, memory=Memory())
    new_sm.load_state(state)
    assert new_sm.current_flow.flow_id == "f1"
