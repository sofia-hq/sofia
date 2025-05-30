"""Command Line Interface for Nomos."""

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import List, Optional

import docker
from docker.errors import BuildError, DockerException

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich.table import Table
from rich.text import Text

import typer

from .llms import LLMConfig
from .utils.generator import AgentConfiguration, AgentGenerator


console = Console()
app = typer.Typer(
    name="nomos",
    help="Nomos CLI - Configurable multi-step agent framework for building advanced LLM-powered assistants",
    add_completion=False,
)

# Color constants for consistent styling
PRIMARY_COLOR = "cyan"
SUCCESS_COLOR = "green"
WARNING_COLOR = "yellow"
ERROR_COLOR = "red"


def print_banner() -> None:
    """Print the Nomos banner."""
    banner = Text("🏛️ NOMOS", style=f"bold {PRIMARY_COLOR}")
    subtitle = Text("Configurable multi-step agent framework", style="dim")
    console.print()
    console.print(banner, justify="center")
    console.print(subtitle, justify="center")
    console.print()


@app.command()
def init(
    directory: Optional[str] = typer.Option(
        None, "--directory", "-d", help="Directory to create the agent project in"
    ),
    name: Optional[str] = typer.Option(None, "--name", "-n", help="Name of the agent"),
    template: Optional[str] = typer.Option(
        "basic",
        "--template",
        "-t",
        help="Template to use (basic, conversational, workflow)",
    ),
    generate: bool = typer.Option(
        False, "--generate", "-g", help="Generate agent configuration using AI"
    ),
    usecase: Optional[str] = typer.Option(
        None, "--usecase", "-u", help="Use case description or path to text file"
    ),
    tools: Optional[str] = typer.Option(
        None, "--tools", help="Comma-separated list of available tools"
    ),
) -> None:
    r"""Initialize a new Nomos agent project interactively.

    Examples:\n
    # Traditional interactive setup\n
    nomos init\n
    # AI-powered generation from use case\n
    nomos init --generate --usecase "Create a weather agent" --tools "weather_api"\n
    # Load use case from file\n
    nomos init --generate --usecase "./my_usecase.txt" --provider openai --model gpt-4o-mini
    """
    print_banner()

    console.print(
        Panel(
            "Welcome to Nomos! Let's create your new agent project.",
            title="Project Initialization",
            border_style=PRIMARY_COLOR,
        )
    )

    # Get target directory
    if not directory:
        directory = Prompt.ask("📁 Project directory", default="./my-nomos-agent")

    target_dir = Path(directory).resolve()  # type: ignore

    if target_dir.exists() and any(target_dir.iterdir()):  # noqa
        if not Confirm.ask(
            f"Directory [bold]{target_dir}[/bold] already exists and is not empty. Continue?"
        ):
            console.print("❌ Project initialization cancelled.", style=ERROR_COLOR)
            raise typer.Exit(1)

    target_dir.mkdir(parents=True, exist_ok=True)

    # Get agent name
    if not name:
        name = Prompt.ask(
            "🤖 Agent name", default=target_dir.name.replace("-", "_").replace(" ", "_")
        )

    # Get agent persona
    persona = Prompt.ask(
        "🎭 Agent persona (describe your agent's role and personality)",
        default="You are a helpful assistant.",
    )

    # Choose LLM provider
    llm_choices = ["OpenAI", "Mistral", "Gemini", "Custom"]
    llm_table = Table(title="Choose LLM Provider")
    llm_table.add_column("Option", style=PRIMARY_COLOR)
    llm_table.add_column("Provider")

    for i, choice in enumerate(llm_choices, 1):
        llm_table.add_row(str(i), choice)

    console.print(llm_table)

    llm_choice_idx = (
        int(
            Prompt.ask(
                "🧠 Select LLM provider",
                choices=[str(i) for i in range(1, len(llm_choices) + 1)],
                default="1",
            )
        )
        - 1
    )

    llm_choice = llm_choices[llm_choice_idx]

    # Handle AI generation or traditional step collection
    steps = []

    # Add default steps based on template
    if template == "basic":
        steps = [
            {
                "step_id": "start",
                "description": "Greet the user and understand their needs",
                "available_tools": [],
                "routes": [{"target": "help", "condition": "User needs assistance"}],
            },
            {
                "step_id": "help",
                "description": "Provide assistance to the user",
                "available_tools": [],
                "routes": [{"target": "end", "condition": "Task completed"}],
            },
            {
                "step_id": "end",
                "description": "End the conversation politely",
                "available_tools": [],
                "routes": [],
            },
        ]

    # Generate project files
    _generate_project_files(target_dir, name, persona, llm_choice, steps)  # type: ignore

    if not generate:
        generate = Confirm.ask(
            "🤖 Would you like to generate the agent configuration using AI?",
            default=True,
        )

    if generate:
        provider = Prompt.ask(
            "Choose one of the following LLM providers you would like to use for generation",
            choices=["openai", "mistral", "google"],
            default=None,
        )
        model = Prompt.ask(
            "Mention the model you would like to use for generation", default=None
        )
        usecase = Prompt.ask(
            "Please provide a use case description or path to a text file containing the use case",
            default="Create a weather agent",
        )
        tools = Prompt.ask(
            "Mention the tools available for the agent (comma-separated, e.g. weather_api, calculator)",
            default=None,
        )
        generated_config = _handle_config_generation(
            usecase=usecase, provider=provider, model=model, tools=tools  # type: ignore
        )
        if generated_config:
            config_path = target_dir / "config.agent.yaml"
            generated_config.dump(str(config_path.absolute()))
            console.print(
                f"📄 Generated configuration saved to [bold]{config_path}[/bold]",
                style=SUCCESS_COLOR,
            )

    console.print(
        Panel(
            f"✅ Project created successfully in [bold]{target_dir}[/bold]",
            title="Success",
            border_style=SUCCESS_COLOR,
        )
    )

    # Show next steps
    next_steps = f"""
📁 Navigate to your project: [bold]cd {target_dir}[/bold]
🔧 Edit configuration: [bold]config.agent.yaml[/bold]
🛠️ Add tools: [bold]tools/[/bold] directory
🏃 Run development mode: [bold]nomos run[/bold]
🚀 Serve with Docker: [bold]nomos serve[/bold]
"""

    console.print(
        Panel(next_steps.strip(), title="Next Steps", border_style=PRIMARY_COLOR)
    )


