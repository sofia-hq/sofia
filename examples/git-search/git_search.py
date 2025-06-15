"""Main entry point for Nomos Search Assistant agent."""

import sys
from pathlib import Path

# Add tools directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

import nomos
from nomos.llms.openai import OpenAI


def main():
    """Run the agent interactively."""
    # Load configuration
    config_path = Path(__file__).parent / "config.agent.yaml"
    config = nomos.AgentConfig.from_yaml(str(config_path))

    # Initialize LLM
    llm = config.get_llm()

    # Create agent
    agent = nomos.Agent.from_config(config, llm)

    # Create session
    session = agent.create_session(verbose=True)

    print(f"🤖 {config.name} agent is ready! Type 'quit' to exit.\n")

    while True:
        try:
            user_input = input("You: ").strip()
            if user_input.lower() in ["quit", "exit", "bye"]:
                print("👋 Goodbye!")
                break

            if not user_input:
                continue

            decision, _ = session.next(user_input)

            if hasattr(decision, "response") and decision.response:
                print(f"🤖 {config.name}: {decision.response}")

        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()
