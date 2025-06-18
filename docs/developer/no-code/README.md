# No-code Development

Configure everything in YAML and reuse ready‑made tools. Great for quick
prototypes or non‑developers.

## Visual Flow Builder

Use the hosted builder at [nomos.dowhile.dev/try](https://nomos.dowhile.dev/try)
to design your flows without writing code. Export the YAML and run it with the
CLI.

## Example Config

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
