import React, { useRef, useEffect, useState } from "react"
import { ChatMessage } from "@/components/ChatMessage"
import { TypingIndicator } from "@/components/ui/typing-indicator"
import { useChat } from "@/context/ChatContext"
import { ScrollToBottomButton } from "@/components/ScrollToBottomButton"
import type { Message } from "@/types"

interface ChatMessageListProps {
  isTyping?: boolean
}

export function ChatMessageList({ isTyping = false }: ChatMessageListProps) {
  const { state } = useChat()
  const { messages, isManualMode, sessionId } = state
  const messageContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  
  // Show instruction message if no messages and no session
  const showInstructions = messages.length === 0 && !sessionId
  
  // Auto scroll to the bottom when new messages arrive
  useEffect(() => {
    if (messageContainerRef.current && !showInstructions) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight
    }
  }, [messages, isTyping, showInstructions])
  
  // Handle scroll events to show/hide the scroll button
  const handleScroll = () => {
    if (!messageContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = messageContainerRef.current
    const bottomThreshold = 100 // px from bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < bottomThreshold
    
    setShowScrollButton(!isNearBottom)
  }
  
  return (
    <div 
      className="flex flex-col overflow-y-auto p-4 space-y-4 h-full relative"
      ref={messageContainerRef}
      onScroll={handleScroll}
    >
      {showInstructions ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <h2 className="text-2xl font-bold mb-2">Welcome to Sofia Agent Chat</h2>
          <p className="text-muted-foreground mb-4">
            Click the "New Chat" button above to start a conversation with the Sofia agent.
          </p>
          <div className="bg-muted/30 p-4 rounded-lg text-left max-w-md mx-auto">
            <h3 className="font-medium mb-2">Mode Options:</h3>
            <ul className="space-y-2">
              <li>
                <strong>Auto:</strong> Shows just the final agent responses
              </li>
              <li>
                <strong>Manual:</strong> Shows tool calls, reasoning, and step transitions
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <ChatMessage 
              key={index} 
              message={message as Message & { decision?: any }} 
              isManualMode={isManualMode} 
            />
          ))}
          {isTyping && <TypingIndicator />}
          
          {/* Scroll to bottom button */}
          <ScrollToBottomButton 
            containerRef={messageContainerRef} 
            isVisible={showScrollButton} 
          />
        </>
      )}
    </div>
  )
}
