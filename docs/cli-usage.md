# CLI Usage Guide

The Nomos CLI provides powerful commands to bootstrap, develop, and deploy your agents.

## Commands Overview

- [`nomos init`](#initialize-a-new-agent) - Create a new agent project
- [`nomos run`](#development-mode) - Run agent in development mode
- [`nomos serve`](#production-deployment) - Deploy agent with Docker
- [`nomos test`](#testing) - Run agent tests

## Initialize a New Agent

Create a new agent project interactively:

```bash
nomos init
```

### Options

- `--directory, -d`: Project directory (default: `./my-nomos-agent`)
- `--name, -n`: Agent name
- `--template, -t`: Template to use (`basic`, `conversational`, `workflow`)
- `--generate, -g`: Generate a template using AI (You are required to set the corresponding LLM API key in your environment variables, e.g., `OPENAI_API_KEY` for OpenAI)

### Examples

```bash
nomos init --directory ./my-bot --name chatbot --template basic
# or
nomos init --directory ./my-bot --name chatbot --generate
```

This will interactively guide you to create a config YAML and starter Python file for your agent.

## Development Mode

Run your agent locally for development and testing:

```bash
nomos run
```

### Options

- `--config, -c`: Configuration file path (default: `config.agent.yaml`)
- `--tools, -t`: Python files with tool definitions (can be used multiple times) - **Note: As of v0.2.4, you can now specify tools directly in your agent config file**
- `--port, -p`: Development server port (default: `8000`)
- `--verbose, -v`: Enable verbose logging

### Examples

```bash
# Basic usage (tools will be loaded from config file)
nomos run

# With custom config and tools
nomos run --config my-config.yaml --tools tools.py --tools utils.py

# With verbose logging on custom port
nomos run --verbose --port 3000
```

## Production Deployment

Serve your agent using Docker for production:

```bash
nomos serve
```

### Options

- `--config, -c`: Configuration file path (default: `config.agent.yaml`)
- `--tools, -t`: Python files with tool definitions (can be used multiple times)
- `--dockerfile, -f`: Path to custom Dockerfile
- `--env-file, -e`: Path to .env file to load environment variables
- `--tag`: Docker image tag (default: `nomos-agent`)
- `--port, -p`: Host port to bind to (default: `8000`)
- `--build/--no-build`: Build Docker image before running (default: `true`)
- `--detach/--no-detach`: Run container in detached mode (background)

### Examples

```bash
# Basic deployment
nomos serve

# With custom Dockerfile and tools
nomos serve --dockerfile custom.Dockerfile --tools tools.py

# Custom port without building
nomos serve --port 9000 --no-build

# Run in detached mode (background)
nomos serve --detach

# With environment file
nomos serve --env-file .env --detach
```

## Testing

Run tests for your agent:

```bash
nomos test
```

### Options

- `--config, -c`: Path to `tests.agent.yaml` file (defaults to `tests.agent.yaml` in the current directory)
- `--coverage/--no-coverage`: Generate coverage report (default: `true`)
- Any additional arguments are passed directly to `pytest`.

### Examples

```bash
# Run all tests
nomos test

# Provide custom yaml file and verbose output
nomos test --config ./my_tests.yaml -v

# Pass any pytest args
nomos test tests/test_cli.py -k serve
```

## Agent Testing and Evaluation

Nomos provides comprehensive testing utilities to validate your agent's responses and simulate conversations.

### Smart Assertions

Use `smart_assert` to validate agent responses using LLM-based evaluation:

```python
from nomos.testing import SessionContext, smart_assert
from nomos.models.agent import Summary, Message, StepIdentifier

def test_greeting(agent):
    context = SessionContext(
        history=[
            Summary(content="Initial summary"),
            Message(role="user", content="Hello"),
            StepIdentifier(step_id="start"),
        ]
    )
    decision, _, _ = agent.next("Hello", context.model_dump(mode="json"))
    smart_assert(decision, "Agent should greet the user", agent.llm)
```

### Scenario Testing

For multi-turn conversations, use `ScenarioRunner`:

```python
from nomos.testing.eval import ScenarioRunner, Scenario

def test_budget_flow(agent):
    ScenarioRunner.run(
        agent,
        Scenario(
            scenario="User asks for budgeting advice",
            expectation="Agent explains how to plan a budget",
        ),
    )
```

### YAML Test Configuration

You can define agent tests in a YAML file and run them with `nomos test`.
Nomos looks for `tests.agent.yaml` by default.

```yaml
llm:
  provider: openai
  model: gpt-4o-mini

unit:
  greet:
    input: "Hello"
    expectation: "Greets the user"

e2e:
  budget_flow:
    scenario: "User asks for budgeting advice"
    expectation: "Agent explains how to plan a budget"
```
