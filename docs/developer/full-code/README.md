# Full-code Development

Write every part of your agent in Python for maximum flexibility. Use this mode
when you want tight control over logic, tools and tests.

## Structure

- **Steps and flows** are created with the `Step` and `FlowConfig` classes.
- **Tools** are regular Python functions that you register with the agent.
- **Tests** use the `smart_assert` helpers directly in Python.

## Example

```python
from nomos import Nomos, Step
from nomos.testing import smart_assert

def get_time() -> str:
    from datetime import datetime
    return str(datetime.utcnow())

steps = [
    Step(step_id="start", description="Tell the time", available_tools=["get_time"])
]

agent = Nomos(name="clock", llm=None, steps=steps, tools=[get_time], start_step_id="start")

def test_start():
    decision, *_ = agent.next("time?", {})
    smart_assert(decision, "Agent tells the time", agent.llm)
```