@app.command()
def run(
    config: Optional[str] = typer.Option(
        "config.agent.yaml", "--config", "-c", help="Path to agent configuration file"
    ),
    tools: Optional[List[str]] = typer.Option(
        None,
        "--tools",
        "-t",
        help="Python files containing tool definitions (can be used multiple times)",
    ),
    port: int = typer.Option(
        8000, "--port", "-p", help="Port to run the development server on"
    ),
    verbose: bool = typer.Option(
        False, "--verbose", "-v", help="Enable verbose logging"
    ),
) -> None:
    """Run the Nomos agent in development mode."""
    print_banner()

    config_path = Path(config)  # type: ignore

    # Validate config file exists
    if not config_path.exists():
        console.print(
            f"❌ Configuration file not found: [bold]{config_path}[/bold]",
            style=ERROR_COLOR,
        )
        raise typer.Exit(1)

    # Validate tool files exist
    tool_files = []
    if tools:
        for tool_file in tools:
            tool_path = Path(tool_file)
            if not tool_path.exists():
                console.print(
                    f"❌ Tool file not found: [bold]{tool_path}[/bold]",
                    style=ERROR_COLOR,
                )
                raise typer.Exit(1)
            tool_files.append(tool_path)

    console.print(
        Panel(
            f"🏃 Starting development server on port [bold]{port}[/bold]",
            title="Development Mode",
            border_style=PRIMARY_COLOR,
        )
    )

    try:
        # Setup temporary tools directory and run the agent
        _run_development_server(config_path, tool_files, port, verbose)
    except KeyboardInterrupt:
        console.print("\n👋 Development server stopped.", style=WARNING_COLOR)
    except Exception as e:
        console.print(f"❌ Error running development server: {e}", style=ERROR_COLOR)
        raise typer.Exit(1)


