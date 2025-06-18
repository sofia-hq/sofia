# No-code Development

In the no-code workflow everything is configured in YAML. You rely on built-in CrewAI or package tools.

- **Agent config** lists steps, flows and tool references using the `pkg` tool wrapper.
- **Test config** defines unit and scenario tests in YAML.

Example snippet:
```yaml
name: support-bot
persona: Helpful assistant
steps:
  - step_id: start
    description: Answer FAQs
    available_tools:
      - crewai.search_web
start_step_id: start
```

Run with `nomos serve --config config.agent.yaml`.
