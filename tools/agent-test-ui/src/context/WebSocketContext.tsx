import { useRef, useEffect, useState, useCallback } from "react"
import type { ReactNode } from "react"
import { useChat } from "@/context/ChatContext"
import { SofiaAPI } from "@/services/api" 
import { toast } from "sonner"
import { extractMessageFromDecision } from "@/utils/messageUtils"
import type { SofiaDecision } from "@/types"
import { WebSocketContext } from "@/context/WebSocketContextValue"

// Maximum number of reconnection attempts
const MAX_RECONNECT_ATTEMPTS = 5  // Increased from 3 to 5
// Reconnection delay in milliseconds (starts with 1s, then increases)
const INITIAL_RECONNECT_DELAY = 1000

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { state, addMessage, addMessageWithDetails, setError, setLoading } = useChat()
  const { sessionId, isManualMode } = state
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Handle incoming WebSocket messages
  const handleWsMessage = useCallback((decision: SofiaDecision) => {
    console.log("Received WebSocket message:", decision)
    
    // Skip empty initialization messages
    if (!decision.action && !decision.input && !decision.reasoning) {
      console.log("Skipping empty initialization message")
      return
    }
    
    const agentMessage = extractMessageFromDecision(decision, isManualMode)
    
    if (isManualMode) {
      addMessageWithDetails({
        ...agentMessage,
        decision
      })
    } else {
      addMessage(agentMessage)
    }
    
    // Add specific handling based on message type
    if (decision.type) {
      console.log(`Handling message of type: ${decision.type}`)
      
      switch (decision.type) {
        case "tool_call":
          // Handle tool calls specifically if needed
          console.log("Processing tool call:", decision.tool_name)
          break
          
        case "step_transition":
          // Handle step transitions specifically if needed
          console.log("Processing step transition to:", decision.next_step_id)
          break
          
        case "answer":
        default:
          // Regular answer handling is done by default
          break
      }
    }
    
    // Turn off loading state if we get a response
    setLoading(false)
  }, [addMessage, addMessageWithDetails, isManualMode, setLoading])
  
  // Clear any pending timeouts and intervals
  const cleanupTimers = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    
    // Clear connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
      connectionTimeoutRef.current = null
    }
  }, [])
  
  // Manual reconnection function - declared earlier to avoid dependency cycles
  const reconnect = useCallback(() => {
    // Prevent multiple simultaneous reconnection attempts
    if (reconnectTimeoutRef.current) {
      console.log("Reconnection already in progress, skipping duplicate request")
      return;
    }
    
    console.log("Reconnection requested")
    reconnectAttemptsRef.current = 0
    cleanupTimers()
    
    if (sessionId) {
      console.log(`Setting up new WebSocket connection for session: ${sessionId}`)
      
      // Clean up previous connection
      if (wsRef.current) {
        // Only close if not already closing or closed
        if (wsRef.current.readyState !== WebSocket.CLOSING && wsRef.current.readyState !== WebSocket.CLOSED) {
          try {
            wsRef.current.close(1000, "Reconnecting - closing old connection")
            console.log("Successfully closed previous connection")
          } catch (closeError) {
            console.error("Error closing previous WebSocket connection:", closeError)
          }
        }
        wsRef.current = null
      }
      
      // Set up new connection after a small delay to let the old one fully close
      reconnectTimeoutRef.current = setTimeout(() => {
        try {
          console.log("Creating new WebSocket connection...")
          wsRef.current = SofiaAPI.connectWebSocket(sessionId, handleWsMessage)
          reconnectTimeoutRef.current = null
          
          // Event handlers will be set up in the useEffect below
          console.log("WebSocket connection initialized")
        } catch (err) {
          console.error("WebSocket connection error:", err)
          setIsConnected(false)
          setError(err instanceof Error ? err.message : "Failed to connect to agent")
          toast.error("Could not connect to the Sofia agent")
          reconnectTimeoutRef.current = null
          
          // Schedule another reconnect attempt if we haven't exceeded max attempts
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current)
            console.log(`Scheduling automatic reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`)
            
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++
              reconnect()
            }, delay)
          }
        }
      }, 1000) // Increased delay to ensure clean slate (from 500ms to 1000ms)
    }
  }, [sessionId, handleWsMessage, cleanupTimers, setError])
  
  // Setup WebSocket connection and ping mechanism
  const setupPing = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("Cannot setup ping - WebSocket not in OPEN state")
      return;
    }
    
    // Clear any existing ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    
    console.log("Setting up ping mechanism")
    
    // Set up a ping every 15 seconds to keep the connection alive (increased from 10s)
    pingIntervalRef.current = setInterval(() => {
      // Double-check the WebSocket is still open before sending a ping
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          console.log("Sending ping to keep connection alive")
          
          // Track the ping timestamp
          const pingTimestamp = new Date().toISOString()
          
          // Send a ping message that the backend will recognize
          wsRef.current.send(JSON.stringify({ ping: pingTimestamp }))
          
          // Set a timeout to check if we get a pong back - if not, the connection might be dead
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current)
          }
          
          connectionTimeoutRef.current = setTimeout(() => {
            console.warn("No pong received in time, connection might be stale")
            // Only reconnect if the WebSocket is still referenced and in OPEN state
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              console.log("Closing stale connection and attempting to reconnect")
              
              try {
                wsRef.current.close(1000, "No pong received")
              } catch (err) {
                console.error("Error closing WebSocket:", err)
              }
              
              setIsConnected(false)
              
              if (!reconnectTimeoutRef.current) {
                reconnect()
              }
            }
          }, 8000) // 8 second timeout to receive pong (increased from 5s)
        } catch (error) {
          console.error("Error sending ping:", error)
          // If we can't send a ping, the connection might be dead
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current)
            pingIntervalRef.current = null
          }
          
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            setIsConnected(false)
            // Try to reconnect only if not already reconnecting
            if (!reconnectTimeoutRef.current) {
              reconnect()
            }
          }
        }
      } else {
        // WebSocket not open, clear interval
        console.log("WebSocket not open, stopping ping interval")
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }
      }
    }, 10000) // 10 seconds
  }, [reconnect])

  // Update the reconnect function to set up event handlers
  useEffect(() => {
    // This effect is for completing the WebSocket setup after the reconnect function is defined
    if (!wsRef.current || !sessionId) return;
    
    // We need to keep track of the current WebSocket instance for cleanup
    const currentWs = wsRef.current;
    
    // Create a flag to track if this WebSocket instance is still valid
    let isActive = true;
    
    // Set up event handlers
    const handleOpen = () => {
      if (!isActive) return; // Ignore if this WebSocket is no longer the active one
      
      console.log("WebSocket connection established")
      setIsConnected(true)
      reconnectAttemptsRef.current = 0 // Reset reconnect attempts on successful connection
      
      // Setup ping mechanism for keepalive
      setupPing()
      
      // Send an immediate test ping
      try {
        currentWs.send(JSON.stringify({ ping: "connection-established" }))
      } catch (err) {
        console.error("Failed to send test ping after reconnection", err)
      }
    };
    
    const handleError = (error: Event) => {
      if (!isActive) return; // Ignore if this WebSocket is no longer the active one
      
      console.error("WebSocket error:", error)
      setIsConnected(false)
    };
    
    const handleClose = (event: CloseEvent) => {
      if (!isActive) return; // Ignore if this WebSocket is no longer the active one
      
      console.log("WebSocket closed:", event.code, event.reason || "No reason provided")
      setIsConnected(false)
      
      // Clean up timers
      cleanupTimers()
      
      // Don't attempt to reconnect for normal closures or if this isn't the active WebSocket
      if (event.code !== 1000 && event.code !== 1001) {
        // Only attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current)
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            // Only reconnect if this WebSocket is still the active one
            if (isActive && !reconnectTimeoutRef.current) {
              reconnect()
            }
          }, delay)
        } else {
          setError(`Connection lost after ${MAX_RECONNECT_ATTEMPTS} attempts. Please try refreshing the page.`)
          toast.error("Connection lost")
        }
      }
    };
    
    // Attach event handlers
    currentWs.addEventListener('open', handleOpen);
    currentWs.addEventListener('error', handleError);
    currentWs.addEventListener('close', handleClose);
    
    // Return cleanup function
    return () => {
      // Mark this WebSocket as no longer active
      isActive = false;
      
      // Remove event handlers to prevent memory leaks
      currentWs.removeEventListener('open', handleOpen);
      currentWs.removeEventListener('error', handleError);
      currentWs.removeEventListener('close', handleClose);
    };
  }, [sessionId, setupPing, cleanupTimers, reconnect, setError])
  
  // Effect to set up WebSocket when sessionId changes
  useEffect(() => {
    // Only create a connection if we have a session ID and no connection is currently established or in progress
    if (sessionId && !wsRef.current && !reconnectTimeoutRef.current) {
      console.log(`Initial WebSocket connection for session: ${sessionId}`)
      reconnect()
    }
    
    // Cleanup function to run when component unmounts or sessionId changes
    return () => {
      console.log("Cleaning up WebSocket connection")
      if (wsRef.current) {
        // Call the cleanup function to remove event listeners if it exists
        const ws = wsRef.current as WebSocket & { cleanup?: () => void };
        if (ws.cleanup) {
          ws.cleanup();
        }
        
        // Close the connection if it's still open
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          try {
            ws.close(1000, "Component unmounting or session changing")
          } catch (err) {
            console.error("Error closing WebSocket:", err)
          }
        }
        wsRef.current = null
      }
      cleanupTimers()
      setIsConnected(false)
    }
  }, [sessionId, reconnect, cleanupTimers])

  // Send a message through WebSocket
  const sendMessage = (message: string): boolean => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not connected, readyState:", wsRef.current?.readyState)
      toast.error("Connection is not established. Attempting to reconnect...")
      
      // Try to reconnect automatically if not already reconnecting
      if (!reconnectTimeoutRef.current) {
        reconnect()
      }
      return false
    }
    
    try {
      // Ensure we're sending proper JSON with the message field
      const messageData = JSON.stringify({ message })
      console.log("Sending WebSocket message:", messageData)
      
      // Send the JSON string
      wsRef.current.send(messageData)
      
      // Add a small delay before any further processing to prevent race conditions
      setTimeout(() => {
        console.log("Message send operation completed")
      }, 250);
      
      // Reset reconnect attempts on successful message
      reconnectAttemptsRef.current = 0
      return true
    } catch (error) {
      console.error("Error sending message via WebSocket:", error)
      toast.error("Failed to send message")
      
      // Only try to reconnect if we have an actual connection error, not just a message error
      if (wsRef.current?.readyState !== WebSocket.OPEN && !reconnectTimeoutRef.current) {
        reconnect()
      }
      return false
    }
  }

  return (
    <WebSocketContext.Provider
      value={{
        sendMessage,
        isConnected,
        reconnect
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}
