# Collaboration & Reliability

Nomos is built for teams. Shared YAML configs make it easy to review changes and track history in version control. The CLI can bootstrap projects so everyone starts from the same template.

For observability, enable tracing with environment variables:

```
| `ENABLE_TRACING`        | Enable OpenTelemetry tracing (`true`/`false`) |
| `ELASTIC_APM_SERVER_URL`| Elastic APM server URL                      |
```

When an error occurs the agent retries and logs detail to help debugging. Use `ScenarioRunner` and `smart_assert` to automate conversation checks as part of your CI pipeline.
