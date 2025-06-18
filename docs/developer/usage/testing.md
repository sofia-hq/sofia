# Testing

Nomos includes helpers for validating conversations.

## Smart Assertions

```python
from nomos.testing import smart_assert
smart_assert(decision, "Agent should greet the user", agent.llm)
```

## Scenario Testing

```python
from nomos.testing.eval import ScenarioRunner, Scenario
ScenarioRunner.run(agent, Scenario(scenario="User asks for budgeting advice"))
```

## YAML Test Files

Define tests in `tests.agent.yaml` and run `nomos test`.

```yaml
llm:
  provider: openai
  model: gpt-4o-mini
unit:
  hello:
    input: "hello"
    expectation: "Greets the user"
```
