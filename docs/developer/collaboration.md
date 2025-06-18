# Collaboration & Reliability

Nomos provides built‑in tracing and error handling. Environment variables can enable OpenTelemetry integration:

```
| `ENABLE_TRACING` | Enable OpenTelemetry tracing (`true`/`false`) |
| `ELASTIC_APM_SERVER_URL` | Elastic APM server URL |
```

Testing helpers such as `smart_assert` and `ScenarioRunner` let you validate conversations programmatically.
