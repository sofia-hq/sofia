// Types for Sofia Chat UI

// Message types
export interface Message {
  role: "user" | "assistant" | "tool" | "system" | "error" | "fallback"
  content: string
  timestamp?: Date
}

// Sofia Agent Decision
export interface SofiaDecision {
  reasoning?: string[]
  action?: "ASK" | "ANSWER" | "MOVE" | "TOOL_CALL" | "END"
  input?: string
  next_step_id?: string
  tool_name?: string
  tool_kwargs?: Record<string, any>
  type?: "answer" | "tool_call" | "step_transition" | "unknown" // Message type from backend
}

// API Response types
export interface SessionResponse {
  session_id: string
  message: SofiaDecision | { status: string }
}

export interface HistoryResponse {
  session_id: string
  history: Message[]
}

// UI State types
export interface ChatState {
  messages: Message[]
  isLoading: boolean
  error: string | null
  sessionId: string | null
  isManualMode: boolean
}

// Combined message type that includes decision details for manual mode
export interface ChatMessageWithDetails extends Message {
  decision?: SofiaDecision
}
