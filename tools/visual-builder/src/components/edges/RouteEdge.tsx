import { memo, useState, useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';

export const RouteEdge = memo((props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data?.condition || '');
  const { setEdges } = useReactFlow();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleLabelClick = useCallback(() => {
    setIsEditing(true);
    setEditValue(data?.condition || '');
  }, [data?.condition]);

  const handleSave = useCallback(() => {
    setEdges((edges) =>
      edges.map((edge) =>
        edge.id === id
          ? { ...edge, data: { ...edge.data, condition: editValue } }
          : edge
      )
    );
    setIsEditing(false);
  }, [id, editValue, setEdges]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(data?.condition || '');
  }, [data?.condition]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  return (
    <>
      <BaseEdge 
        id={id} 
        path={edgePath} 
        style={{ 
          stroke: '#374151', 
          strokeWidth: 2,
          markerEnd: 'url(#arrow-marker)'
        }} 
      />
      {(data?.condition || isEditing) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
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
                className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 shadow-sm cursor-pointer hover:border-gray-400 hover:bg-gray-50"
                title="Click to edit condition"
              >
                {data?.condition || 'Add condition...'}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

RouteEdge.displayName = 'RouteEdge';
