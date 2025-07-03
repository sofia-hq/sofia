import { ReactFlowProvider } from '@xyflow/react';
import FlowBuilder from './components/FlowBuilder';
import { useRef, useState } from 'react';
import { ChatPopup, ChatPopupRef } from './components/ChatPopup';
import { ThemeProvider } from './context/ThemeContext';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function App() {
  const [chatOpen, setChatOpen] = useState(false);
  const chatRef = useRef<ChatPopupRef>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [builderData, setBuilderData] = useState<{
    nodes: Node[];
    edges: Edge[];
    agent: string;
    persona: string;
  }>({ nodes: [], edges: [], agent: 'my-agent', persona: 'A helpful assistant' });

  const handlePreview = (nodes: Node[], edges: Edge[], agent: string, persona: string) => {
    setBuilderData({ nodes, edges, agent, persona });
    setChatOpen(true);
  };

  const handleSave = (nodes: Node[], edges: Edge[], agent: string, persona: string) => {
    setBuilderData({ nodes, edges, agent, persona });
    if (chatOpen && chatRef.current) chatRef.current.reset();
  };

  const handleHighlightNode = (nodeId: string | null) => {
    setHighlightedNodeId(nodeId);
  };

  return (
    <ThemeProvider>
      <div className="h-screen w-screen bg-white transition-colors" style={{ backgroundColor: 'var(--background)' }}>
        <ReactFlowProvider>
          <FlowBuilder
            onPreview={handlePreview}
            onSaveConfig={handleSave}
            highlightedNodeId={highlightedNodeId}
          />
        </ReactFlowProvider>
        <ChatPopup
          ref={chatRef}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          nodes={builderData.nodes}
          edges={builderData.edges}
          agentName={builderData.agent}
          persona={builderData.persona}
          onHighlightNode={handleHighlightNode}
        />
      </div>
    </ThemeProvider>
  );
}
