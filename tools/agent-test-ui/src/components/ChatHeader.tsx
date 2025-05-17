import React from "react"
import { ModeToggle } from "@/components/ModeToggle"
import { Button } from "@/components/ui/button"
import { useChat } from "@/context/ChatContext"
import { SofiaAPI } from "@/services/api"
import { RefreshCw, X, Download } from "lucide-react"
import { SessionHistory } from "@/components/SessionHistory"
import type { SofiaDecision } from "@/types"
import { toast } from "sonner"

export function ChatHeader() {
  const { state, setSession, clearMessages, setLoading, setError, addMessage, addMessageWithDetails } = useChat()
  const { sessionId, isLoading, isManualMode, messages } = state
  
  // Start a new session
  const startNewSession = async () => {
    if (isLoading) return
    
    setLoading(true)
    try {
      // Clear existing messages
      clearMessages()
      
      // Create a new session (the WebSocket will be created by the WebSocketProvider)
      const response = await SofiaAPI.createSession(true)
      setSession(response.session_id)
      
      // Extract the initial message from the response
      if ('message' in response && typeof response.message === 'object') {
        const decision = response.message as SofiaDecision
        
        // Add welcome message
        const systemMessage = {
          role: "system" as const,
          content: "New conversation started.",
          timestamp: new Date()
        }
        addMessage(systemMessage)
        
        // Process agent's initial message
        const agentMessage = {
          role: "assistant" as const,
          content: decision.input || "Hello! How can I help you today?",
          timestamp: new Date()
        }
        
        if (isManualMode) {
          addMessageWithDetails({
            ...agentMessage,
            decision
          })
        } else {
          addMessage(agentMessage)
        }
      }
    } catch (error) {
      console.error("Error starting session:", error)
      setError(error instanceof Error ? error.message : "Failed to start session")
      toast.error("Failed to start new session")
      
      // Add error message
      addMessage({
        role: "error",
        content: "Failed to start a new session. Please try again.",
        timestamp: new Date()
      })
    } finally {
      setLoading(false)
    }
  }
  
  // End the current session
  const endSession = async () => {
    if (!sessionId || isLoading) return
    
    setLoading(true)
    try {
      // End the session (the WebSocket will be closed by the WebSocketProvider)
      await SofiaAPI.endSession(sessionId)
      clearMessages()
      setSession("")
      
      // Add system message
      addMessage({
        role: "system",
        content: "Conversation ended.",
        timestamp: new Date()
      })
    } catch (error) {
      console.error("Error ending session:", error)
      setError(error instanceof Error ? error.message : "Failed to end session")
      toast.error("Failed to end session")
    } finally {
      setLoading(false)
    }
  }

  // Export conversation as JSON
  const exportConversation = () => {
    if (messages.length === 0) return

    // Prepare clean export data
    const exportData = messages.map((message) => ({
      role: message.role,
      content: message.content,
      timestamp: message.timestamp ? message.timestamp.toISOString() : undefined
    }))
    
    // Create file
    const dataStr = JSON.stringify(exportData, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`
    
    // Generate filename with date
    const date = new Date().toISOString().split('T')[0]
    const filename = `sofia-chat-export-${date}.json`
    
    // Create download link
    const downloadLink = document.createElement('a')
    downloadLink.setAttribute('href', dataUri)
    downloadLink.setAttribute('download', filename)
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }
  
  return (
    <div className="flex items-center justify-between p-4 border-b w-full bg-background/90 backdrop-blur-sm sticky top-0 z-10">
      <h1 className="text-xl font-bold">Sofia Agent Chat</h1>
      
      <div className="flex items-center gap-4">
        <ModeToggle />
        
        <Button 
          variant="outline"
          size="sm"
          onClick={startNewSession}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          New Chat
        </Button>
        
        {sessionId && (
          <>
            <Button 
              variant="outline"
              size="sm"
              onClick={endSession}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              End Chat
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={exportConversation}
              disabled={messages.length === 0 || isLoading}
              title="Export conversation as JSON"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </>
        )}
        
        <SessionHistory />
      </div>
    </div>
  )
}
