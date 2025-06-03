"""Utilities for flow management and integration."""

from typing import List, Optional

from ..config import AgentConfig
from ..models.flow import Flow, FlowManager


def create_flows_from_config(config: AgentConfig) -> FlowManager:
    """Create flows from agent configuration."""
    flow_manager = FlowManager()

    if not config.flows:
        return flow_manager

    # Create step lookup
    steps_by_id = {step.step_id: step for step in config.steps}

    for flow_config in config.flows:
        # Get steps that belong to this flow
        flow_steps = []
        for step_id in flow_config.enters + flow_config.exits:
            if step_id in steps_by_id:
                step = steps_by_id[step_id]
                # Update step to reference this flow
                step.flow_id = flow_config.flow_id
                flow_steps.append(step)

        # Create flow instance
        flow = Flow(config=flow_config, steps=flow_steps)
        flow_manager.register_flow(flow)

    return flow_manager


def get_flow_for_step(flow_manager: FlowManager, step_id: str) -> Optional[Flow]:
    """Get the active flow for a given step."""
    flows = flow_manager.get_flows_for_step(step_id)
    # For now, return the first flow that contains the step
    # In the future, this could be enhanced with more sophisticated logic
    return flows[0] if flows else None


def should_enter_flow(flow_manager: FlowManager, step_id: str) -> List[Flow]:
    """Check if we should enter any flows at this step."""
    return flow_manager.find_entry_flows(step_id)


def should_exit_flow(flow_manager: FlowManager, step_id: str) -> List[Flow]:
    """Check if we should exit any flows at this step."""
    return flow_manager.find_exit_flows(step_id)


__all__ = [
    "create_flows_from_config",
    "get_flow_for_step",
    "should_enter_flow",
    "should_exit_flow",
]
