import React from "react"
import { ChatHeader } from "@/components/ChatHeader"
import { ChatMessageList } from "@/components/ChatMessageList"
import { ChatInput } from "@/components/ChatInput"
import { useChat } from "@/context/ChatContext"
import { useWebSocket } from "@/hooks/useWebSocket"
import { Toaster } from "@/components/ui/sonner"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ChatContainer() {
  const { state } = useChat()
  const { isLoading, error } = state
  const { isConnected, reconnect } = useWebSocket()
  
  // Show error messages as toasts
  React.useEffect(() => {
    if (error) {
      console.error("Chat error:", error)
    }
  }, [error])
  
  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="flex flex-col w-full max-w-3xl h-screen border-x shadow-sm bg-background">
        {/* Header with controls */}
        <ChatHeader />
        
        {/* Connection status */}
        {!isConnected && (
          <div className="bg-amber-100 p-2 flex items-center justify-between">
            <div className="flex items-center text-amber-800">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span className="text-sm">Connection lost</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs bg-white"
              onClick={reconnect}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reconnect
            </Button>
          </div>
        )}
        
        {/* Message list */}
        <div className="flex-1 overflow-hidden">
          <ChatMessageList isTyping={isLoading} />
        </div>
        
        {/* Input area */}
        <ChatInput />
      </div>
      
      {/* Toast notifications */}
      <Toaster />
    </div>
  )
}