@app.command()
def serve(
    config: Optional[str] = typer.Option(
        "config.agent.yaml", "--config", "-c", help="Path to agent configuration file"
    ),
    tools: Optional[List[str]] = typer.Option(
        None,
        "--tools",
        "-t",
        help="Python files containing tool definitions (can be used multiple times)",
    ),
    dockerfile: Optional[str] = typer.Option(
        None, "--dockerfile", "-f", help="Path to custom Dockerfile"
    ),
    env_file: Optional[str] = typer.Option(
        None, "--env-file", "-e", help="Path to .env file to load environment variables"
    ),
    tag: Optional[str] = typer.Option("nomos-agent", "--tag", help="Docker image tag"),
    port: int = typer.Option(8000, "--port", "-p", help="Host port to bind to"),
    build: bool = typer.Option(
        True, "--build/--no-build", help="Build Docker image before running"
    ),
    detach: bool = typer.Option(
        False,
        "--detach/--no-detach",
        help="Run container in detached mode (background)",
    ),
) -> None:
    """Serve the Nomos agent using Docker.

    This command builds and runs the agent in a Docker container. By default,
    the container runs in the foreground, but you can use --detach to run it
    in the background.
    """
    print_banner()

    config_path = Path(config)  # type: ignore

    if not config_path.exists():
        console.print(
            f"❌ Configuration file not found: [bold]{config_path}[/bold]",
            style=ERROR_COLOR,
        )
        raise typer.Exit(1)

    # Validate tool files exist
    tool_files = []
    if tools:
        for tool_file in tools:
            tool_path = Path(tool_file)
            if not tool_path.exists():
                console.print(
                    f"❌ Tool file not found: [bold]{tool_path}[/bold]",
                    style=ERROR_COLOR,
                )
                raise typer.Exit(1)
            tool_files.append(tool_path)

    # Validate env file exists if provided
    env_file_path = None
    if env_file:
        env_file_path = Path(env_file)
        if not env_file_path.exists():
            console.print(
                f"❌ Environment file not found: [bold]{env_file_path}[/bold]",
                style=ERROR_COLOR,
            )
            raise typer.Exit(1)

    console.print(
        Panel(
            f"🐳 Serving agent with Docker on port [bold]{port}[/bold]",
            title="Docker Serve",
            border_style=PRIMARY_COLOR,
        )
    )

    try:
        _serve_with_docker(config_path, tool_files, dockerfile, env_file_path, tag, port, build, detach)  # type: ignore
    except KeyboardInterrupt:
        console.print("\n👋 Docker serve stopped.", style=WARNING_COLOR)
    except Exception as e:
        console.print(f"❌ Error serving with Docker: {e}", style=ERROR_COLOR)
        raise typer.Exit(1)


@app.command()
def test(
    pattern: Optional[str] = typer.Option(
        "test_*.py", "--pattern", "-p", help="Test file pattern to match"
    ),
    verbose: bool = typer.Option(
        False, "--verbose", "-v", help="Enable verbose test output"
    ),
    coverage: bool = typer.Option(
        True, "--coverage/--no-coverage", help="Generate coverage report"
    ),
) -> None:
    """Run the Nomos testing framework."""
    print_banner()

    console.print(
        Panel(
            "🧪 Running Nomos agent tests",
            title="Testing Framework",
            border_style=PRIMARY_COLOR,
        )
    )

    try:
        _run_tests(pattern, verbose, coverage)  # type: ignore
    except Exception as e:
        console.print(f"❌ Error running tests: {e}", style=ERROR_COLOR)
        raise typer.Exit(1)


