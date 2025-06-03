"""Example demonstrating Flow construct usage with the barista agent."""

from nomos.config import AgentConfig
from nomos.utils.flow_utils import create_flows_from_config
from nomos.models.flow import FlowContext
from nomos.models.agent import Message


def demonstrate_flow_usage():
    """Demonstrate how flows work with the barista example."""
    
    # Load configuration with flows
    config = AgentConfig.from_yaml("examples/barista/config.barista.yaml")
    
    # Create flow manager from configuration
    flow_manager = create_flows_from_config(config)
    
    print("=== Flow Manager Setup ===")
    print(f"Registered flows: {list(flow_manager.flows.keys())}")
    
    # Simulate entering the coffee ordering flow
    print("\n=== Entering Coffee Order Flow ===")
    coffee_flow = flow_manager.flows.get("take_coffee_order")
    if coffee_flow:
        # Simulate entering the flow when customer starts ordering
        context = coffee_flow.enter(
            entry_step="take_coffee_order",
            previous_context=[
                Message(role="user", content="Hi, I'd like to order a coffee"),
                Message(role="assistant", content="Hello! What can I get for you?")
            ],
            metadata={"customer_id": "12345", "session_start": "2025-06-03T10:00:00Z"}
        )
        
        print(f"Flow entered: {context.flow_id}")
        print(f"Entry step: {context.entry_step}")
        print(f"Metadata: {context.metadata}")
        
        # Get flow memory component
        memory_component = coffee_flow.get_memory()
        if memory_component:
            print("Flow memory initialized and ready")
            
            # Add conversation to memory
            memory_component.add_to_context(
                Message(role="user", content="I want a large latte")
            )
            memory_component.add_to_context(
                Message(role="assistant", content="Great! Adding a large latte to your order.")
            )
            
            # Search memory
            search_results = memory_component.search("latte order")
            print(f"Memory search results: {len(search_results)} items found")
        
        print("\n=== Transitioning Within Flow ===")
        # Simulate moving through the flow steps
        if coffee_flow.contains_step("finalize_order"):
            print("Customer ready to finalize order - staying in flow")
        
        print("\n=== Exiting Flow ===")
        # Simulate exiting the flow
        if coffee_flow.can_exit("finalize_order"):
            exit_data = coffee_flow.exit("finalize_order", context)
            print(f"Flow exited at step: finalize_order")
            print(f"Exit data: {list(exit_data.keys())}")
            
            # The exit data would contain memory summary and other component data
            if "memory" in exit_data:
                summary = exit_data["memory"]
                print(f"Memory summary generated: {type(summary).__name__}")
    
    # Demonstrate customer service flow
    print("\n=== Customer Service Flow ===")
    service_flow = flow_manager.flows.get("customer_service")
    if service_flow:
        service_context = service_flow.enter(
            entry_step="start",
            metadata={"inquiry_type": "complaint", "priority": "high"}
        )
        print(f"Service flow entered: {service_context.flow_id}")
        
        # Clean up
        service_flow.cleanup(service_context)
        print("Service flow cleaned up")


def demonstrate_flow_transitions():
    """Demonstrate transitioning between flows."""
    
    config = AgentConfig.from_yaml("examples/barista/config.barista.yaml")
    flow_manager = create_flows_from_config(config)
    
    print("\n=== Flow Transitions ===")
    
    # Get flows
    service_flow = flow_manager.flows.get("customer_service")
    order_flow = flow_manager.flows.get("take_coffee_order")
    
    if service_flow and order_flow:
        # Start in customer service
        service_context = service_flow.enter(
            entry_step="start",
            previous_context=[
                Message(role="user", content="Hello, I need help with my order")
            ]
        )
        
        print(f"Started in: {service_context.flow_id}")
        
        # Transition to ordering flow
        # This would happen when customer decides to place a new order
        if order_flow.can_enter("take_coffee_order"):
            new_context = flow_manager.transition_between_flows(
                from_flow=service_flow,
                to_flow=order_flow,
                transition_step="take_coffee_order",
                context=service_context
            )
            
            print(f"Transitioned to: {new_context.flow_id}")
            print(f"Previous flow data available: {'previous_flow_data' in new_context.metadata}")
            
            # Clean up
            order_flow.cleanup(new_context)


def demonstrate_flow_memory_persistence():
    """Demonstrate how flow memory persists context."""
    
    config = AgentConfig.from_yaml("examples/barista/config.barista.yaml")
    flow_manager = create_flows_from_config(config)
    
    print("\n=== Flow Memory Persistence ===")
    
    order_flow = flow_manager.flows.get("take_coffee_order")
    if order_flow:
        # Enter flow with conversation history
        previous_conversation = [
            Message(role="user", content="I was here yesterday and ordered a cappuccino"),
            Message(role="assistant", content="Welcome back! How was your cappuccino?"),
            Message(role="user", content="It was perfect! I'd like the same again.")
        ]
        
        context = order_flow.enter(
            entry_step="take_coffee_order",
            previous_context=previous_conversation
        )
        
        memory_component = order_flow.get_memory()
        if memory_component:
            print("Flow memory loaded with previous conversation context")
            
            # Add new conversation
            memory_component.add_to_context(
                Message(role="assistant", content="Great! I'll prepare another cappuccino for you.")
            )
            
            # Search for previous orders
            search_results = memory_component.search("cappuccino yesterday order")
            print(f"Found {len(search_results)} relevant items from memory")
            
            # Exit and get summary
            exit_data = order_flow.exit("finalize_order", context)
            if "memory" in exit_data:
                summary = exit_data["memory"]
                print(f"Generated summary for future use: {len(summary.summary)} items")


if __name__ == "__main__":
    print("=== Flow Construct Demonstration ===")
    
    try:
        demonstrate_flow_usage()
        demonstrate_flow_transitions()
        demonstrate_flow_memory_persistence()
        
        print("\n=== Demo Complete ===")
        print("Flow construct successfully demonstrated!")
        
    except Exception as e:
        print(f"Demo failed: {e}")
        print("Make sure you have the barista configuration file available.")
