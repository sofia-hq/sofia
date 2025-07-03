export interface StepNodeData {
  step_id: string;
  description?: string;
  available_tools?: string[];
  routes?: Array<{
    target: string;
    condition: string;
  }>;
  auto_flow?: boolean;
  quick_suggestions?: boolean;
  examples?: DecisionExample[];
  [key: string]: unknown;
}

export type ToolType = 'custom' | 'crewai' | 'langchain' | 'pkg';

export interface ToolNodeData {
  name: string;
  description?: string;
  parameters?: Record<string, { type: string; description?: string }>;
  tool_type?: ToolType;
  tool_identifier?: string;
  kwargs?: Record<string, any>;
  [key: string]: unknown;
}

export interface ExternalTool {
  tag: string;
  name: string;
  kwargs?: Record<string, any>;
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

export interface ToolsConfig {
  tool_files?: string[];
  external_tools?: ExternalTool[];
  tool_defs?: Record<string, ToolDef>;
}

export interface AgentConfig {
  name: string;
  persona: string;
  start_step_id: string;
  steps: StepConfig[];
  flows?: FlowConfig[];
  tools?: ToolsConfig;
  llm?: LLMConfig;
}

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

export interface FlowConfig {
  flow_id: string;
  description: string;
  enters: string[];
  exits: string[];
  components?: {
    memory?: {
      llm?: LLMConfig;
      retriever?: {
        method: string;
        kwargs?: Record<string, any>;
      };
    };
  };
  metadata?: Record<string, any>;
}

export interface LLMConfig {
  provider: string;
  model: string;
}

// Flow grouping types for Phase 4
export interface FlowGroupData {
  flow_id: string;
  description: string;
  enters: string[]; // Step IDs that can enter this flow
  exits: string[];  // Step IDs that can exit this flow
  nodeIds: string[]; // IDs of nodes contained in this flow group
  components?: {
    memory?: {
      llm?: LLMConfig;
      retriever?: {
        method: string;
        kwargs?: Record<string, any>;
      };
    };
  };
  metadata?: Record<string, any>;
  // Visual properties
  collapsed?: boolean;
  color?: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface FlowContext {
  editingNode: string | null;
  editingFlow: string | null;
  setEditingNode: (nodeId: string | null) => void;
  setEditingFlow: (flowId: string | null) => void;
  updateNodeData: (nodeId: string, data: Partial<StepNodeData | ToolNodeData>) => void;
  updateFlowData: (flowId: string, data: Partial<FlowGroupData>) => void;
}

// Session state interface to match nomos.models.agent.State
export interface SessionState {
  session_id: string;
  current_step_id: string;
  history: Array<{
    role: string;
    content: string;
  } | {
    summary: string;
  } | {
    step_id: string;
  }>;
  flow_state?: any;
}
