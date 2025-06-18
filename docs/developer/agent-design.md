# Agent Design

Nomos encourages **step-based** flows. Each step has an ID, description, and available tools. You can route to another step based on conditions. Flows group related steps so context stays relevant and transitions are explicit.

Example step definition:
```yaml
- step_id: gather_info
  description: Collect user data
  available_tools:
    - ask_database
  routes:
    - target: finish
      condition: Information complete
```

This structured design improves reliability, observability and lets you test each piece independently.
