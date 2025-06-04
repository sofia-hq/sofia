import { memo } from 'react';
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';

export const ToolEdge = memo((props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: '#3b82f6',
        strokeWidth: 1.5,
        strokeDasharray: '5,5'
      }}
    />
  );
});

ToolEdge.displayName = 'ToolEdge';
