import os
import questionary
import argparse


def cli_init():
    # 1. Ask for target directory
    output_dir = questionary.text(
        "Which directory do you want to create the agent files in? (absolute or relative path)"
    ).ask()
    output_dir = os.path.abspath(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    # 2. Ask for agent name and persona
    agent_name = questionary.text("Agent name (e.g. barista):").ask()
    persona = questionary.text("Describe the agent's persona:").ask()

    # 3. Ask for LLM
    llm_choice = questionary.select(
        "Which LLM do you want to use?",
        choices=["OpenAIChatLLM", "Custom (implement your own)"],
    ).ask()

    # 4. Collect steps
    steps = []
    add_more = True
    while add_more:
        step_id = questionary.text("Step ID:").ask()
        description = questionary.text("Step description:").ask()
        available_tools = questionary.text(
            "Comma-separated tool names available in this step:"
        ).ask()
        available_tools = [t.strip() for t in available_tools.split(",") if t.strip()]
        routes = []
        add_route = questionary.confirm("Add a route from this step?").ask()
        while add_route:
            target = questionary.text("Route target step ID:").ask()
            condition = questionary.text(
                "Route condition (when to take this route):"
            ).ask()
            routes.append({"target": target, "condition": condition})
            add_route = questionary.confirm("Add another route?").ask()
        steps.append(
            {
                "step_id": step_id,
                "description": description,
                "available_tools": available_tools,
                "routes": routes,
            }
        )
        add_more = questionary.confirm("Add another step?").ask()

    # 5. Collect tool arg descriptions
    tool_arg_descriptions = {}
    add_tool = questionary.confirm(
        "Do you want to add tool argument descriptions?"
    ).ask()
    while add_tool:
        tool_name = questionary.text("Tool name:").ask()
        tool_args = {}
        add_arg = questionary.confirm("Add argument for this tool?").ask()
        while add_arg:
            arg_name = questionary.text("Argument name:").ask()
            arg_desc = questionary.text("Argument description:").ask()
            tool_args[arg_name] = arg_desc
            add_arg = questionary.confirm("Add another argument?").ask()
        tool_arg_descriptions[tool_name] = tool_args
        add_tool = questionary.confirm("Add another tool?").ask()

    # 6. Write config YAML
    import yaml

    config = {
        "persona": persona,
        "steps": steps,
        "tool_arg_descriptions": tool_arg_descriptions,
    }
    config_path = os.path.join(output_dir, f"config.{agent_name}.yaml")
    with open(config_path, "w") as f:
        yaml.dump(config, f, sort_keys=False)

    # 7. Write starter Python file
    py_path = os.path.join(output_dir, f"{agent_name}_with_config.py")
    with open(py_path, "w") as f:
        f.write(
            f"""
\"\"\"
Starter agent for {agent_name} using SOFIA config.
Update the tool definitions and tool_arg_descriptions as needed.
\"\"\"

import os
from sofia.core import Sofia
from sofia.config import AgentConfig

# Place your tool definitions here:
# def my_tool(...):
#     ...

# Load config
yaml_path = os.path.join(os.path.dirname(__file__), 'config.{agent_name}.yaml')
config = AgentConfig.from_yaml(yaml_path)

llm = None
"""
        )
        if llm_choice == "OpenAIChatLLM":
            f.write(
                """
from sofia.llms import OpenAIChatLLM
llm = OpenAIChatLLM()
"""
            )
        else:
            f.write(
                """
# from sofia.llms import BaseLLM
# class MyCustomLLM(BaseLLM):
#     ... # Implement your custom LLM here
# llm = MyCustomLLM()
"""
            )
        f.write(
            """
agent = Sofia(
    llm=llm,
    config=config,
    tools=[],  # Add your tool functions here
)

if __name__ == "__main__":
    sess = agent.create_session()
    # ... interact with sess.next(user_input)
"""
        )

    print(f"Agent config written to: {config_path}")
    print(f"Starter Python file written to: {py_path}")


def main():
    parser = argparse.ArgumentParser(
        prog="sofia",
        description="SOFIA CLI - Simple Orchestrated Flow Intelligence Agent",
    )
    subparsers = parser.add_subparsers(dest="command")

    # init command
    init_parser = subparsers.add_parser(
        "init", help="Start a new agent project interactively"
    )
    # help command is handled by argparse

    args = parser.parse_args()

    if args.command == "init":
        cli_init()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
