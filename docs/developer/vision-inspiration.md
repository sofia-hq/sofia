# Vision & Inspiration

Nomos exists so developers can build AI agents that do **exactly** what they are
told. Instead of a single giant prompt, Nomos lets you guide the model through a
sequence of well defined steps. This structure gives you visibility into every
decision and makes it easy to test and debug.

## Prompt‑Based vs Step‑Based

Prompt‑based agents often combine instructions, examples and constraints into one
block of text. They work for quick prototypes but quickly become hard to control
or observe. A small change in wording can lead to unexpected behavior.

Nomos introduces **step-based agents**. Each step has a clear purpose, a set of
tools it may call and rules for moving to the next step. This approach emphasises
**collaboration**, **reliability** and **observability**.

### Key Concepts

- **Step-based control** – predictable behavior that is easier to test.
- **Persona driven prompts** – maintain consistent tone and brand voice.
- **Extensible tools** – safely interact with your code or third‑party services.
- **Flow groups** – organize complex conversations with memory and metadata.

Nomos draws inspiration from open-source projects such as CrewAI and LangChain
but focuses on shipping enterprise-ready agents with strong testing and
deployment stories.
