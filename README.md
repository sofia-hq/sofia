<!-- Announcement Bar -->
<div align="center" style="margin-bottom: 1.5em;">
  <div style="
    display: inline-block;
    background: #222;
    color: #fff;
    font-weight: 500;
    padding: 0.5em 2em;
    font-size: 1em;
    margin-bottom: 1em;
    border-radius: 999px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    border: 1px solid #222;
  ">
    🚀 <b>SOFIA v0.1.12 released!</b> &nbsp;|&nbsp; Enhanced error handling, improved session management, and more. <a href="https://github.com/poly-eye/sofia/releases" style="color:#fff;text-decoration:underline;">See what's new →</a>
  </div>
</div>
<div align="center">
<a href="https://github.com/dowhiledev/sofia"><img src="https://i.ibb.co/WWczLZMd/SOFIA-logo.png" alt="sofia"  width="400"></a>

### **S**imple **O**rchestrated **F**low **I**ntelligence **A**gent

![PyPI - Version](https://img.shields.io/pypi/v/sofia-agent) [![codecov](https://codecov.io/gh/chandralegend/sofia/graph/badge.svg?token=MXRK9HGE5R)](https://codecov.io/gh/chandralegend/sofia) [![Test](https://github.com/poly-eye/sofia/actions/workflows/test.yml/badge.svg)](https://github.com/poly-eye/sofia/actions/workflows/test.yml) [![Release](https://github.com/poly-eye/sofia/actions/workflows/publish.yml/badge.svg)](https://github.com/poly-eye/sofia/actions/workflows/publish.yml) [![Docker Image Version](https://img.shields.io/docker/v/chandralegend/sofia-base)](https://hub.docker.com/r/chandralegend/sofia-base) [![License](https://img.shields.io/github/license/poly-eye/sofia)](LICENSE)

</div>

SOFIA is an open-source, configurable multi-step agent framework for building advanced LLM-powered assistants. Define your agent's persona, tools, and step-by-step flows in Python or YAML—perfect for conversational, workflow, and automation use cases.

## Features

- **Step-based agent flows**: Define agent behavior as a sequence of steps, each with its own tools and transitions.
- **Persona-driven**: Easily set the agent's persona for consistent, branded responses.
- **Tool integration**: Register Python functions as tools for the agent to call.
- **Package-based tools**: Reference Python package functions directly using `package_name:function` syntax.
- **Auto tool documentation**: Tool descriptions and parameter documentation are automatically generated from docstrings.
- **YAML or Python config**: Configure agents via code or declarative YAML.
- **Step-level answer models**: Specify an `answer_model` for any step to receive structured (JSON/object) responses from the agent, enabling UIs and clients to render rich, custom layouts or workflows based on structured data, not just plain text.
- **OpenAI, Mistral, and Gemini LLM support**
- **Session management**: Save and resume conversations with Redis or PostgreSQL persistent storage.
- **Advanced error handling**: Built-in error recovery mechanisms with configurable retry limits.
- **API integration**: Ready-to-use FastAPI endpoints for web and WebSocket interaction.
- **Elastic APM tracing**: Built-in support for distributed tracing and monitoring.
- **Docker deployment**: Pre-built base image for rapid deployment.
- **Extensible**: Build your own tools, steps, and integrations.
- **Interactive CLI**: Bootstrap new agents with `sofia init` (install with `[cli]` extra).

## Installation

### From PyPI

```bash
pip install sofia-agent
```

### With CLI support

```bash
pip install sofia-agent[cli]
```

### With LLM support

```bash
pip install sofia-agent[openai]      # For OpenAI support
pip install sofia-agent[mistralai]   # For Mistral AI support
pip install sofia-agent[gemini]      # For Google Gemini support
```

### With tracing support

```bash
pip install sofia-agent[traces]
```

## Usage: From No-Code to Low-Code to Full Code

### CLI: Bootstrap a New Agent

```bash
sofia init
```

This will interactively guide you to create a config YAML and starter Python file for your agent.

### Python API Example

```python
from sofia_agent import *
from sofia_agent.llms import OpenAIChatLLM

def get_time():
    """Get the current time.

    Returns:
        str: The current time in string format.
    """
    from datetime import datetime
    return f"Current time: {datetime.now()}"

steps = [
    Step(
        step_id="start",
        description="Greet and offer to tell the time or perform calculations.",
        available_tools=["get_time", "math:sqrt"],  # Direct reference to the sqrt function from math package
        routes=[Route(target="end", condition="User is done")],
    ),
    Step(
        step_id="end",
        description="Say goodbye.",
    ),
]

llm = OpenAIChatLLM()
agent = Sofia(
    name="clockbot",
    llm=llm,
    steps=steps,
    start_step_id="start",
    tools=[get_time, "math:sqrt"],  # Mix of custom functions and package references (Optional for package functions)
    persona="You are a friendly assistant that can tell time and perform calculations.",
    max_errors=3  # Will retry up to 3 times before failing
    max_iter=5,  # Maximum number of iterations (tool calls, step transitions, error_handling) allowed in a single interaction
)
sess = agent.create_session()
# ... interact with sess.next(user_input)
```

### Error Handling

SOFIA provides a configurable error handling mechanism:

```python
# Configure the maximum number of consecutive errors before stopping
agent = Sofia(
    name="robust-agent",
    # ... other parameters
    max_errors=5  # Default is 3
)

# Handle tool errors gracefully
try:
    decision, result = session.next(user_input)
except ValueError as e:
    # Handle error (e.g., maximum errors reached)
    print(f"Error: {e}")
except RecursionError as e:
    # Handle recursion error (e.g., too many iterations)
    # Your fallback logic here
    print(f"Recursion error: {e}")
```

The agent will automatically retry on errors and provides informative error messages in the session history.

### YAML Config Example

```yaml
name: utility-bot
persona: You are a helpful utility bot that can perform various calculations and data operations.
steps:
  - step_id: start
    description: Handle user requests for mathematical operations or data processing.
    available_tools:
      - math:sqrt
      - json:loads
      - itertools:combinations
    routes:
      - target: end
        condition: User is done with calculations
  - step_id: end
    description: Say goodbye to the user.
start_step_id: start
max_errors: 3  # Maximum consecutive errors before stopping
```

See [`examples/config.barista.yaml`](examples/config.barista.yaml) for a more full-featured example.

## LLM Support

SOFIA supports multiple LLM providers out of the box:

### OpenAI

```python
from sofia_agent.llms import OpenAIChatLLM

llm = OpenAIChatLLM(
    model="gpt-4o",  # Optional, defaults to "gpt-4o-mini"
    api_key="your-api-key"  # Optional, defaults to OPENAI_API_KEY env var
)
```

### Mistral AI

```python
from sofia_agent.llms import MistralChatLLM

llm = MistralChatLLM(
    model="mistral-medium",  # Optional
    api_key="your-api-key"  # Optional, defaults to MISTRAL_API_KEY env var
)
```

### Google Gemini

```python
from sofia_agent.llms import GeminiLLM

llm = GeminiLLM(
    model="gemini-pro",  # Optional
    api_key="your-api-key"  # Optional, defaults to GOOGLE_API_KEY env var
)
```

You can also specify LLM configuration in your YAML config:

```yaml
name: my-agent
llm:
  provider: openai
  model: gpt-4o
# ...rest of config
```

## Configuration

- **Persona**: Set in YAML or Python for consistent agent style.
- **Steps**: Each step defines available tools, description, and routes to other steps.
- **Tools**: Python functions registered with the agent or package references.

## Package Tool Integration

SOFIA now allows you to reference Python package functions directly using the `package_name:function` syntax:

```python
# Reference a function from a standard library
"math:sqrt"                      # Standard library function
"json:loads"                     # Another standard library function
"itertools:combinations"         # Complex functions work too!

# Reference nested module functions
"package_name:module.submodule.function"
```

Benefits of package tool integration:

1. **No-code/low-code development**: Use existing Python functions without writing wrapper code
2. **Automatic documentation**: Function docstrings are used to generate tool descriptions and parameter documentation
3. **Simplified configuration**: Easily reference any Python function in your environment

Tool parameter descriptions in configuration files take precedence over automatically extracted docstring descriptions.

> **NOTE**: Make sure the package is installed in your environment and function returns an output that is string representable.

## Example: Barista Agent

A full example is provided in [`examples/barista/barista.py`](examples/barista.py) and [`examples/config.barista.yaml`](examples/config.barista.yaml).

To run the Barista agent:

```bash
cd examples/barista
export OPENAI_API_KEY=your-api-key-here
python barista.py
# or
python barista_with_config.py
```

## Example: Financial Planning Assistant

A production-ready example of a Financial Planning Assistant is available in [`examples/financial-advisor/`](examples/financial-advisor/). This example demonstrates:

- Budget planning and expense tracking
- Savings goal management
- Financial health assessment
- Uses the sofia-base Docker image
- Production-ready configuration

To run the Financial Planning Assistant:

```bash
docker run -e OPENAI_API_KEY=your-api-key-here -p 8000:8000 financial-advisor
```

## Docker Base Image

SOFIA provides a base Docker image that you can use to quickly containerize your agents. The base image is available on Docker Hub as `chandralegend/sofia-base`.

To use the base image in your own agent:

1. Create a Dockerfile:

```dockerfile
FROM chandralegend/sofia-base:latest

# Copy your config file
COPY config.agent.yaml /app/config.agent.yaml

# Copy your tools
COPY tools.py /app/tools/
```

2. Build and run your container:

```bash
docker build -t my-sofia-agent .
docker run -e OPENAI_API_KEY=your-api-key-here -p 8000:8000 my-sofia-agent
```

The base image supports configuration via environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | Yes (if using OpenAI) |
| `CONFIG_URL` | URL to download agent configuration | No |
| `CONFIG_PATH` | Path to mounted configuration file | No |
| `PORT` | Server port (default: 8000) | No |
| `DATABASE_URL` | PostgreSQL connection URL | No |
| `REDIS_URL` | Redis connection URL | No |
| `ENABLE_TRACING` | Enable OpenTelemetry tracing (`true`/`false`) | No |
| `ELASTIC_APM_SERVER_URL` | Elastic APM server URL | If tracing enabled |
| `ELASTIC_APM_TOKEN` | Elastic APM Token | If tracing enabled |
| `SERVICE_NAME` | Service name for tracing | No (default: `sofia-agent`) |
| `SERVICE_VERSION` | Service version for tracing | No (default: `1.0.0`) |

## Tracing and Elastic APM Integration

SOFIA now supports distributed tracing using [OpenTelemetry](https://opentelemetry.io/) and can export traces to [Elastic APM](https://www.elastic.co/apm/).

### Enabling Tracing

To enable tracing, set the following environment variables:

| Variable                  | Description                                      | Required                |
|---------------------------|--------------------------------------------------|-------------------------|
| `ENABLE_TRACING`          | Enable OpenTelemetry tracing (`true`/`false`)    | No (default: `false`)   |
| `ELASTIC_APM_SERVER_URL`  | Elastic APM server URL (e.g. `http://localhost:8200`) | If tracing enabled      |
| `ELASTIC_APM_TOKEN`       | Elastic APM Token                              | If tracing enabled      |
| `SERVICE_NAME`            | Service name for tracing                         | No (default: `sofia-agent`) |
| `SERVICE_VERSION`         | Service version for tracing                      | No (default: `1.0.0`)   |

### Example: Running with Tracing Enabled

```bash
docker run \
  -e ENABLE_TRACING=true \
  -e ELASTIC_APM_SERVER_URL=http://your-apm-server:8200 \
  -e ELASTIC_APM_TOKEN=your-apm-token \
  -e SERVICE_NAME=my-sofia-agent \
  -e SERVICE_VERSION=1.0.0 \
  -e OPENAI_API_KEY=your-openai-key \
  -p 8000:8000 my-sofia-agent
```

When tracing is enabled, SOFIA will automatically instrument agent sessions, tool calls, and LLM interactions, and send trace data to your Elastic APM instance.

## Persistent Storage and Session Management

SOFIA base image supports multiple options for session storage:

### In-Memory Storage

The default storage mechanism is in-memory, which does not persist sessions between container restarts.

### Redis Session Storage

For caching and distributed deployments, you can use Redis as a session store:

```bash
docker run \
  -e REDIS_URL=redis://redis:6379/0 \
  -e OPENAI_API_KEY=your-openai-key \
  -p 8000:8000 my-sofia-agent
```

### PostgreSQL Persistent Storage

For fully persistent sessions that survive container restarts:

```bash
docker run \
  -e DATABASE_URL=postgresql+asyncpg://user:pass@postgres/dbname \
  -e OPENAI_API_KEY=your-openai-key \
  -p 8000:8000 my-sofia-agent
```

## API Endpoints

SOFIA base image provides the following REST and WebSocket endpoints:

### Server-side Session Management

- `POST /session` - Create a new session
- `POST /session/{session_id}/message` - Send a message to a session
- `WS /ws/{session_id}` - WebSocket connection for real-time interaction
- `DELETE /session/{session_id}` - End a session
- `GET /session/{session_id}/history` - Get session history

### Client-side Session Management

- `POST /chat` - Stateless chat endpoint where the client maintains session state
  ```json
  // Request format
  {
    "user_input": "Hello, how are you?",
    "session_data": {
      "session_id": "unique-id",
      "current_step_id": "start",
      "history": []
    }
  }

  // Response format
  {
    "response": {
      "action": "answer",
      "input": "I'm doing well, how can I help you today?"
    },
    "tool_output": null,
    "session_data": {
      "session_id": "unique-id",
      "current_step_id": "start",
      "history": [...]
    }
  }
  ```

For more details, see the [base image README](tools/base-image/README.md).

## Contributing

Contributions are welcome! Please open issues or pull requests on GitHub.

## From No-Code to Low-Code Evolution

SOFIA is evolving to support a spectrum of implementation approaches:

### No-Code

- Configure agents entirely through YAML
- Reference existing Python functions using `package_name:function` syntax
- Auto-documentation from function docstrings

### Low-Code

- Minimal Python code for custom tools
- Mix pre-existing package tools with custom tools
- Configure complex behaviors with minimal coding

### Full-Code

- Complete control over agent implementation
- Custom tool development
- Advanced integrations and behaviors

This flexibility allows both non-programmers and experienced developers to create sophisticated AI agents that suit their needs.

## License

MIT License. See [LICENSE](LICENSE).

## Acknowledgements

- Inspired by the open-source LLM community.
- Built with ❤️ by contributors.
