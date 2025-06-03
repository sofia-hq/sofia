import { createContext, useContext, useState, ReactNode } from 'react';
import type { StepNodeData, ToolNodeData } from '../types';

interface FlowContextType {
  editingNode: string | null;
  editingNodeType: 'step' | 'tool' | null;
  editingNodeData: StepNodeData | ToolNodeData | null;
  setEditingNode: (nodeId: string | null, nodeType: 'step' | 'tool' | null, nodeData: StepNodeData | ToolNodeData | null) => void;
  updateNodeData: (nodeId: string, data: Partial<StepNodeData | ToolNodeData>) => void;
}

const FlowContext = createContext<FlowContextType | undefined>(undefined);

interface FlowProviderProps {
  children: ReactNode;
  onUpdateNode: (nodeId: string, data: Partial<StepNodeData | ToolNodeData>) => void;
}

export function FlowProvider({ children, onUpdateNode }: FlowProviderProps) {
  const [editingNode, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeType, setEditingNodeType] = useState<'step' | 'tool' | null>(null);
  const [editingNodeData, setEditingNodeData] = useState<StepNodeData | ToolNodeData | null>(null);

  const setEditingNode = (nodeId: string | null, nodeType: 'step' | 'tool' | null, nodeData: StepNodeData | ToolNodeData | null) => {
    setEditingNodeId(nodeId);
    setEditingNodeType(nodeType);
    setEditingNodeData(nodeData);
  };

  const updateNodeData = (nodeId: string, data: Partial<StepNodeData | ToolNodeData>) => {
    onUpdateNode(nodeId, data);
    setEditingNode(null, null, null);
  };

  return (
    <FlowContext.Provider value={{
      editingNode,
      editingNodeType,
      editingNodeData,
      setEditingNode,
      updateNodeData,
    }}>
      {children}
    </FlowContext.Provider>
  );
}

export function useFlowContext() {
  const context = useContext(FlowContext);
  if (context === undefined) {
    throw new Error('useFlowContext must be used within a FlowProvider');
  }
  return context;
}
