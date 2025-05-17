import React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"

interface ErrorDisplayProps {
  message: string
  onRetry?: () => void
}

export function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive-foreground mb-4">
      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-medium mb-1">Error</h4>
        <p className="text-sm">{message}</p>
        
        {onRetry && (
          <button 
            onClick={onRetry}
            className="mt-3 inline-flex items-center text-xs font-medium gap-1 hover:underline"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
