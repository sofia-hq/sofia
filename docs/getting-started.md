# Getting Started

## Prerequisites

- Python 3.9 or higher
- Optional: Redis or PostgreSQL for session storage
- Optional: Elastic APM for tracing

## Installation

### From PyPI

```bash
pip install nomos
```

### With CLI support

```bash
pip install nomos[cli]
```

### With LLM support

```bash
pip install nomos[openai]      # For OpenAI support
pip install nomos[mistralai]   # For Mistral AI support
pip install nomos[gemini]      # For Google Gemini support
pip install nomos[ollama]      # For Ollama support
pip install nomos[huggingface] # For HuggingFace support
\```

### With server support

```bash
pip install nomos[serve]       # For FastAPI server support
```

### With tracing support

```bash
pip install nomos[traces]      # For OpenTelemetry tracing
```

## TypeScript/JavaScript SDK

For client-side applications and web development, use our npm package:

```bash
npm install nomos-sdk
```

The TypeScript SDK provides full type safety and works in both Node.js and browser environments.

**[Complete SDK documentation and examples](../support/ts-sdk/README.md)**

### Quick Example
```typescript
import { NomosClient } from 'nomos-sdk';

const client = new NomosClient('http://localhost:8000');
const session = await client.createSession(true);
const response = await client.sendMessage(session.session_id, 'Hello!');
```

## Quick Start

NOMOS supports a spectrum of implementation approaches from no-code to low-code to full-code development.

### No-Code: Visual Flow Builder

The easiest way to get started is with our Visual Flow Builder at [nomos.dowhile.dev/try](https://nomos.dowhile.dev/try). Simply drag and drop to create your agent flows, then export the configuration.

### Initialize Your First Agent

Create a new agent project interactively:

```bash
nomos init
```

This will guide you through creating your first agent configuration.

### Run Your Agent

```bash
nomos run
```

This starts your agent in development mode with hot reloading.

## Next Steps

- Check out the [CLI Usage Guide](cli-usage.md) for detailed command documentation
- Learn about [Flow Management](flow-management.md) for organizing complex workflows
- Explore [Examples](../cookbook/examples/) to see NOMOS in action
- Read the [Configuration Guide](configuration.md) for advanced setup options
