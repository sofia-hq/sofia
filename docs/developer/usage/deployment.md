# Deployment

Package your agent in Docker using the `chandralegend/nomos-base` image.

## Dockerfile

```Dockerfile
FROM chandralegend/nomos-base:latest
COPY config.agent.yaml /app/config.agent.yaml
COPY tools.py /app/src/tools/
CMD ["nomos", "serve", "--config", "config.agent.yaml"]
```

## Build and Run

```bash
docker build -t my-agent .
docker run -e OPENAI_API_KEY=sk-... my-agent
```

## Key Variables

```
| `OPENAI_API_KEY` | API key for your model provider |
| `CONFIG_PATH`    | Path to the agent config        |
| `ENABLE_TRACING` | Enable OpenTelemetry tracing    |
```
