"""Command Line Interface for Nomos."""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import List, Optional

import typer
from rich import print
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich.table import Table
from rich.text import Text

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


def print_banner():
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
        None,
        "--directory",
        "-d",
        help="Directory to create the agent project in"
    ),
    name: Optional[str] = typer.Option(
        None,
        "--name",
        "-n",
        help="Name of the agent"
    ),
    template: Optional[str] = typer.Option(
        "basic",
        "--template",
        "-t",
        help="Template to use (basic, conversational, workflow)"
    ),
):
    """Initialize a new Nomos agent project interactively."""
    print_banner()
    
    console.print(Panel(
        "Welcome to Nomos! Let's create your new agent project.",
        title="Project Initialization",
        border_style=PRIMARY_COLOR
    ))
    
    # Get target directory
    if not directory:
        directory = Prompt.ask(
            "📁 Project directory",
            default="./my-nomos-agent"
        )
    
    target_dir = Path(directory).resolve()
    
    if target_dir.exists() and any(target_dir.iterdir()):
        if not Confirm.ask(f"Directory [bold]{target_dir}[/bold] already exists and is not empty. Continue?"):
            console.print("❌ Project initialization cancelled.", style=ERROR_COLOR)
            raise typer.Exit(1)
    
    target_dir.mkdir(parents=True, exist_ok=True)
    
    # Get agent name
    if not name:
        name = Prompt.ask(
            "🤖 Agent name",
            default=target_dir.name.replace("-", "_").replace(" ", "_")
        )
    
    # Get agent persona
    persona = Prompt.ask(
        "🎭 Agent persona (describe your agent's role and personality)",
        default="You are a helpful assistant."
    )
    
    # Choose LLM provider
    llm_choices = ["OpenAI", "Mistral", "Gemini", "Custom"]
    llm_table = Table(title="Choose LLM Provider")
    llm_table.add_column("Option", style=PRIMARY_COLOR)
    llm_table.add_column("Provider")
    
    for i, choice in enumerate(llm_choices, 1):
        llm_table.add_row(str(i), choice)
    
    console.print(llm_table)
    
    llm_choice_idx = int(Prompt.ask(
        "🧠 Select LLM provider",
        choices=[str(i) for i in range(1, len(llm_choices) + 1)],
        default="1"
    )) - 1
    
    llm_choice = llm_choices[llm_choice_idx]
    
    # Collect steps
    steps = []
    console.print("\n📋 Let's define your agent's workflow steps...")
    
    # Add default steps based on template
    if template == "basic":
        steps = [
            {
                "step_id": "start",
                "description": "Greet the user and understand their needs",
                "available_tools": [],
                "routes": [{"target": "help", "condition": "User needs assistance"}]
            },
            {
                "step_id": "help",
                "description": "Provide assistance to the user",
                "available_tools": [],
                "routes": [{"target": "end", "condition": "Task completed"}]
            },
            {
                "step_id": "end",
                "description": "End the conversation politely",
                "available_tools": [],
                "routes": []
            }
        ]
    
    # Allow user to customize steps
    if Confirm.ask("🔧 Would you like to customize the workflow steps?"):
        steps = []
        add_more = True
        
        while add_more:
            step_id = Prompt.ask("Step ID")
            description = Prompt.ask("Step description")
            
            # Tools
            available_tools = []
            if Confirm.ask("Add tools to this step?"):
                tools_input = Prompt.ask("Tool names (comma-separated)", default="")
                available_tools = [t.strip() for t in tools_input.split(",") if t.strip()]
            
            # Routes
            routes = []
            if Confirm.ask("Add routes from this step?"):
                add_route = True
                while add_route:
                    target = Prompt.ask("Route target step ID")
                    condition = Prompt.ask("Route condition")
                    routes.append({"target": target, "condition": condition})
                    add_route = Confirm.ask("Add another route?")
            
            steps.append({
                "step_id": step_id,
                "description": description,
                "available_tools": available_tools,
                "routes": routes
            })
            
            add_more = Confirm.ask("Add another step?")
    
    # Generate project files
    _generate_project_files(target_dir, name, persona, llm_choice, steps)
    
    console.print(Panel(
        f"✅ Project created successfully in [bold]{target_dir}[/bold]",
        title="Success",
        border_style=SUCCESS_COLOR
    ))
    
    # Show next steps
    next_steps = f"""
📁 Navigate to your project: [bold]cd {target_dir}[/bold]
🔧 Edit configuration: [bold]config.agent.yaml[/bold]
🛠️ Add tools: [bold]tools.py[/bold]
🏃 Run development mode: [bold]nomos run[/bold]
🚀 Serve with Docker: [bold]nomos serve[/bold]
"""
    
    console.print(Panel(
        next_steps.strip(),
        title="Next Steps",
        border_style=PRIMARY_COLOR
    ))


