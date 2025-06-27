import asyncio
from nomos.models.agent import Action


def test_async_tool_execution(async_agent, async_tool):
    session = async_agent.create_session(verbose=True)
    tool_model = async_agent.llm._create_decision_model(
        current_step=session.current_step,
        current_step_tools=[
            session.tools["long_tool"],
        ],
    )
    tool_response = tool_model(
        reasoning=["run"],
        action=Action.TOOL_CALL.value,
        tool_call={"tool_name": "long_tool", "tool_kwargs": {"wait": 0.01}},
    )
    async_agent.llm.set_response(tool_response)
    # Next should start async tool and ask to wait
    decision, _ = session.next("go")
    assert decision.action == Action.ASK
    assert "wait" in decision.response.lower()

    wait_response = tool_model(
        reasoning=["waiting"],
        action=Action.WAIT.value,
        response="waiting",
    )
    async_agent.llm.set_response(wait_response)
    decision, _ = session.next("no")
    assert decision.action == Action.WAIT

    answer_response = tool_model(
        reasoning=["done"],
        action=Action.ANSWER.value,
        response="done",
    )
    async_agent.llm.set_response(answer_response)
    asyncio.get_event_loop().run_until_complete(asyncio.sleep(0.02))
    decision, _ = session.next()
    assert decision.action == Action.ANSWER
    assert decision.response == "done"
