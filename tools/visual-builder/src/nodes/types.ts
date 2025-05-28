import type { Node, BuiltInNode } from '@xyflow/react';
import { StepNodeData } from './StepNode';
import { ToolNodeData } from './ToolNode';

// Add index signature to satisfy Record<string, unknown>
export type PositionLoggerNode = Node<{ label: string } & Record<string, unknown>, 'position-logger'>;
export type SofiaStepNode = Node<StepNodeData & Record<string, unknown>, 'step'>;
export type SofiaToolNode = Node<ToolNodeData & Record<string, unknown>, 'tool'>;
export type AppNode = BuiltInNode | PositionLoggerNode | SofiaStepNode | SofiaToolNode;