@app.command()
def run(
    config: Optional[str] = typer.Option(
        "config.agent.yaml",
        "--config",
        "-c",
        help="Path to agent configuration file"
    ),
    tools: Optional[str] = typer.Option(
        "tools.py",
        "--tools",
        "-t",
        help="Path to tools file"
    ),
    port: int = typer.Option(
        8000,
        "--port",
        "-p",
        help="Port to run the development server on"
    ),
    verbose: bool = typer.Option(
        False,
        "--verbose",
        "-v",
        help="Enable verbose logging"
    ),
):
    """Run the Nomos agent in development mode."""
    print_banner()
    
    config_path = Path(config)
    tools_path = Path(tools)
    
    # Validate files exist
    if not config_path.exists():
        console.print(f"❌ Configuration file not found: [bold]{config_path}[/bold]", style=ERROR_COLOR)
        raise typer.Exit(1)
    
    if not tools_path.exists():
        console.print(f"❌ Tools file not found: [bold]{tools_path}[/bold]", style=ERROR_COLOR)
        raise typer.Exit(1)
    
    console.print(Panel(
        f"🏃 Starting development server on port [bold]{port}[/bold]",
        title="Development Mode",
        border_style=PRIMARY_COLOR
    ))
    
    try:
        # Import and run the agent
        _run_development_server(config_path, tools_path, port, verbose)
    except KeyboardInterrupt:
        console.print("\n👋 Development server stopped.", style=WARNING_COLOR)
    except Exception as e:
        console.print(f"❌ Error running development server: {e}", style=ERROR_COLOR)
        raise typer.Exit(1)


@app.command()
def serve(
    config: Optional[str] = typer.Option(
        "config.agent.yaml",
        "--config",
        "-c",
        help="Path to agent configuration file"
    ),
    dockerfile: Optional[str] = typer.Option(
        None,
        "--dockerfile",
        "-f",
        help="Path to custom Dockerfile"
    ),
    tag: Optional[str] = typer.Option(
        "nomos-agent",
        "--tag",
        help="Docker image tag"
    ),
    port: int = typer.Option(
        8000,
        "--port",
        "-p",
        help="Host port to bind to"
    ),
    build: bool = typer.Option(
        True,
        "--build/--no-build",
        help="Build Docker image before running"
    ),
):
    """Serve the Nomos agent using Docker."""
    print_banner()
    
    config_path = Path(config)
    
    if not config_path.exists():
        console.print(f"❌ Configuration file not found: [bold]{config_path}[/bold]", style=ERROR_COLOR)
        raise typer.Exit(1)
    
    console.print(Panel(
        f"🐳 Serving agent with Docker on port [bold]{port}[/bold]",
        title="Docker Serve",
        border_style=PRIMARY_COLOR
    ))
    
    try:
        _serve_with_docker(config_path, dockerfile, tag, port, build)
    except KeyboardInterrupt:
        console.print("\n👋 Docker serve stopped.", style=WARNING_COLOR)
    except Exception as e:
        console.print(f"❌ Error serving with Docker: {e}", style=ERROR_COLOR)
        raise typer.Exit(1)


@app.command()
def test(
    pattern: Optional[str] = typer.Option(
        "test_*.py",
        "--pattern",
        "-p",
        help="Test file pattern to match"
    ),
    verbose: bool = typer.Option(
        False,
        "--verbose",
        "-v",
        help="Enable verbose test output"
    ),
    coverage: bool = typer.Option(
        True,
        "--coverage/--no-coverage",
        help="Generate coverage report"
    ),
):
    """Run the Nomos testing framework."""
    print_banner()
    
    console.print(Panel(
        "🧪 Running Nomos agent tests",
        title="Testing Framework",
        border_style=PRIMARY_COLOR
    ))
    
    try:
        _run_tests(pattern, verbose, coverage)
    except Exception as e:
        console.print(f"❌ Error running tests: {e}", style=ERROR_COLOR)
        raise typer.Exit(1)


