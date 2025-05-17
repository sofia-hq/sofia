import type { SessionResponse, HistoryResponse, SofiaDecision } from "@/types"

// API base URL - in a real app, this would typically come from environment variables
const API_BASE_URL = "http://localhost:8000"
const WS_BASE_URL = "ws://localhost:8000"

// Type for WebSocket message handler
type WebSocketMessageHandler = (message: SofiaDecision) => void

// API Service for Sofia Agent
export const SofiaAPI = {
  // Connect to a WebSocket for real-time communication
  connectWebSocket(sessionId: string, onMessage: WebSocketMessageHandler): WebSocket {
    // For WebSocket close codes: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
    const normalCloseCodes = [1000, 1001]; // 1000 = normal, 1001 = going away (client disconnect)
    
    // Create the WebSocket connection
    console.log(`Creating WebSocket connection to ${WS_BASE_URL}/ws/${sessionId}`)
    
    // Prevent browser from buffering up WebSocket connection attempts by adding a unique query parameter
    const uniqueParam = `_t=${Date.now()}`
    const wsUrl = `${WS_BASE_URL}/ws/${sessionId}?initiate=false&${uniqueParam}`
    
    // Configure WebSocket
    const ws = new WebSocket(wsUrl)
    
    // Set a flag to track if this WebSocket instance should process events
    let isActive = true;
    
    // Buffer large binary messages if needed
    ws.binaryType = "arraybuffer";
    
    // Use addEventListener for better event handling and cleanup
    const handleOpen = (event: Event) => {
      if (!isActive) return;
      console.log("WebSocket connection established successfully", event);
      
      // Send an initial ping to test connection
      setTimeout(() => {
        if (isActive && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ ping: "connection-established" }));
          } catch (err) {
            console.error("Failed to send initial ping:", err);
          }
        }
      }, 500);
    };
    
    const handleMessage = (event: MessageEvent) => {
      if (!isActive) return;
      
      try {
        console.log("Raw WebSocket message received:", event.data);
        
        // Handle cases where the data might not be valid JSON
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(event.data);
        } catch (parseError) {
          console.error("Failed to parse WebSocket message:", parseError);
          console.log("Raw message content:", event.data);
          return;
        }
        
        // Handle pong responses (don't process these as regular messages)
        if (data.pong) {
          console.log("Received pong from server:", data.pong);
          return;
        }
        
        if (data.error) {
          console.error("WebSocket error from server:", data.error);
          return;
        }
        
        if (data.message) {
          // Get message type and convert to valid type
          const rawType = (data.type as string) || "answer";
          // Ensure the type is one of the valid types
          const messageType = (rawType === "tool_call" || rawType === "step_transition" || rawType === "unknown") 
            ? rawType 
            : "answer" as const;
            
          // Add message type information to the decision object
          const messageWithType: SofiaDecision = {
            ...data.message as Record<string, unknown>,
            type: messageType
          };
          
          // Use setTimeout to process the message asynchronously
          // This prevents potential race conditions in the stack unwinding
          setTimeout(() => {
            if (!isActive) return;
            
            console.log("Processing message:", messageType);
            try {
              onMessage(messageWithType);
              console.log("Message handler completed successfully");
            } catch (handlerError) {
              console.error("Error in message handler:", handlerError);
            }
          }, 0);
        } else {
          console.warn("WebSocket message missing expected 'message' field:", data);
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error, "Raw data:", event.data);
      }
    };
    
    const handleError = (error: Event) => {
      if (!isActive) return;
      console.error("WebSocket error details:", error);
    };
    
    const handleClose = (event: CloseEvent) => {
      if (!isActive) return;
      
      const isNormalClose = normalCloseCodes.includes(event.code);
      
      if (isNormalClose) {
        console.log(`WebSocket closed normally. Code: ${event.code}, Reason: ${event.reason || "No reason provided"}`);
      } else {
        console.warn(`WebSocket closed unexpectedly. Code: ${event.code}, Reason: ${event.reason || "No reason provided"}`);
        
        // Log detailed information for specific codes
        if (event.code === 1005) {
          console.warn("WebSocket close code 1005: No status received. This often happens when the connection is abruptly closed.");
        } else if (event.code === 1006) {
          console.warn("WebSocket close code 1006: Abnormal closure. The connection was closed abnormally.");
        } else if (event.code === 1011) {
          console.warn("WebSocket close code 1011: Server error. The server encountered an error.");
        } else if (event.code === 1012) {
          console.warn("WebSocket close code 1012: Service restart. The server is restarting.");
        } else if (event.code === 1013) {
          console.warn("WebSocket close code 1013: Try again later. The server is overloaded.");
        }
      }
    };
    
    // Register event listeners
    ws.addEventListener('open', handleOpen);
    ws.addEventListener('message', handleMessage);
    ws.addEventListener('error', handleError);
    ws.addEventListener('close', handleClose);
    
    // Create a cleanup function that will be called when this WebSocket is no longer needed
    const cleanup = () => {
      console.log("Cleaning up WebSocket event listeners");
      isActive = false;
      ws.removeEventListener('open', handleOpen);
      ws.removeEventListener('message', handleMessage);
      ws.removeEventListener('error', handleError);
      ws.removeEventListener('close', handleClose);
    };
    
    // Attach the cleanup function to the WebSocket object
    (ws as WebSocket & { cleanup: () => void }).cleanup = cleanup;
    
    return ws;
  },
  
  // Create a new session
  async createSession(initiate = true): Promise<SessionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/session?initiate=${initiate}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`)
      }
      
      return await response.json() as SessionResponse
    } catch (error) {
      console.error("Error creating session:", error)
      throw error
    }
  },
  
  // Send a message to a session
  async sendMessage(sessionId: string, content: string): Promise<SessionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ content })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error("Error sending message:", error)
      throw error
    }
  },
  
  // Get session history
  async getSessionHistory(sessionId: string): Promise<HistoryResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionId}/history`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to get session history: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error("Error getting session history:", error)
      throw error
    }
  },
  
  // End a session
  async endSession(sessionId: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to end session: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error("Error ending session:", error)
      throw error
    }
  },
  
  // Get list of available sessions
  async getSessions(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to get sessions: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error("Error getting sessions:", error)
      throw error
    }
  }
}
