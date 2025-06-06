"""Tests for nomos.utils.flow_utils helper functions."""

from nomos.config import AgentConfig
from nomos.models.agent import Step, Route
from nomos.models.flow import FlowConfig
from nomos.utils import flow_utils


def _build_config():
    steps = [
        Step(step_id="s1", description="step 1"),
        Step(step_id="s2", description="step 2"),
        Step(step_id="s3", description="step 3"),
    ]
    flows = [
        FlowConfig(flow_id="f1", enters=["s1"], exits=["s2"]),
        FlowConfig(flow_id="f2", enters=["s2"], exits=["s3"]),
    ]
    return AgentConfig(name="a", steps=steps, start_step_id="s1", flows=flows)


def test_create_flows_from_config():
    config = _build_config()
    manager = flow_utils.create_flows_from_config(config)

    assert len(manager.flows) == 2
    assert "f1" in manager.flows and "f2" in manager.flows
    # step flow_id gets updated to the last flow it belongs to
    assert config.steps[1].flow_id == "f2"


def test_should_enter_and_exit_flow():
    manager = flow_utils.create_flows_from_config(_build_config())

    enter_flows = flow_utils.should_enter_flow(manager, "s1")
    assert [f.flow_id for f in enter_flows] == ["f1"]

    exit_flows = flow_utils.should_exit_flow(manager, "s2")
    assert [f.flow_id for f in exit_flows] == ["f1"]


def test_get_flow_for_step():
    manager = flow_utils.create_flows_from_config(_build_config())

    flow = flow_utils.get_flow_for_step(manager, "s2")
    assert flow.flow_id == "f1"
