# Full-code Development

In the fullcode workflow you write everything in Python:

- **Steps and flows** are created with the `Step` and `FlowConfig` classes.
- **Tools** are regular Python functions registered with the agent.
- **Tests** use the `smart_assert` helpers directly in Python.

```python
from nomos import Nomos, Step
from nomos.testing import smart_assert

# define tools
def get_time():
    from datetime import datetime
    return str(datetime.utcnow())

# define steps
steps = [
    Step(step_id="start", description="Tell the time", available_tools=["get_time"])
]

agent = Nomos(name="clock", llm=None, steps=steps, tools=[get_time], start_step_id="start")

def test_start():
    decision, *_ = agent.next("time?", {})
    smart_assert(decision, "Agent tells the time", agent.llm)
```
