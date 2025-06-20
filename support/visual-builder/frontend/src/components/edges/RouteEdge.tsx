import { memo, useState, useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { shouldUseOffsetPath, calculateBidirectionalEdgePaths } from '../../utils/bidirectionalEdges';

export const RouteEdge = memo((props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(data?.condition || ''));
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const { setEdges, getEdges } = useReactFlow();

  // Check if this edge is part of a bidirectional pair and should use C-shaped path
  const edges = getEdges();
  const useBidirectionalPath = shouldUseOffsetPath(id, edges, sourceY, targetY);

  let edgePath, labelX, labelY;

  if (useBidirectionalPath) {
    // Use custom path for bidirectional edges
    const bidirectionalInfo = {
      forwardEdge: null,
      reverseEdge: null,
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    };

    const pathInfo = calculateBidirectionalEdgePaths(bidirectionalInfo, false);
    edgePath = pathInfo.edgePath;
    labelX = pathInfo.labelX;
    labelY = pathInfo.labelY;
  } else {
    // Use normal smooth step path
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 20,
    });
  }

  const handleLabelClick = useCallback(() => {
    setIsEditing(true);
    setEditValue(String(data?.condition || ''));
  }, [data?.condition]);

  const handleSave = useCallback(() => {
    setEdges((edges: any) =>
      edges.map((edge: any) =>
        edge.id === id
          ? { ...edge, data: { ...edge.data, condition: editValue } }
          : edge
      )
    );
    setIsEditing(false);
  }, [id, editValue, setEdges]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(String(data?.condition || ''));
  }, [data?.condition]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

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

  // Calculate a small offset to prevent exact overlaps
  const edgeIndex = parseInt(id.split('-').pop() || '0', 10) || Math.abs(id.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
  const offsetDirection = edgeIndex % 4;
  let labelOffsetX = 0;
  let labelOffsetY = -10; // Default slight upward offset

  // Apply different offsets based on edge index to spread labels
  switch (offsetDirection) {
    case 0:
      labelOffsetY = -15;
      break;
    case 1:
      labelOffsetX = 20;
      labelOffsetY = -5;
      break;
    case 2:
      labelOffsetY = 5;
      break;
    case 3:
      labelOffsetX = -20;
      labelOffsetY = -5;
      break;
  }

  const adjustedLabelX = labelX + labelOffsetX;
  const adjustedLabelY = labelY + labelOffsetY;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: '#374151',
          strokeWidth: 2,
          markerEnd: 'url(#arrow-marker)',
        }}
        onContextMenu={handleEdgeContextMenu}
      />

      {/* Delete button when edge is right-clicked */}
      {showDeleteButton && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 30}px)`,
              pointerEvents: 'all',
              zIndex: 1000,
            }}
          >
            <button
              onClick={handleDeleteEdge}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg"
              title="Delete edge"
            >
              ×
            </button>
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Condition label */}
      {(data?.condition || isEditing) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${adjustedLabelX}px,${adjustedLabelY}px)`,
              pointerEvents: 'all',
              zIndex: 999,
            }}
          >
            {isEditing ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="bg-white border border-blue-300 rounded px-2 py-1 text-xs text-gray-700 shadow-sm min-w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <div
                onClick={handleLabelClick}
                className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 shadow-sm cursor-pointer hover:border-gray-400 hover:bg-gray-50 max-w-48 truncate"
                title={`Click to edit condition: ${data?.condition || 'Add condition...'}`}
              >
                {String(data?.condition || 'Add condition...')}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

RouteEdge.displayName = 'RouteEdge';
