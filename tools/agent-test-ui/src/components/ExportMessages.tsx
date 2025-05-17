import React from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useChat } from "@/context/ChatContext"
import type { Message } from "@/types"

export function ExportMessages() {
  const { state } = useChat()
  const { messages } = state

  // Export messages as JSON
  const exportAsJSON = () => {
    if (messages.length === 0) return
    
    // Prepare clean export data
    const exportData = messages.map((message: Message) => ({
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
  
  // Export messages as Markdown
  const exportAsMarkdown = () => {
    if (messages.length === 0) return
    
    // Prepare markdown content
    let markdownContent = `# Sofia Chat Export\n\nDate: ${new Date().toISOString().split('T')[0]}\n\n`
    
    // Add messages
    messages.forEach((message: Message) => {
      const timestamp = message.timestamp 
        ? `\n\n_${message.timestamp.toLocaleString()}_` 
        : ''
      
      markdownContent += `## ${message.role.charAt(0).toUpperCase() + message.role.slice(1)}\n\n${message.content}${timestamp}\n\n---\n\n`
    })
    
    // Create file
    const dataUri = `data:text/markdown;charset=utf-8,${encodeURIComponent(markdownContent)}`
    
    // Generate filename with date
    const date = new Date().toISOString().split('T')[0]
    const filename = `sofia-chat-export-${date}.md`
    
    // Create download link
    const downloadLink = document.createElement('a')
    downloadLink.setAttribute('href', dataUri)
    downloadLink.setAttribute('download', filename)
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => exportAsJSON()}
      disabled={messages.length === 0}
      title="Export conversation as JSON"
      className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Export</span>
    </Button>
  )
}
