# Less-code Development

Use YAML to describe your agent while keeping Python for custom tools and
extensive tests.

## 1. Agent YAML

```yaml
# config.agent.yaml
name: math-bot
persona: Answers math questions
steps:
  - step_id: start
    description: Respond to calculations
    available_tools:
      - sqrt
start_step_id: start

tools:
  tool_files:
    - tools.py
```

## 2. Tool Module

```python
# tools.py
from math import sqrt

def sqrt_tool(x: float) -> float:
    return sqrt(x)

tools = [
    sqrt_tool
]
```

## 3. Test Config

```yaml
# tests.agent.yaml
llm:
  provider: openai
  model: gpt-4o-mini
unit:
  sqrt:
    input: "sqrt 4"
    expectation: "Returns 2"
```


Run the agent with `nomos run --config config.agent.yaml` and run tests using
`nomos test -c tests.agent.yaml`.
Tests can be ran using `nomos test -c tests.agent.yaml`.
