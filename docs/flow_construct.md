# Flow Construct

The Flow construct allows you to encapsulate a set of steps with shared context and components like memory, tools, and other resources. Flows can have multiple entry and exit points, enabling sophisticated agent workflows with proper resource management.

## Key Concepts

### Flow
A Flow encapsulates a set of steps with shared context and components. It manages:
- **Entry Points**: Steps where the flow can be entered
- **Exit Points**: Steps where the flow can be exited  
- **Components**: Flow-specific resources (memory, tools, etc.)
- **Context**: Shared state and metadata throughout the flow

### FlowManager
The FlowManager coordinates multiple flows and handles transitions between them.

### FlowComponent
Base class for flow-specific components that have lifecycle methods:
- `enter()`: Called when flow is entered
- `exit()`: Called when flow is exited
- `cleanup()`: Called for resource cleanup

## Configuration

Flows are configured in your agent YAML file:

```yaml
flows:
  - flow_id: take_coffee_order
    description: "Complete coffee ordering process"
    enters:
      - take_coffee_order
    exits:
      - finalize_order
      - end
    components:
      memory:
        llm:
          provider: openai
          model: gpt-4o-mini
        retriever:
          method: bm25
          kwargs:
            k: 5
    metadata:
      max_context_size: 50
      summary_threshold: 20
```

## Usage Example

```python
from nomos import AgentConfig, create_flows_from_config
from nomos.models.flow import Message

# Load configuration with flows
config = AgentConfig.from_yaml("config.yaml")

# Create flow manager
flow_manager = create_flows_from_config(config)

# Get a specific flow
coffee_flow = flow_manager.flows["take_coffee_order"]

# Enter the flow
context = coffee_flow.enter(
    entry_step="take_coffee_order",
    previous_context=[
        Message(role="user", content="I'd like to order coffee")
    ],
    metadata={"customer_id": "12345"}
)

# Use flow components
memory = coffee_flow.get_memory()
if memory:
    memory.add_to_context(
        Message(role="assistant", content="What type of coffee?")
    )
    
    # Search flow memory
    results = memory.search("coffee order")

# Exit the flow
exit_data = coffee_flow.exit("finalize_order", context)

# Exit data contains summaries from all components
memory_summary = exit_data.get("memory")
```

## Flow Transitions

You can transition between flows:

```python
# Transition from one flow to another
new_context = flow_manager.transition_between_flows(
    from_flow=service_flow,
    to_flow=order_flow, 
    transition_step="take_coffee_order",
    context=current_context
)
```

## Built-in Components

### FlowMemoryComponent

The `FlowMemoryComponent` provides flow-specific memory that:
- Preserves context within the flow
- Generates summaries when exiting
- Supports retrieval with BM25 or other methods
- Automatically cleans up resources

```python
# Access flow memory
memory_component = flow.get_memory()

# Add to context
memory_component.add_to_context(message)

# Search memory  
results = memory_component.search("query")
```

## Benefits

1. **Resource Management**: Automatic initialization and cleanup of flow-specific resources
2. **Context Preservation**: Maintains conversation and state within flow boundaries
3. **Memory Efficiency**: Generates summaries when transitioning between flows
4. **Modularity**: Encapsulates related steps with their specific components
5. **Flexibility**: Multiple entry/exit points for complex workflows

## Advanced Usage

### Custom Components

Create custom flow components by extending `FlowComponent`:

```python
from nomos.models.flow_construct import FlowComponent, FlowContext

class CustomToolComponent(FlowComponent):
    def __init__(self, tool_config):
        self.tools = initialize_tools(tool_config)
    
    def enter(self, context: FlowContext) -> None:
        # Initialize tools for this flow
        self.setup_tools_for_flow(context.flow_id)
    
    def exit(self, context: FlowContext) -> dict:
        # Return tool usage summary
        return {"tool_usage": self.get_usage_stats()}
    
    def cleanup(self, context: FlowContext) -> None:
        # Clean up tool resources
        self.cleanup_tools()
```

### Flow Metadata

Use metadata to pass configuration and state:

```python
context = flow.enter(
    entry_step="start",
    metadata={
        "user_preferences": {"language": "en"},
        "session_timeout": 3600,
        "priority": "high"
    }
)

# Access metadata in components
priority = context.metadata.get("priority")
```

This Flow construct provides a powerful way to structure complex agent workflows with proper resource management and context preservation.
