// TypeScript models for Nomos configuration entities

export interface DecisionExample {
  context: string;
  decision: string;
  visibility?: 'always' | 'never' | 'dynamic';
}

export interface StepConfig {
  step_id: string;
  description: string;
  available_tools?: string[];
  routes?: Array<{
    target: string;
    condition: string;
  }>;
  auto_flow?: boolean;
  quick_suggestions?: boolean;
  examples?: DecisionExample[];
}

export interface ArgDef {
  key: string;
  desc?: string;
  type?: string;
}

export interface ToolDef {
  desc?: string;
  args?: ArgDef[];
}

export interface ToolConfig {
  name: string;
  description?: string;
  parameters?: Record<string, ToolParameter>;
  package_reference?: string;
  tool_type?: 'custom' | 'crewai' | 'langchain' | 'pkg';
  tool_identifier?: string;
  kwargs?: Record<string, any>;
}

export interface ToolParameter {
  type: string;
  description?: string;
  required?: boolean;
  default?: any;
}

export interface FlowConfig {
  flow_id: string;
  entry_step?: string;
  exit_step?: string;
  memory?: FlowMemoryConfig;
  components?: Record<string, any>;
}

export interface FlowMemoryConfig {
  type: string;
  capacity?: number;
  retrieval_k?: number;
}

export interface LLMConfig {
  provider: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
  base_url?: string;
}

export interface NomosConfig {
  name: string;
  persona?: string;
  start_step_id: string;
  steps: StepConfig[];
  flows?: FlowConfig[];
  tools?: {
    tool_files?: string[];
    external_tools?: Array<{ tag: string; name: string; kwargs?: Record<string, any> }>;
    tool_defs?: Record<string, ToolDef>;
  };
  llm?: LLMConfig;
  max_iter?: number;
  max_errors?: number;
  session_memory?: {
    type: string;
    [key: string]: any;
  };
}

// React Flow specific node data interfaces
export interface StepNodeData extends StepConfig {
  position: { x: number; y: number };
  flowId?: string;
}

export interface ToolNodeData extends ToolConfig {
  position: { x: number; y: number };
}

export interface FlowGroupData {
  flow_id: string;
  entry_step?: string;
  exit_step?: string;
  memory?: FlowMemoryConfig;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  nodeIds: string[];
}

// Node types for React Flow
export type NodeType = 'step' | 'tool' | 'flow-group';

export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: StepNodeData | ToolNodeData | FlowGroupData;
  selected?: boolean;
  dragging?: boolean;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  label?: string;
}

// Builder state interface
export interface BuilderState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  flows: FlowGroupData[];
  selectedNodes: string[];
  editingNode: string | null;
  config: NomosConfig;
  isDirty: boolean;
}
