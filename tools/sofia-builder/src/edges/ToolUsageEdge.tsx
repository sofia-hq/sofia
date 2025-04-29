import { BaseEdge, Edge, EdgeProps, getBezierPath } from '@xyflow/react';
import { CSSProperties } from 'react';

export interface ToolUsageEdgeData extends Edge<{ toolName: string }> {
  toolName: string;
}

export function ToolUsageEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {} as CSSProperties,
  markerEnd,
}: EdgeProps<ToolUsageEdgeData>) {
  const curvature = 0.6;
  
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature,
  });

  return (
    <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
  );
}