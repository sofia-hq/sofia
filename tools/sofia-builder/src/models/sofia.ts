/**
 * Sofia agent data models
 * TypeScript interfaces that correspond to Sofia's Python models
 */

// Represents a route (transition) from one step to another
export interface Route {
  target: string;
  condition: string;
}

// Represents a step in the agent's flow
export interface Step {
  step_id: string;
  description: string;
  routes: Route[];
  available_tools: string[];
}

// Represents a tool parameter
export interface ToolParameter {
  type: string;
  description?: string;
  default?: any;
}

// Represents a tool that can be used by the agent
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
}

// Represents tool argument descriptions
export interface ToolArgDescriptions {
  [toolName: string]: {
    [paramName: string]: string;
  };
}

// Complete Sofia agent configuration
export interface SofiaConfig {
  name: string;
  persona: string;
  start_step_id: string;
  steps: Step[];
  tool_arg_descriptions?: ToolArgDescriptions;
}

// Node types for React Flow
export enum SofiaNodeType {
  STEP = 'step',
  TOOL = 'tool',
}

// Edge type for React Flow
export enum SofiaEdgeType {
  ROUTE = 'route',
  TOOL_USAGE = 'tool-usage',
}

// Connection types for Flow connections
export enum SofiaConnectionType {
  STEP_TO_STEP = 'step-to-step',
  STEP_TO_TOOL = 'step-to-tool',
}