# Testing

Nomos offers utilities for evaluating agent interactions.

## Smart Assertions

```
smart_assert(decision, "Agent should greet the user", agent.llm)
```

## Scenario Testing

```
ScenarioRunner.run(agent, Scenario(scenario="User asks for budgeting advice"))
```
