# 👩‍💼 SOFIA: Simple Orchestrated Flow Intelligence Agent

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

### From PyPI (coming soon)
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
from sofia.core import Sofia
from sofia.llms import OpenAIChatLLM
from sofia.models.flow import Step, Route

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
A full example is provided in [`examples/barista.py`](examples/barista.py) and [`examples/config.barista.yaml`](examples/config.barista.yaml).


## Contributing
Contributions are welcome! Please open issues or pull requests on GitHub.


## License
MIT License. See [LICENSE](LICENSE).


## Acknowledgements
- Inspired by the open-source LLM community.
- Built with ❤️ by contributors.
