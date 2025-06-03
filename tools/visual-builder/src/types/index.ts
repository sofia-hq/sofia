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
  [key: string]: unknown;
}

export interface AgentConfig {
  name: string;
  persona: string;
  start_step_id: string;
  steps: StepConfig[];
  flows?: FlowConfig[];
  tool_arg_descriptions?: Record<string, Record<string, string>>;
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

export interface FlowContext {
  editingNode: string | null;
  setEditingNode: (nodeId: string | null) => void;
  updateNodeData: (nodeId: string, data: Partial<StepNodeData | ToolNodeData>) => void;
}
