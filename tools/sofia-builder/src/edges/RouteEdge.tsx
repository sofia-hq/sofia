import { BaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { CSSProperties } from 'react';

// Type definition for Sofia route edge data
export interface RouteEdgeData extends Record<string, unknown> {
  condition: string;
}

export interface RouteEdgeProps extends EdgeProps {
  data?: RouteEdgeData;
  style?: CSSProperties;
}

export function RouteEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: RouteEdgeProps) {
  const curvature = 0.6;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature
  });

  // Cap the condition string
  const edgeData = data as RouteEdgeData;
  const condition = edgeData?.condition || '';
  const cappedCondition = condition.length > 32 ? condition.slice(0, 32) + '…' : condition;

  return (
    <g>
      {/* Invisible thick path for pointer events */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        style={{ cursor: 'pointer' }}
        pointerEvents="stroke"
      />
      {/* Actual edge */}
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style as CSSProperties} />
      {/* Edge label */}
      {cappedCondition && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 16}px)`,
              pointerEvents: 'all',
              background: 'rgba(255,255,255,0.85)',
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 12,
              border: '1px solid #ccc',
              color: '#333',
              maxWidth: 200,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              zIndex: 10,
            }}
            className="nodrag nopan sofia-edge-label"
          >
            {cappedCondition}
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  );
}