def _generate_project_files(
    target_dir: Path, name: str, persona: str, llm_choice: str, steps: List[dict]
) -> None:
    """Generate project files for the new agent."""
    # Generate config.agent.yaml
    config_content = f"""# Nomos Agent Configuration
name: {name}
persona: |
  {persona}
start_step_id: {steps[0]['step_id'] if steps else 'start'}

steps:
"""

    for step in steps:
        config_content += f"""  - step_id: {step['step_id']}
    description: |
      {step['description']}
"""
        if step["available_tools"]:
            config_content += "    available_tools:\n"
            for tool in step["available_tools"]:
                config_content += f"      - {tool}\n"

        if step["routes"]:
            config_content += "    routes:\n"
            for route in step["routes"]:
                config_content += f"""      - target: {route['target']}
        condition: {route['condition']}
"""

    # Write config file
    with open(target_dir / "config.agent.yaml", "w") as f:
        f.write(config_content)

    # Create tools directory
    tools_dir = target_dir / "tools"
    tools_dir.mkdir(exist_ok=True)

    # Generate tools/__init__.py (similar to base-image structure)
    tools_init_content = '''"""This module imports all tools from the tools directory and makes them available in a list."""

import os

tool_list: list = []

for filename in os.listdir(os.path.dirname(__file__)):
    if filename.endswith(".py") and filename != "__init__.py":
        module_name = filename[:-3]  # Remove the .py extension
        try:
            module = __import__(f"tools.{module_name}", fromlist=[""])
            tool_list.extend(getattr(module, "tools", []))
        except ImportError as e:
            print(f"Warning: Could not import {module_name}: {e}")

__all__ = ["tool_list"]
'''

    with open(tools_dir / "__init__.py", "w") as f:
        f.write(tools_init_content)

    # Generate sample tool file
    sample_tool_content = f'''"""Sample tools for {name} agent."""

def sample_tool(query: str) -> str:
    """
    A sample tool that echoes the input query.

    Args:
        query: The input query to echo

    Returns:
        The echoed query with a prefix
    """
    return f"You said: {{query}}"


def get_current_time() -> str:
    """
    Get the current time as a string.

    Returns:
        Current time in ISO format
    """
    from datetime import datetime
    return datetime.now().isoformat()


# Export tools for discovery
tools = [sample_tool, get_current_time]
'''

    with open(tools_dir / "sample_tools.py", "w") as f:
        f.write(sample_tool_content)

    # Generate main.py for development
    main_content = f'''"""Main entry point for {name} agent."""

import os
import sys
from pathlib import Path

# Add tools directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

import nomos
from nomos.llms.openai import OpenAI
from tools import tool_list


def main():
    """Run the agent interactively."""
    # Load configuration
    config_path = Path(__file__).parent / "config.agent.yaml"
    config = nomos.AgentConfig.from_yaml(str(config_path))

    # Initialize LLM
    llm = OpenAI()  # Requires OPENAI_API_KEY environment variable

    # Create agent
    agent = nomos.Agent.from_config(config, llm, tool_list)

    # Create session
    session = agent.create_session(verbose=True)

    print(f"🤖 {{config.name}} agent is ready! Type 'quit' to exit.\\n")
    print(f"Available tools: {{[tool.__name__ if callable(tool) else str(tool) for tool in tool_list]}}\\n")

    while True:
        try:
            user_input = input("You: ").strip()
            if user_input.lower() in ['quit', 'exit', 'bye']:
                print("👋 Goodbye!")
                break

            if not user_input:
                continue

            decision, _ = session.next(user_input)

            if hasattr(decision, 'response') and decision.response:
                print(f"🤖 {{config.name}}: {{decision.response}}")

        except KeyboardInterrupt:
            print("\\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {{e}}")


if __name__ == "__main__":
    main()
'''

    with open(target_dir / "main.py", "w") as f:
        f.write(main_content)

    # Generate Dockerfile
    dockerfile_content = """FROM chandralegend/nomos-base:latest

# Copy configuration and tools
COPY config.agent.yaml /app/config.agent.yaml
COPY tools/ /app/tools/

# Expose port
EXPOSE 8000

# The base image already has the entrypoint configured
"""

    with open(target_dir / "Dockerfile", "w") as f:
        f.write(dockerfile_content)

    # Generate requirements.txt
    requirements_content = f"""nomos[{llm_choice.lower()}]>=0.1.13
"""

    with open(target_dir / "requirements.txt", "w") as f:
        f.write(requirements_content)

    # Generate .env.example
    env_content = """# Environment variables for your Nomos agent

# LLM API Keys (uncomment the one you're using)
# OPENAI_API_KEY=your_openai_api_key_here
# MISTRAL_API_KEY=your_mistral_api_key_here
# GOOGLE_API_KEY=your_google_api_key_here

# Server configuration
PORT=8000

# Optional: Database configuration for persistent sessions
# DATABASE_URL=postgresql+asyncpg://user:password@localhost/dbname
# REDIS_URL=redis://localhost:6379/0

# Optional: Tracing configuration
# ENABLE_TRACING=true
# ELASTIC_APM_SERVER_URL=http://localhost:8200
# ELASTIC_APM_TOKEN=your_apm_token
# SERVICE_NAME=my-nomos-agent
# SERVICE_VERSION=1.0.0

# To use this .env file with Docker:
# 1. Copy this file to .env: cp .env.example .env
# 2. Fill in your actual values above
# 3. Run: nomos serve --env-file .env
"""

    with open(target_dir / ".env.example", "w") as f:
        f.write(env_content)

    # Generate README.md
    readme_content = f"""# {name.title()} Agent

A Nomos agent for {persona.lower()}.

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Run in development mode:**
   ```bash
   nomos run
   ```

4. **Or run directly:**
   ```bash
   python main.py
   ```

## Docker Deployment

1. **Build and serve with Docker:**
   ```bash
   nomos serve
   ```

2. **Or with environment variables:**
   ```bash
   nomos serve --env-file .env
   ```

3. **Or manually:**
   ```bash
   docker build -t {name}-agent .
   docker run -e OPENAI_API_KEY=your_key -p 8000:8000 {name}-agent
   ```

## Configuration

- `config.agent.yaml`: Agent configuration and workflow steps
- `tools/`: Directory containing tool modules
- `main.py`: Development entry point

## Adding Tools

Add new tool files to the `tools/` directory. Each tool file should either:

1. Export a `tools` list containing callable functions
2. Export a `tool_list` containing callable functions
3. Define functions that will be automatically discovered

Example tool file (`tools/my_tools.py`):
```python
def my_custom_tool(input_text: str) -> str:
    \"\"\"Description of what this tool does.\"\"\"
    return f"Processed: {{input_text}}"

# Export the tools
tools = [my_custom_tool]
```

## API Endpoints

When serving with Docker, the following endpoints are available:

- `POST /chat`: Send messages to the agent
- `GET /sessions/{{session_id}}`: Get session information
- `GET /health`: Health check endpoint

## Testing

Run tests with:
```bash
nomos test
```

## Learn More

- [Nomos Documentation](https://github.com/dowhiledev/nomos)
- [Configuration Guide](https://github.com/dowhiledev/nomos/blob/main/README.md)
"""

    with open(target_dir / "README.md", "w") as f:
        f.write(readme_content)


