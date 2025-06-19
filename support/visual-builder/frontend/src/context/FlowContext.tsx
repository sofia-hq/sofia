import { createContext, useContext, useState, ReactNode } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { StepNodeData, ToolNodeData, FlowGroupData } from '../types';

interface FlowContextType {
  editingNode: string | null;
  editingNodeType: 'step' | 'tool' | null;
  editingNodeData: StepNodeData | ToolNodeData | null;
  editingFlow: string | null;
  editingFlowData: FlowGroupData | null;
  nodes: Node[];
  edges: Edge[];
  setEditingNode: (nodeId: string | null, nodeType: 'step' | 'tool' | null, nodeData: StepNodeData | ToolNodeData | null) => void;
  setEditingFlow: (flowId: string | null, flowData: FlowGroupData | null) => void;
  updateNodeData: (nodeId: string, data: Partial<StepNodeData | ToolNodeData>) => void;
  updateFlowData: (flowId: string, data: Partial<FlowGroupData>) => void;
}

const FlowContext = createContext<FlowContextType | undefined>(undefined);

interface FlowProviderProps {
  children: ReactNode;
  nodes: Node[];
  edges: Edge[];
  onUpdateNode: (nodeId: string, data: Partial<StepNodeData | ToolNodeData>) => void;
  onUpdateFlow?: (flowId: string, data: Partial<FlowGroupData>) => void;
}

export function FlowProvider({ children, nodes, edges, onUpdateNode, onUpdateFlow }: FlowProviderProps) {
  const [editingNode, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeType, setEditingNodeType] = useState<'step' | 'tool' | null>(null);
  const [editingNodeData, setEditingNodeData] = useState<StepNodeData | ToolNodeData | null>(null);
  const [editingFlow, setEditingFlowId] = useState<string | null>(null);
  const [editingFlowData, setEditingFlowData] = useState<FlowGroupData | null>(null);

  const setEditingNode = (nodeId: string | null, nodeType: 'step' | 'tool' | null, nodeData: StepNodeData | ToolNodeData | null) => {
    setEditingNodeId(nodeId);
    setEditingNodeType(nodeType);
    setEditingNodeData(nodeData);
  };

  const setEditingFlow = (flowId: string | null, flowData: FlowGroupData | null) => {
    setEditingFlowId(flowId);
    setEditingFlowData(flowData);
  };

  const updateNodeData = (nodeId: string, data: Partial<StepNodeData | ToolNodeData>) => {
    onUpdateNode(nodeId, data);
    setEditingNode(null, null, null);
  };

  const updateFlowData = (flowId: string, data: Partial<FlowGroupData>) => {
    if (onUpdateFlow) {
      onUpdateFlow(flowId, data);
    }
    setEditingFlow(null, null);
  };

  return (
    <FlowContext.Provider value={{
      editingNode,
      editingNodeType,
      editingNodeData,
      editingFlow,
      editingFlowData,
      nodes,
      edges,
      setEditingNode,
      setEditingFlow,
      updateNodeData,
      updateFlowData,
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
