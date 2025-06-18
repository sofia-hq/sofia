# Deployment

Use the Docker base image `chandralegend/nomos-base` to containerize your agent.

Example Dockerfile:

```
FROM chandralegend/nomos-base:latest
COPY config.agent.yaml /app/config.agent.yaml
COPY tools.py /app/src/tools/
```

Runtime variables:

```
| `OPENAI_API_KEY` | OpenAI API key |
| `CONFIG_PATH` | Path to the agent config |
| `ENABLE_TRACING` | Enable OpenTelemetry tracing |
```