def _generate_project_files(target_dir: Path, name: str, persona: str, llm_choice: str, steps: List[dict]):
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
        if step['available_tools']:
            config_content += "    available_tools:\n"
            for tool in step['available_tools']:
                config_content += f"      - {tool}\n"
        
        if step['routes']:
            config_content += "    routes:\n"
            for route in step['routes']:
                config_content += f"""      - target: {route['target']}
        condition: {route['condition']}
"""
    
    # Write config file
    with open(target_dir / "config.agent.yaml", "w") as f:
        f.write(config_content)
    
    # Generate tools.py
    tools_content = f'''"""Tools for {name} agent."""

def sample_tool(query: str) -> str:
    """
    A sample tool that echoes the input query.
    
    Args:
        query: The input query to echo
        
    Returns:
        The echoed query with a prefix
    """
    return f"You said: {{query}}"


# Add more tools here as needed
tool_list = [sample_tool]
'''
    
    with open(target_dir / "tools.py", "w") as f:
        f.write(tools_content)
    
    # Generate main.py for development
    main_content = f'''"""Main entry point for {name} agent."""

import os
from pathlib import Path

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
    dockerfile_content = f'''FROM chandralegend/nomos-base:latest

# Copy configuration and tools
COPY config.agent.yaml /app/config.agent.yaml
COPY tools.py /app/tools.py

# Expose port
EXPOSE 8000

# The base image already has the entrypoint configured
'''
    
    with open(target_dir / "Dockerfile", "w") as f:
        f.write(dockerfile_content)
    
    # Generate requirements.txt
    requirements_content = f'''nomos[{llm_choice.lower()}]>=0.1.13
'''
    
    with open(target_dir / "requirements.txt", "w") as f:
        f.write(requirements_content)
    
    # Generate .env.example
    env_content = '''# Environment variables for your Nomos agent

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
'''
    
    with open(target_dir / ".env.example", "w") as f:
        f.write(env_content)
    
    # Generate README.md
    readme_content = f'''# {name.title()} Agent

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

2. **Or manually:**
   ```bash
   docker build -t {name}-agent .
   docker run -e OPENAI_API_KEY=your_key -p 8000:8000 {name}-agent
   ```

## Configuration

- `config.agent.yaml`: Agent configuration and workflow steps
- `tools.py`: Custom tools and functions
- `main.py`: Development entry point

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
'''
    
    with open(target_dir / "README.md", "w") as f:
        f.write(readme_content)


def _run_development_server(config_path: Path, tools_path: Path, port: int, verbose: bool):
    """Run the agent in development mode."""
    # Create a simple development server
    dev_server_code = f'''
import sys
import os
from pathlib import Path

# Add current directory to Python path
sys.path.insert(0, str(Path.cwd()))

import nomos
from nomos.llms.openai import OpenAI

try:
    from tools import tool_list
except ImportError:
    print("⚠️  Warning: Could not import tools from tools.py")
    tool_list = []

def main():
    config = nomos.AgentConfig.from_yaml("{config_path}")
    
    # Initialize LLM (you may need to set API keys)
    llm = OpenAI()
    
    agent = nomos.Agent.from_config(config, llm, tool_list)
    session = agent.create_session(verbose={verbose})
    
    print(f"🤖 {{config.name}} agent ready on interactive mode!")
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

if __name__ == "__main__":
    main()
'''
    
    # Execute the development server
    exec(dev_server_code)


def _serve_with_docker(config_path: Path, dockerfile: Optional[str], tag: str, port: int, build: bool):
    """Serve the agent using Docker."""
    if build:
        console.print("🔨 Building Docker image...", style=PRIMARY_COLOR)
        
        # Use custom Dockerfile if provided, otherwise use default
        dockerfile_arg = f"-f {dockerfile}" if dockerfile else ""
        
        build_cmd = f"docker build {dockerfile_arg} -t {tag} ."
        result = subprocess.run(build_cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode != 0:
            console.print(f"❌ Docker build failed: {result.stderr}", style=ERROR_COLOR)
            raise typer.Exit(1)
        
        console.print("✅ Docker image built successfully", style=SUCCESS_COLOR)
    
    console.print(f"🚀 Starting Docker container on port {port}...", style=PRIMARY_COLOR)
    
    # Run the container
    run_cmd = f"docker run --rm -p {port}:8000 {tag}"
    
    try:
        subprocess.run(run_cmd, shell=True, check=True)
    except subprocess.CalledProcessError as e:
        console.print(f"❌ Docker run failed: {e}", style=ERROR_COLOR)
        raise typer.Exit(1)


def _run_tests(pattern: str, verbose: bool, coverage: bool):
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


def main():
    """Main CLI entry point."""
    app()


if __name__ == "__main__":
    main()