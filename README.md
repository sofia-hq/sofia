<div align="center">
<a href="https://github.com/chandralegend/sofia"><img src="https://i.ibb.co/202j1W2v/sofia-logo.png" alt="sofia"  width="400"></a>

### **S***imple* **O***rchestrated* **F**low **I***ntelligence* **A***gent*
![PyPI - Version](https://img.shields.io/pypi/v/sofia-agent) [![codecov](https://codecov.io/gh/chandralegend/sofia/graph/badge.svg?token=MXRK9HGE5R)](https://codecov.io/gh/chandralegend/sofia) [![Test](https://github.com/chandralegend/sofia/actions/workflows/test.yml/badge.svg)](https://github.com/chandralegend/sofia/actions/workflows/test.yml) [![Release](https://github.com/chandralegend/sofia/actions/workflows/publish.yml/badge.svg)](https://github.com/chandralegend/sofia/actions/workflows/publish.yml) 
</div>

SOFIA is an open-source, configurable multi-step agent framework for building advanced LLM-powered assistants. Define your agent's persona, tools, and step-by-step flows in Python or YAML—perfect for conversational, workflow, and automation use cases.


## Features
- **Step-based agent flows**: Define agent behavior as a sequence of steps, each with its own tools and transitions.
- **Persona-driven**: Easily set the agent's persona for consistent, branded responses.
- **Tool integration**: Register Python functions as tools for the agent to call.
- **YAML or Python config**: Configure agents via code or declarative YAML.
- **OpenAI and custom LLM support**
- **Session management**: Save and resume conversations.
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

### From Source
```bash
git clone https://github.com/chandralegend/sofia.git
cd sofia
poetry install
```


## Usage

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
    from datetime import datetime
    return f"Current time: {datetime.now()}"

steps = [
    Step(
        step_id="start",
        description="Greet and offer to tell the time.",
        available_tools=["get_time"],
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
    tools=[get_time],
    persona="You are a friendly clock assistant.",
)
sess = agent.create_session()
# ... interact with sess.next(user_input)
```

### YAML Config Example
See [`examples/config.barista.yaml`](examples/config.barista.yaml) for a full-featured barista agent.


## Configuration
- **Persona**: Set in YAML or Python for consistent agent style.
- **Steps**: Each step defines available tools, description, and routes to other steps.
- **Tools**: Python functions registered with the agent.


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
- `CONFIG_URL`: URL to download the agent configuration from
- `CONFIG_PATH`: Path to a mounted config file
- `OPENAI_API_KEY`: Your OpenAI API key
- `REDIS_URL`: Optional Redis URL for session management

## Contributing
Contributions are welcome! Please open issues or pull requests on GitHub.


## License
MIT License. See [LICENSE](LICENSE).


## Acknowledgements
- Inspired by the open-source LLM community.
- Built with ❤️ by contributors.
