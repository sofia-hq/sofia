import React from "react"
import type { Message, SofiaDecision } from "@/types"
import { cn } from "@/lib/utils"
import { DecisionDetails } from "@/components/DecisionDetails"
import { User, Bot, AlertTriangle, Info } from "lucide-react"
import { ErrorDisplay } from "@/components/ErrorDisplay"
import { useChat } from "@/context/ChatContext"

interface ChatMessageProps {
  message: Message & { decision?: SofiaDecision }
  isManualMode: boolean
}

export function ChatMessage({ message, isManualMode }: ChatMessageProps) {
  const isUser = message.role === "user"
  const isSystem = message.role === "system"
  const isError = message.role === "error"
  const isAssistant = message.role === "assistant"
  
  // Handle different message types based on the decision type
  const getMessageStyle = () => {
    if (isAssistant && message.decision?.type) {
      switch (message.decision.type) {
        case "tool_call":
          return "bg-blue-50 text-blue-900 border border-blue-200"
        case "step_transition":
          return "bg-green-50 text-green-900 border border-green-200"
        default:
          return "bg-muted text-foreground"
      }
    }
    
    return isUser ? "bg-primary text-primary-foreground" : 
           isSystem ? "bg-secondary text-secondary-foreground border border-secondary/50" :
           isError ? "bg-destructive text-destructive-foreground" :
           "bg-muted text-foreground"
  }

  return (
    <div className={cn(
      "flex w-full mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex max-w-[80%]",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className={cn(
          "flex items-center justify-center h-8 w-8 rounded-full",
          isUser ? "bg-primary text-primary-foreground ml-2" : 
          isSystem ? "bg-secondary text-secondary-foreground mr-2" :
          isError ? "bg-destructive text-destructive-foreground mr-2" :
          "bg-muted text-foreground mr-2"
        )}>
          {isUser ? <User className="h-4 w-4" /> : 
           isSystem ? <Info className="h-4 w-4" /> :
           isError ? <AlertTriangle className="h-4 w-4" /> :
           <Bot className="h-4 w-4" />}
        </div>
        
        {/* Message Bubble */}
        <div className={cn(
          "flex flex-col overflow-hidden",
          isUser ? "items-end" : "items-start"
        )}>
          <div className={cn(
            "px-4 py-3 rounded-lg shadow-sm",
            getMessageStyle()
          )}>
            {isError ? (
              <div className="flex flex-col">
                <span className="font-semibold mb-1">Error</span>
                <span>{message.content}</span>
              </div>
            ) : isAssistant && message.decision?.type === "tool_call" ? (
              <div className="flex flex-col">
                <span className="font-semibold mb-1">Tool Call: {message.decision.tool_name}</span>
                <span>{message.content}</span>
              </div>
            ) : isAssistant && message.decision?.type === "step_transition" ? (
              <div className="flex flex-col">
                <span className="font-semibold mb-1">Step Transition: {message.decision.next_step_id}</span>
                <span>{message.content}</span>
              </div>
            ) : (
              message.content
            )}
          </div>
          
          {/* Timestamp */}
          {message.timestamp && (
            <div className="text-xs text-muted-foreground mt-1 px-1">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          
          {/* Decision Details (only shown in Manual mode) */}
          {isManualMode && isAssistant && message.decision && (
            <DecisionDetails decision={message.decision} />
          )}
        </div>
      </div>
    </div>
  )
}
