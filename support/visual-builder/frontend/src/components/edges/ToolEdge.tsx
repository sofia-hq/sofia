import { memo, useState, useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';

export const ToolEdge = memo((props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const { setEdges } = useReactFlow();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 15, // Add rounded corners for tool edges too
  });

  const handleDeleteEdge = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges((edges: any) => edges.filter((edge: any) => edge.id !== id));
  }, [id, setEdges]);

  const handleEdgeContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteButton(true);
    // Hide after 3 seconds
    setTimeout(() => setShowDeleteButton(false), 3000);
  }, []);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: '#3b82f6',
          strokeWidth: 1.5,
          strokeDasharray: '5,5'
        }}
        onContextMenu={handleEdgeContextMenu}
      />

      {/* Delete button when edge is right-clicked */}
      {showDeleteButton && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 1000,
            }}
          >
            <button
              onClick={handleDeleteEdge}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg"
              title="Delete tool connection"
            >
              ×
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

ToolEdge.displayName = 'ToolEdge';
