import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';
import { CSSProperties } from 'react';

export interface ToolUsageEdgeData extends Record<string, unknown> {
  toolName: string;
}

export interface ToolUsageEdgeProps extends EdgeProps {
  data?: ToolUsageEdgeData;
  style?: CSSProperties;
}

export function ToolUsageEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: ToolUsageEdgeProps) {
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
    <BaseEdge path={edgePath} markerEnd={markerEnd} style={style as CSSProperties} />
  );
}
