# Agent Design

Nomos prefers **step based** agents over single prompt interactions. Each step can use tools and routes to the next step. Flows group related steps and keep context.

Prompt based agents rely on monolithic prompts. Nomos encourages breaking work into discrete steps for reliability and observability.
