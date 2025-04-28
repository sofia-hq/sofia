import type { Node, BuiltInNode } from '@xyflow/react';
import { StepNodeData } from './StepNode';
import { ToolNodeData } from './ToolNode';

export type PositionLoggerNode = Node<{ label: string }, 'position-logger'>;
export type SofiaStepNode = Node<StepNodeData, 'step'>;
export type SofiaToolNode = Node<ToolNodeData, 'tool'>;
export type AppNode = BuiltInNode | PositionLoggerNode | SofiaStepNode | SofiaToolNode;
