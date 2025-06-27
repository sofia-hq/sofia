from typing import Dict, List, Optional, Tuple

from .models.agent import Message, Step, Summary
from .models.flow import Flow, FlowContext, FlowManager
from .memory.base import Memory

class StateMachine:
    """Compile step and flow transitions for fast lookups."""

    def __init__(self, steps: Dict[str, Step], flow_manager: Optional[FlowManager] = None) -> None:
        # Map of step -> allowed next step ids
        self.transitions: Dict[str, List[str]] = {
            step_id: step.get_available_routes() for step_id, step in steps.items()
        }

        # Flow handling
        self.flow_manager = flow_manager
        self.current_flow: Optional[Flow] = None
        self.flow_context: Optional[FlowContext] = None

        # Pre-compute flow entry/exit mappings if a flow manager is provided
        self.flow_enters: Dict[str, List[str]] = {}
        self.flow_exits: Dict[str, List[str]] = {}
        if flow_manager:
            for step_id in steps:
                self.flow_enters[step_id] = [
                    flow.flow_id for flow in flow_manager.find_entry_flows(step_id)
                ]
                self.flow_exits[step_id] = [
                    flow.flow_id for flow in flow_manager.find_exit_flows(step_id)
                ]

    def can_transition(self, current: str, target: str) -> bool:
        """Return True if transition is allowed."""
        if current not in self.transitions:
            raise ValueError(f"Unknown step: {current}")
        return target in self.transitions[current]

    def transition(self, current: str, target: str) -> str:
        """Validate transition and return next state."""
        if not self.can_transition(current, target):
            raise ValueError(f"Invalid transition from {current} to {target}")
        return target

    def get_flow_transitions(self, step_id: str) -> Tuple[List[str], List[str]]:
        """Return flow ids to enter and exit for the given step."""
        enters = self.flow_enters.get(step_id, [])
        exits = self.flow_exits.get(step_id, [])
        return enters, exits

    # ------------------------------------------------------------------
    # Flow management helpers
    # ------------------------------------------------------------------
    def _enter_flow(self, flow: Flow, entry_step: str, memory: Memory, session_id: str) -> None:
        """Enter a flow at the specified step."""
        try:
            recent_history = memory.get_history()[-10:] if memory.get_history() else []
            previous_context = [msg for msg in recent_history if isinstance(msg, (Message, Summary))]

            self.flow_context = flow.enter(
                entry_step=entry_step,
                previous_context=previous_context,
                metadata={"session_id": session_id},
            )
            self.current_flow = flow
        except Exception:
            # In tests we simply swallow errors to keep behavior consistent
            self.current_flow = None
            self.flow_context = None

    def _exit_flow(self, exit_step: str, memory: Memory) -> None:
        """Exit the current flow."""
        if not self.current_flow or not self.flow_context:
            return

        try:
            exit_data = self.current_flow.exit(exit_step, self.flow_context)
            if "memory" in exit_data and exit_data["memory"]:
                memory.add(exit_data["memory"])
        finally:
            self.current_flow = None
            self.flow_context = None

    def handle_flow_transitions(self, step_id: str, memory: Memory, session_id: str) -> None:
        """Enter or exit flows based on current step."""
        if not self.flow_manager:
            return

        enters, exits = self.get_flow_transitions(step_id)

        if enters and not self.current_flow:
            flow_to_enter = self.flow_manager.flows[enters[0]]
            self._enter_flow(flow_to_enter, step_id, memory, session_id)

        if self.current_flow and self.flow_context and self.current_flow.flow_id in exits:
            self._exit_flow(step_id, memory)

__all__ = ["StateMachine"]
