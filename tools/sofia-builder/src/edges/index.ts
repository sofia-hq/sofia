import type { Edge } from '@xyflow/react';
import { SofiaEdgeType } from '../models/sofia';
import { RouteEdge as RouteEdgeComponent } from './RouteEdge';
import { ToolUsageEdge as ToolUsageEdgeComponent } from './ToolUsageEdge';

export const initialEdges: Edge[] = [];

type ReactFlowEdgeTypes = {
  [key in SofiaEdgeType]: React.ComponentType<any>;
};

export const edgeTypes: ReactFlowEdgeTypes = {
  [SofiaEdgeType.ROUTE]: RouteEdgeComponent,
  [SofiaEdgeType.TOOL_USAGE]: ToolUsageEdgeComponent,
};
