# Sofia Base Image

Official base image for building SOFIA (Simple Orchestrated Flow Intelligence Agent) agents.

## Features

- Pre-installed SOFIA agent framework
- Configurable via environment variables or mounted config files
- Built-in support for OpenAI, Mistral, and Gemini LLMs
- FastAPI-based HTTP and WebSocket endpoints
- Redis support for session management
- SQLModel-based persistent storage
- Session management with support for both Redis and PostgreSQL

## Quick Start

```bash
docker pull chandralegend/sofia-base:latest
```

Create a Dockerfile:
```dockerfile
FROM chandralegend/sofia-base:latest
COPY config.agent.yaml /app/config.agent.yaml
```

## Configuration Options

### Using URL Configuration
```bash
docker run -e OPENAI_API_KEY=your-key \
          -e CONFIG_URL=https://example.com/config.yaml \
          -p 8000:8000 your-image
```

### Using Local Configuration
```bash
docker run -e OPENAI_API_KEY=your-key \
          -v $(pwd)/config.agent.yaml:/app/config.agent.yaml \
          -p 8000:8000 your-image
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | Yes (if using OpenAI) |
| `CONFIG_URL` | URL to download agent configuration | No |
| `CONFIG_PATH` | Path to mounted configuration file | No |
| `PORT` | Server port (default: 8000) | No |
| `DATABASE_URL` | PostgreSQL connection URL | No |
| `REDIS_URL` | Redis connection URL | No |

## Storage Options

### Redis Session Store
Enable Redis session storage by setting the `REDIS_URL` environment variable:
```bash
docker run -e REDIS_URL=redis://redis:6379/0 ...
```

### PostgreSQL Database
Enable persistent storage by setting the `DATABASE_URL` environment variable:
```bash
docker run -e DATABASE_URL=postgresql+asyncpg://user:pass@localhost/dbname ...
```

## API Endpoints

- `POST /session` - Create a new session
- `POST /session/{session_id}/message` - Send a message to a session
- `WS /ws/{session_id}` - WebSocket connection for real-time interaction
- `DELETE /session/{session_id}` - End a session
- `GET /session/{session_id}/history` - Get session history

## Tags

- `latest`: Most recent stable version
- `x.y.z`: Specific version releases

## GitHub Repository

For more information, visit [SOFIA GitHub Repository](https://github.com/sofia-hq/sofia)

## License

MIT License
