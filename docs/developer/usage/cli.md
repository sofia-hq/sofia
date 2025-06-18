# 🚀 Nomos CLI Guide

Nomos ships with a command line interface that helps you bootstrap and manage agents.
This page summarises all available commands and important flags.

## Commands

### `init`
Create a new agent project interactively.

**Options**
- `--directory, -d`: Target directory for the project (defaults to `./my-nomos-agent`).
- `--name, -n`: Name of the agent.
- `--template, -t`: Starter template (`basic`, `conversational`, `workflow`).
- `--generate, -g`: Automatically generate the configuration using an LLM.
- `--usecase, -u`: Describe the use case or provide a path to a text file with the description.
- `--provider`: LLM provider to use for generation when `--generate` is enabled.
- `--model`: Specific model name to use with the provider.
- `--tools`: Comma separated tools that should be available to the agent.

### `run`
Run an agent locally for development.

**Options**
- `--config, -c`: Path to the agent config file (default `config.agent.yaml`).
- `--tools, -t`: Extra Python files with tool definitions.
- `--port, -p`: Development server port (default `8000`).
- `--verbose, -v`: Enable verbose logging.

### `serve`
Serve the agent using FastAPI and Uvicorn.

**Options**
- `--config, -c`: Path to configuration file.
- `--tools, -t`: Python files with tool definitions.
- `--port, -p`: Port to bind.
- `--workers, -w`: Number of workers for Uvicorn.

### `test`
Run the Nomos testing framework.

**Options**
- `--config, -c`: Path to `tests.agent.yaml` file.
- `--coverage/--no-coverage`: Toggle coverage report generation.
- Additional arguments are forwarded to `pytest`.

## Automatic configuration generation
Using `nomos init --generate` will ask an LLM to create the `config.agent.yaml` file for you. You can provide a description of your agent with `--usecase` and select the LLM with `--provider` and `--model`.

```bash
nomos init --generate \
  --usecase "Create a weather agent" \
  --provider openai \
  --model gpt-4o-mini
```

The above command creates a project with a ready-to-use configuration tailored to the provided description.
