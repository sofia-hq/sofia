import React, { useState, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { useChat } from "@/context/ChatContext"
import { useWebSocket } from "@/hooks/useWebSocket"
import { Send } from "lucide-react"
import { toast } from "sonner"

export function ChatInput() {
  const [inputValue, setInputValue] = useState("")
  const { state, addMessage, setLoading, setError } = useChat()
  const { sessionId, isLoading } = state
  const { sendMessage } = useWebSocket()
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!inputValue.trim() || !sessionId || isLoading) return
    
    const userMessage = {
      role: "user" as const,
      content: inputValue,
      timestamp: new Date()
    }
    
    // Add user message to the chat
    addMessage(userMessage)
    
    // Save the input before clearing it
    const messageToSend = inputValue.trim();
    setInputValue("")
    setLoading(true)
    
    try {
      // Send message through WebSocket
      console.log("Attempting to send message:", messageToSend);
      const success = sendMessage(messageToSend);
      
      if (!success) {
        throw new Error("Failed to send message via WebSocket");
      }
      
      // Response will be handled by the WebSocketProvider
      // We don't turn off loading here as that will happen when response comes
    } catch (error) {
      console.error("Error sending message:", error);
      setError(error instanceof Error ? error.message : "Failed to send message");
      
      // Add error message to the chat
      addMessage({
        role: "error",
        content: "Failed to send message. Please check your connection and try again.",
        timestamp: new Date()
      });
      
      // Show toast
      toast.error("Failed to send message");
      setLoading(false);
    }
  }
  
  return (
    <form 
      onSubmit={handleSubmit}
      className="flex items-end gap-2 p-4 border-t w-full"
    >
      <textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={!sessionId ? "Start a new chat to begin..." : "Type a message..."}
        rows={1}
        className="flex-1 p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
          }
        }}
        disabled={isLoading || !sessionId}
      />
      <Button 
        type="submit" 
        size="icon" 
        disabled={isLoading || !sessionId || !inputValue.trim()}
        className="transition-all duration-200"
      >
        {isLoading ? (
          <span className="animate-spin">
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  )
}
