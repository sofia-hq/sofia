# Collaboration & Reliability

Nomos is built with teamwork in mind. Sharing YAML config files makes reviewing
changes simple and keeps everyone on the same page. The CLI can bootstrap new
projects so each contributor starts from a common template.

## Version Control Friendly

- YAML configs can be tracked in Git or any VCS for clear history and code
  reviews.
- Multiple environments (dev, staging, prod) can share a base config with small
  overrides.

## Observability

Enable tracing to collect detailed logs and spans:

```
| `ENABLE_TRACING`        | Enable OpenTelemetry tracing (`true`/`false`) |
| `ELASTIC_APM_SERVER_URL`| Elastic APM server URL                      |
```

## Continuous Testing

When an error occurs the agent retries and logs useful details. Combine
`ScenarioRunner` and `smart_assert` in your CI pipeline to automatically validate
conversations across updates.