def _run_development_server(
    config_path: Path, tool_files: List[Path], port: int, verbose: bool
) -> None:
    """Run the agent in development mode."""
    current_dir = Path.cwd()
    tools_dir = current_dir / "tools"

    # Check if tools directory already exists to avoid conflicts
    tools_existed = tools_dir.exists()
    temp_tools_created = False

    try:
        # If no tool files provided and no tools directory exists, proceed without tools
        if not tool_files and not tools_existed:
            console.print(
                "⚠️  No tool files provided and no tools directory found. Running without tools.",
                style=WARNING_COLOR,
            )
            tool_files = []

        # Create temporary tools directory if we have tool files to process
        if tool_files:
            if tools_existed:
                console.print(
                    f"❌ Tools directory already exists at [bold]{tools_dir}[/bold]. Please remove it or use a different directory.",
                    style=ERROR_COLOR,
                )
                raise typer.Exit(1)

            # Create tools directory
            tools_dir.mkdir()
            temp_tools_created = True

            # Create __init__.py for tools module
            init_content = '''"""This module imports all tools from the tools directory and makes them available in a list."""

import os

tool_list: list = []

for filename in os.listdir(os.path.dirname(__file__)):
    if filename.endswith(".py") and filename != "__init__.py":
        module_name = filename[:-3]  # Remove the .py extension
        try:
            module = __import__(f"tools.{module_name}", fromlist=[""])
            tool_list.extend(getattr(module, "tools", []))
        except ImportError as e:
            print(f"Warning: Could not import {module_name}: {e}")

__all__ = ["tool_list"]
'''
            (tools_dir / "__init__.py").write_text(init_content)

            # Copy tool files to tools directory
            for _, tool_file in enumerate(tool_files):
                dest_file = tools_dir / tool_file.name
                shutil.copy2(tool_file, dest_file)
                console.print(
                    f"📄 Copied [dim]{tool_file}[/dim] → [dim]{dest_file}[/dim]"
                )

        # Create development server script
        dev_server_code = f"""import sys
import os
from pathlib import Path

# Add current directory to Python path
sys.path.insert(0, str(Path.cwd()))

import nomos
from nomos.llms.openai import OpenAI

try:
    from tools import tool_list
    print(f"✅ Loaded {{len(tool_list)}} tools")
except ImportError as e:
    print(f"⚠️  Warning: Could not import tools: {{e}}")
    tool_list = []

def main():
    try:
        config = nomos.AgentConfig.from_yaml("{config_path}")

        # Initialize LLM (you may need to set API keys)
        llm = OpenAI()

        agent = nomos.Agent.from_config(config, llm, tool_list)
        session = agent.create_session(verbose={verbose})

        print(f"🤖 {{config.name}} agent ready in interactive mode!")
        print(f"📁 Config: {config_path}")
        print(f"🔧 Tools: {{len(tool_list)}} loaded")
        print("Type 'quit' to exit\\n")

        while True:
            try:
                user_input = input("You: ").strip()
                if user_input.lower() in ['quit', 'exit', 'bye']:
                    break

                if not user_input:
                    continue

                decision, _ = session.next(user_input)

                if hasattr(decision, 'response') and decision.response:
                    print(f"Agent: {{decision.response}}")

            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Error: {{e}}")
                if {verbose}:
                    import traceback
                    traceback.print_exc()

    except Exception as e:
        print(f"❌ Failed to start agent: {{e}}")
        if {verbose}:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()
"""

        # Write the script to a temporary file and execute it
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".py", delete=False
        ) as temp_script:
            temp_script.write(dev_server_code)
            temp_script_path = temp_script.name

        try:
            console.print(f"📂 Working directory: [dim]{current_dir}[/dim]")
            if temp_tools_created:
                console.print(
                    f"🔧 Created temporary tools directory: [dim]{tools_dir}[/dim]"
                )

            # Run the development server
            result = subprocess.run(
                [sys.executable, temp_script_path], cwd=current_dir, check=False
            )

            if (
                result.returncode != 0 and result.returncode != 130
            ):  # 130 is KeyboardInterrupt
                console.print(
                    f"❌ Development server exited with code {result.returncode}",
                    style=ERROR_COLOR,
                )

        finally:
            # Clean up temporary script
            os.unlink(temp_script_path)

    finally:
        # Clean up temporary tools directory if we created it
        if temp_tools_created and tools_dir.exists():
            shutil.rmtree(tools_dir)
            console.print(
                f"🧹 Cleaned up temporary tools directory: [dim]{tools_dir}[/dim]"
            )


