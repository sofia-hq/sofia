from nomos.models.agent import create_decision_model, Action
from nomos.models.tool import Tool
from nomos.testing.eval import ScenarioRunner, Scenario, SimulationDecision, NextInput
from nomos.testing import AssertionResult


def test_scenario_runner(basic_agent, test_tool_0, test_tool_1, mock_llm):
    start_step = basic_agent.steps["start"]
    tools = [
        Tool.from_function(test_tool_0),
        Tool.from_function(test_tool_1),
        Tool.from_pkg("itertools:combinations"),
    ]

    start_model = create_decision_model(current_step=start_step, current_step_tools=tools)
    mock_llm.set_response(
        start_model(reasoning=["start"], action=Action.MOVE.value, step_transition="end")
    )

    end_step = basic_agent.steps["end"]
    end_model = create_decision_model(current_step=end_step, current_step_tools=[])
    mock_llm.set_response(
        end_model(reasoning=["end"], action=Action.END.value),
        append=True,
    )

    mock_llm.set_response(AssertionResult(reasoning=["ok"], success=True), append=True)

    mock_llm.set_response(
        NextInput(
            reasoning=["stop"],
            decision=SimulationDecision.CONTINUE,
            input="done",
        ),
        append=True,
    )

    scenario = Scenario(
        scenario="User asks for the weather",
        expectation="Agent should respond with the current weather information",
    )

    history = ScenarioRunner.run(basic_agent, scenario)
    assert len(history) == 1
    assert history[0]["current_step_id"] == "end"
