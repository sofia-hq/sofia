import React from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScrollToBottomButtonProps {
  containerRef: React.RefObject<HTMLDivElement>
  isVisible: boolean
}

export function ScrollToBottomButton({ 
  containerRef, 
  isVisible 
}: ScrollToBottomButtonProps) {
  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth"
      })
    }
  }

  return (
    <Button
      variant="secondary"
      size="icon"
      className={cn(
        "absolute bottom-4 right-4 rounded-full shadow-md transition-opacity duration-200",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onClick={scrollToBottom}
      title="Scroll to bottom"
    >
      <ChevronDown className="h-4 w-4" />
    </Button>
  )
}