def _serve_with_docker(
    config_path: Path,
    tool_files: List[Path],
    dockerfile: Optional[str],
    env_file_path: Optional[Path],
    tag: str,
    port: int,
    build: bool,
    detach: bool,
) -> None:
    """Serve the agent using Docker."""
    try:
        client = docker.from_env()
    except DockerException as e:
        console.print(
            f"❌ Could not connect to Docker daemon: {e}",
            style=ERROR_COLOR,
        )
        raise typer.Exit(1)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)

        # Create build context
        build_context = temp_path / "build"
        build_context.mkdir()

        # Copy config file
        shutil.copy2(config_path, build_context / "config.agent.yaml")
        console.print(
            f"📄 Copied config: [dim]{config_path}[/dim] → [dim]build/config.agent.yaml[/dim]"
        )

        # Create tools directory structure
        tools_dir = build_context / "tools"
        tools_dir.mkdir()

        # Copy tool files to tools directory
        for tool_file in tool_files:
            dest_file = tools_dir / tool_file.name
            shutil.copy2(tool_file, dest_file)
            console.print(
                f"📄 Copied tool: [dim]{tool_file}[/dim] → [dim]build/tools/{tool_file.name}[/dim]"
            )

        # Create Dockerfile if not provided (use nomos-base:latest)
        if not dockerfile:
            dockerfile_content = """FROM chandralegend/nomos-base:latest

# Copy configuration and tools
COPY config.agent.yaml /app/config.agent.yaml
COPY tools/ /app/src/tools/

# Expose port
EXPOSE 8000

# The base image already has the entrypoint configured
"""
            dockerfile_path = build_context / "Dockerfile"
            dockerfile_path.write_text(dockerfile_content)
            console.print("📄 Created Dockerfile using nomos-base:latest")
        else:
            # Copy custom Dockerfile
            shutil.copy2(dockerfile, build_context / "Dockerfile")
            console.print(f"📄 Copied custom Dockerfile: [dim]{dockerfile}[/dim]")

        if build:
            console.print("🔨 Building Docker image...", style=PRIMARY_COLOR)

            try:
                # Build the Docker image using the docker library
                image, build_logs = client.images.build(
                    path=str(build_context), tag=tag, rm=True, pull=False
                )

                # Print build logs (optional, for debugging)
                for log in build_logs:
                    if "stream" in log:
                        # Remove the newline to avoid double spacing
                        stream_msg = log["stream"].rstrip("\n")
                        if stream_msg:  # Only print non-empty messages
                            console.print(f"🔧 {stream_msg}", style="dim")

                console.print("✅ Docker image built successfully", style=SUCCESS_COLOR)

            except BuildError as e:
                console.print("❌ Docker build failed:", style=ERROR_COLOR)
                for log in e.build_log:
                    if "stream" in log:
                        console.print(log["stream"].rstrip("\n"), style=ERROR_COLOR)
                raise typer.Exit(1)
            except DockerException as e:
                console.print(f"❌ Docker build error: {e}", style=ERROR_COLOR)
                raise typer.Exit(1)

        mode_text = "in detached mode" if detach else "in foreground"
        console.print(
            f"🚀 Starting Docker container on port {port} {mode_text}...",
            style=PRIMARY_COLOR,
        )
        console.print(f"📁 Build context: [dim]{build_context}[/dim]")

        # Prepare environment variables
        environment = {}
        if env_file_path:
            env_vars = _parse_env_file(env_file_path)
            console.print(
                f"🔧 Loading {len(env_vars)} environment variables from [dim]{env_file_path}[/dim]"
            )
            environment.update(env_vars)

        try:
            if detach:
                # Run the Docker container in detached mode
                container = client.containers.run(
                    tag,
                    detach=True,  # Run in background
                    remove=True,  # Equivalent to --rm
                    ports={"8000/tcp": port},  # Port mapping
                    environment=environment,
                    name=f"{tag}-{port}",  # Give it a predictable name
                )

                console.print(
                    "✅ Container started in detached mode", style=SUCCESS_COLOR
                )
                console.print(f"🐳 Container ID: [dim]{container.short_id}[/dim]")
                console.print(
                    f"🌐 Agent accessible at: [bold]http://localhost:{port}[/bold]"
                )
                console.print(
                    f"📋 To view logs: [dim]docker logs -f {container.short_id}[/dim]"
                )
                console.print(
                    f"🛑 To stop: [dim]docker stop {container.short_id}[/dim]"
                )

            else:
                # Run the Docker container in foreground mode
                container = client.containers.run(
                    tag,
                    detach=False,  # Run in foreground to see output
                    remove=True,  # Equivalent to --rm
                    ports={"8000/tcp": port},  # Port mapping
                    environment=environment,
                    stdout=True,
                    stderr=True,
                    stream=True,
                )

                # Since we're running with detach=False and stream=True,
                # the container.run() will block and stream output

        except DockerException as e:
            console.print(f"❌ Docker run failed: {e}", style=ERROR_COLOR)
            raise typer.Exit(1)
        except KeyboardInterrupt:
            if not detach:
                console.print("\n👋 Docker container stopped.", style=WARNING_COLOR)
            else:
                console.print(
                    "\n👋 Detached container continues running.", style=WARNING_COLOR
                )


