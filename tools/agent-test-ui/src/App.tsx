import { ChatProvider } from "@/context/ChatContext"
import { WebSocketProvider } from "@/context/WebSocketContext"
import { ChatContainer } from "@/components/ChatContainer"

function App() {
  return (
    <ChatProvider>
      <WebSocketProvider>
        <ChatContainer />
      </WebSocketProvider>
    </ChatProvider>
  )
}

export default App
