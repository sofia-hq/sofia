import React, { createContext, useContext, useReducer, ReactNode } from "react"
import type { Message, ChatState, SofiaDecision, ChatMessageWithDetails } from "@/types"

// Initial chat state
const initialState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
  sessionId: null,
  isManualMode: false
}

// Action types
type Action =
  | { type: "SET_SESSION"; payload: string }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "ADD_MESSAGE_WITH_DETAILS"; payload: ChatMessageWithDetails }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR_MESSAGES" }
  | { type: "TOGGLE_MODE" }
  | { type: "SET_MESSAGES"; payload: Message[] }

// Reducer function
function chatReducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case "SET_SESSION":
      return { ...state, sessionId: action.payload }
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] }
    case "ADD_MESSAGE_WITH_DETAILS":
      return { ...state, messages: [...state.messages, action.payload] }
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload }
    case "CLEAR_MESSAGES":
      return { ...state, messages: [] }
    case "TOGGLE_MODE":
      return { ...state, isManualMode: !state.isManualMode }
    case "SET_MESSAGES":
      return { ...state, messages: action.payload }
    default:
      return state
  }
}

// Context
interface ChatContextType {
  state: ChatState
  setSession: (sessionId: string) => void
  addMessage: (message: Message) => void
  addMessageWithDetails: (message: ChatMessageWithDetails) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  clearMessages: () => void
  toggleMode: () => void
  setMessages: (messages: Message[]) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

// Provider component
export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState)

  const setSession = (sessionId: string) => {
    dispatch({ type: "SET_SESSION", payload: sessionId })
  }

  const addMessage = (message: Message) => {
    dispatch({ type: "ADD_MESSAGE", payload: message })
  }

  const addMessageWithDetails = (message: ChatMessageWithDetails) => {
    dispatch({ type: "ADD_MESSAGE_WITH_DETAILS", payload: message })
  }

  const setLoading = (isLoading: boolean) => {
    dispatch({ type: "SET_LOADING", payload: isLoading })
  }

  const setError = (error: string | null) => {
    dispatch({ type: "SET_ERROR", payload: error })
  }

  const clearMessages = () => {
    dispatch({ type: "CLEAR_MESSAGES" })
  }

  const toggleMode = () => {
    dispatch({ type: "TOGGLE_MODE" })
  }

  const setMessages = (messages: Message[]) => {
    dispatch({ type: "SET_MESSAGES", payload: messages })
  }

  return (
    <ChatContext.Provider
      value={{
        state,
        setSession,
        addMessage,
        addMessageWithDetails,
        setLoading,
        setError,
        clearMessages,
        toggleMode,
        setMessages
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

// Custom hook to use the chat context
export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
}
