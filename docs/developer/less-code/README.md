# Less-code Development

With the less-code approach you describe the agent in YAML but still write Python tools and deeper tests.

1. **Agent YAML**
   ```yaml
   name: math-bot
   persona: Answers math questions
   steps:
     - step_id: start
       description: Respond to calculations
       available_tools:
         - sqrt
   start_step_id: start
   ```

2. **Tool module**
   ```python
   from math import sqrt
   def sqrt_tool(x: float) -> float:
       return sqrt(x)
   ```

3. **Test config**
   ```yaml
   llm:
     provider: openai
     model: gpt-4o-mini
   unit:
     sqrt:
       input: "sqrt 4"
       expectation: "Returns 2"
   ```

Run the agent with `nomos run --config config.agent.yaml` and run tests using `nomos test -c tests.agent.yaml`.
