import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import type { FlowGroupData } from '../../types';

export const GroupNode = memo((props: NodeProps) => {
  const data = props.data as unknown as FlowGroupData;
  const isSelected = props.selected;

  // Get the color from the flow group data, fallback to default blue
  const groupColor = data.color || '#3B82F6';

  // Convert hex to rgba for text colors
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div
      className={`group-node ${isSelected ? 'selected' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent', // Remove background to avoid double overlay
        border: 'none', // Remove border to avoid double overlay
        borderRadius: 0,
        position: 'relative',
        pointerEvents: 'none', // Allow child nodes to be interacted with
      }}
    >
      {/* Title text above the group - left aligned */}
      <div
        style={{
          position: 'absolute',
          top: -32, // Moved up from -24
          left: 0,
          fontSize: '12px',
          fontWeight: 'bold',
          color: hexToRgba(groupColor, 0.8), // Dynamic color matching overlay
          pointerEvents: 'auto', // Allow title to be clickable
          zIndex: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {data.flow_id ? `Flow: ${data.flow_id}` : 'Flow Group'}
      </div>
      {/* Description text below title if it exists */}
      {data.description && (
        <div
          style={{
            position: 'absolute',
            top: -18, // Moved up from -10
            left: 0,
            fontSize: '10px',
            fontWeight: 'normal',
            color: hexToRgba(groupColor, 0.6), // Dynamic color with more transparency
            pointerEvents: 'auto',
            zIndex: 1,
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.description}
        </div>
      )}
    </div>
  );
});

GroupNode.displayName = 'GroupNode';
