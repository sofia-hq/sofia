import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { History, Loader2, RefreshCw } from "lucide-react"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useChat } from "@/context/ChatContext"
import { SofiaAPI } from "@/services/api"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import type { HistoryResponse } from "@/types"

export function SessionHistory() {
  const { state, setSession, setMessages } = useChat()
  const { sessionId } = state
  const [isOpen, setIsOpen] = useState(false)
  const [sessionList, setSessionList] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch session list when sheet is opened
  useEffect(() => {
    if (isOpen) {
      fetchSessionList()
    }
  }, [isOpen])

  // Fetch list of available sessions
  const fetchSessionList = async () => {
    setIsLoading(true)
    try {
      const sessions = await SofiaAPI.getSessions()
      setSessionList(sessions || [])
    } catch (error) {
      console.error("Error fetching sessions:", error)
      toast.error("Failed to load session history")
    } finally {
      setIsLoading(false)
    }
  }

  // Load a specific session
  const loadSession = async (sessionId: string) => {
    setIsLoading(true)
    try {
      const response = await SofiaAPI.getSessionHistory(sessionId) as HistoryResponse
      
      if (response && response.history) {
        // Update state with session and messages
        setSession(sessionId)
        setMessages(response.history)
        setIsOpen(false)
        toast.success("Session loaded successfully")
      } else {
        toast.error("Failed to load session data")
      }
    } catch (error) {
      console.error("Error loading session:", error)
      toast.error("Failed to load session")
    } finally {
      setIsLoading(false)
    }
  }

  // Format timestamp (helper function)
  const formatDate = (timestampStr: string) => {
    try {
      const date = new Date(timestampStr)
      return date.toLocaleString()
    } catch {
      return "Unknown date"
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="View session history"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">History</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Session History</SheetTitle>
        </SheetHeader>
        
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={fetchSessionList} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
        
        <ScrollArea className="h-[80vh] mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessionList.length > 0 ? (
            <div className="space-y-2">
              {sessionList.map((sid) => (
                <div
                  key={sid}
                  className={`
                    p-3 rounded-md border cursor-pointer transition-colors
                    ${sid === sessionId ? 'bg-primary/10 border-primary/30' : 'hover:bg-muted'}
                  `}
                  onClick={() => sid !== sessionId && loadSession(sid)}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm truncate">{sid}</div>
                    {sid === sessionId && (
                      <span className="text-xs bg-primary/20 px-2 py-0.5 rounded text-primary-foreground">Current</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No previous sessions found
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