def _run_tests(pattern: str, verbose: bool, coverage: bool) -> None:
    """Run tests using pytest."""
    cmd = ["python", "-m", "pytest"]

    if pattern != "test_*.py":
        cmd.extend(["-k", pattern])

    if verbose:
        cmd.append("-v")

    if coverage:
        cmd.extend(["--cov=.", "--cov-report=term-missing"])

    console.print(f"🧪 Running: [bold]{' '.join(cmd)}[/bold]", style=PRIMARY_COLOR)

    result = subprocess.run(cmd)

    if result.returncode == 0:
        console.print("✅ All tests passed!", style=SUCCESS_COLOR)
    else:
        console.print("❌ Some tests failed!", style=ERROR_COLOR)
        raise typer.Exit(result.returncode)


def _parse_env_file(env_file_path: Path) -> dict:
    """Parse a .env file and return a dictionary of environment variables."""
    env_vars = {}

    try:
        with open(env_file_path, "r") as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()

                # Skip empty lines and comments
                if not line or line.startswith("#"):
                    continue

                # Look for KEY=VALUE format
                if "=" in line:
                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip()

                    # Remove quotes from value if present
                    if (value.startswith('"') and value.endswith('"')) or (
                        value.startswith("'") and value.endswith("'")
                    ):
                        value = value[1:-1]

                    env_vars[key] = value
                else:
                    console.print(
                        f"⚠️  Warning: Invalid line {line_num} in env file: {line}",
                        style=WARNING_COLOR,
                    )

    except FileNotFoundError:
        # Re-raise FileNotFoundError for testing purposes
        raise
    except Exception as e:
        console.print(f"❌ Error reading env file: {e}", style=ERROR_COLOR)
        raise typer.Exit(1)

    return env_vars


def _handle_config_generation(
    usecase: str,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    tools: Optional[str] = None,
) -> Optional[AgentConfiguration]:
    """Handle AI generation of agent configuration."""
    llm_config: Optional[LLMConfig] = None
    if provider or model:
        llm_config = LLMConfig(
            provider=provider,
            model=model,
        )
    generator = AgentGenerator(
        console=console,
        llm_config=llm_config,
    )
    try:
        config = generator.generate(usecase=usecase, tools_available=tools)
        return config
    except Exception:
        return None


def main() -> None:
    """Main CLI entry point."""
    app()


if __name__ == "__main__":
    main()
