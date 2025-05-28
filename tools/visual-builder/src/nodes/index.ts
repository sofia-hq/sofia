import type { NodeTypes } from '@xyflow/react';

import { PositionLoggerNode } from './PositionLoggerNode';
import { StepNode } from './StepNode';
import { ToolNode } from './ToolNode';
import { AppNode } from './types';
import { SofiaNodeType } from '../models/sofia';

export const initialNodes: AppNode[] = [];

export const nodeTypes = {
  'position-logger': PositionLoggerNode,
  [SofiaNodeType.STEP]: StepNode,
  [SofiaNodeType.TOOL]: ToolNode,
} satisfies NodeTypes;
