import { Dot } from "lucide-react"
import { cn } from "@/lib/utils"

export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn("justify-left flex space-x-1", className)}>
      <div className="rounded-lg bg-primary/10 p-3">
        <div className="flex -space-x-2.5">
          <Dot className="h-5 w-5 text-primary animate-typing-dot-bounce" />
          <Dot className="h-5 w-5 text-primary animate-typing-dot-bounce [animation-delay:90ms]" />
          <Dot className="h-5 w-5 text-primary animate-typing-dot-bounce [animation-delay:180ms]" />
        </div>
      </div>
    </div>
  )
}
