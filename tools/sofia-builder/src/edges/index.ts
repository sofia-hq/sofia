import type { Edge, EdgeTypes } from '@xyflow/react';
import { RouteEdge, RouteEdgeData } from './RouteEdge';
import { ToolUsageEdge, ToolUsageEdgeData } from './ToolUsageEdge';
import { SofiaEdgeType } from '../models/sofia';

export const initialEdges: Edge[] = [];

export const edgeTypes = {
  [SofiaEdgeType.ROUTE]: RouteEdge,
  [SofiaEdgeType.TOOL_USAGE]: ToolUsageEdge,
} satisfies EdgeTypes;
