export interface StepNodeData {
  step_id: string;
  description?: string;
  available_tools?: string[];
  routes?: Array<{
    target: string;
    condition: string;
  }>;
  auto_flow?: boolean;
  [key: string]: unknown;
}

export interface ToolNodeData {
  name: string;
  description?: string;
  parameters?: Record<string, { type: string; description?: string }>;
  tool_type?: 'custom' | 'crewai' | 'langchain' | 'package';
  reference?: string;
  kwargs?: Record<string, any>;
  [key: string]: unknown;
}

export interface ExternalTool {
  tag: string;
  name: string;
  kwargs?: Record<string, any>;
}

export interface ToolsConfig {
  tool_files?: string[];
  external_tools?: ExternalTool[];
  tool_arg_descriptions?: Record<string, Record<string, string>>;
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

export interface StepConfig {
  step_id: string;
  description: string;
  available_tools?: string[];
  routes?: Array<{
    target: string;
    condition: string;
  }>;
  auto_flow?: boolean;
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
