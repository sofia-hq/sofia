import type { SofiaDecision, Message } from "@/types"

/**
 * Extracts a simple message from a Sofia decision object.
 * In Auto mode, it returns just the input content.
 * In Manual mode, it returns the full decision object for detailed display.
 */
export function extractMessageFromDecision(
  decision: SofiaDecision,
  isManualMode: boolean
): Message {
  // Handle empty or invalid decisions
  if (!decision) {
    return {
      role: "error",
      content: "Invalid or empty response from the agent.",
      timestamp: new Date()
    }
  }

  // If the decision has a type field (new format), use it
  if (decision.type) {
    switch (decision.type) {
      case "tool_call":
        return {
          role: "assistant",
          content: decision.input || `Using tool: ${decision.tool_name}`,
          timestamp: new Date()
        }
      case "step_transition":
        return {
          role: "system",
          content: `Moving to next step: ${decision.next_step_id}`,
          timestamp: new Date()
        }
      case "answer":
      default:
        return {
          role: "assistant",
          content: decision.input || "No response content provided.",
          timestamp: new Date()
        }
    }
  }

  // For backward compatibility, use the action field if type is not available
  // For auto mode, extract just the relevant message content
  if (!isManualMode) {
    // Handle different action types
    switch (decision.action) {
      case "ANSWER":
      case "ASK":
        return {
          role: "assistant",
          content: decision.input || "No response content provided.",
          timestamp: new Date()
        }
      case "END":
        return {
          role: "system",
          content: "Conversation ended by the agent.",
          timestamp: new Date()
        }
      case "TOOL_CALL":
        return {
          role: "assistant",
          content: decision.input || `Using tool: ${decision.tool_name}`,
          timestamp: new Date()
        }
      case "MOVE":
        return {
          role: "system",
          content: `Moving to next step: ${decision.next_step_id}`,
          timestamp: new Date()
        }
      default:
        return {
          role: "assistant",
          content: decision.input || "No response provided.",
          timestamp: new Date()
        }
    }
  }

  // For manual mode, return a basic message (details will be added elsewhere)
  return {
    role: "assistant",
    content: decision.input || (
      decision.action === "END" 
        ? "Conversation ended by the agent." 
        : decision.action === "MOVE"
          ? `Moving to step: ${decision.next_step_id}`
          : decision.action === "TOOL_CALL"
            ? `Using tool: ${decision.tool_name}`
            : "No response content provided."
    ),
    timestamp: new Date()
  }
}
