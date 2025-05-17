import React from "react"
import { Button } from "@/components/ui/button"
import { useChat } from "@/context/ChatContext"
import { EyeIcon, EyeOffIcon } from "lucide-react" 
import { cn } from "@/lib/utils"

export function ModeToggle() {
  const { state, toggleMode } = useChat()
  const { isManualMode } = state

  return (
    <div className="flex items-center space-x-4">
      <span className="text-sm text-muted-foreground">Mode:</span>
      <Button
        variant="outline"
        size="sm"
        onClick={toggleMode}
        className={cn(
          "relative transition-colors duration-200",
          isManualMode ? "bg-primary/10 hover:bg-primary/20" : ""
        )}
        title={isManualMode 
          ? "Manual mode: Shows tool calls, reasoning, and step transitions" 
          : "Auto mode: Only shows the final agent responses"}
      >
        <span className="mr-2">
          {isManualMode ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
        </span>
        {isManualMode ? "Manual" : "Auto"}
      </Button>
    </div>
  )
}
