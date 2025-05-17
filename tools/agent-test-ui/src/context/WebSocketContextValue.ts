import { createContext } from "react"

interface WebSocketContextType {
  sendMessage: (message: string) => boolean
  isConnected: boolean
  reconnect: () => void
}

export const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)
