import { memo, useState } from 'react';
import { Button } from './ui/button';
import { ChevronDown, ChevronRight, Settings, Eye, EyeOff } from 'lucide-react';
import type { FlowGroupData } from '../types';

interface FlowGroupProps {
  id: string;
  data: FlowGroupData;
  nodes: any[]; // Nodes contained in this flow
  onEdit: () => void;
  onToggleCollapse: () => void;
  onToggleVisibility: () => void;
  selected?: boolean;
  style?: React.CSSProperties;
}

export const FlowGroup = memo(({
  id: _,
  data,
  nodes,
  onEdit,
  onToggleCollapse,
  onToggleVisibility,
  selected = false,
  style
}: FlowGroupProps) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleToggleVisibility = () => {
    setIsVisible(!isVisible);
    onToggleVisibility();
  };

  // Calculate bounding box for contained nodes
  const getBoundingBox = () => {
    if (nodes.length === 0) {
      return { x: 0, y: 0, width: 400, height: 300 };
    }

    const padding = 40;
    const minX = Math.min(...nodes.map(n => n.position.x)) - padding;
    const minY = Math.min(...nodes.map(n => n.position.y)) - padding;
    const maxX = Math.max(...nodes.map(n => n.position.x + (n.type === 'step' ? 280 : 200))) + padding;
    const maxY = Math.max(...nodes.map(n => n.position.y + (n.type === 'step' ? 140 : 100))) + padding;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  };

  const boundingBox = getBoundingBox();

  return (
    <div
      className={`absolute border-2 border-dashed rounded-lg bg-gray-50/20 ${
        selected
          ? 'border-blue-400 bg-blue-50/10'
          : isVisible
            ? 'border-gray-300'
            : 'border-gray-200'
      } ${!isVisible ? 'opacity-40' : ''}`}
      style={{
        left: boundingBox.x,
        top: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height,
        pointerEvents: 'none', // Allow clicks to pass through to nodes
        zIndex: -1, // Behind nodes but above background
        ...style
      }}
    >
      {/* Flow Header */}
      <div
        className={`absolute flex items-center gap-2 px-3 py-1 rounded-lg shadow-sm border ${
          selected
            ? 'bg-blue-100 border-blue-400'
            : 'bg-white border-gray-300'
        }`}
        style={{
          left: 8,
          top: -32,
          pointerEvents: 'auto',
          zIndex: 10 // Above everything else
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onToggleCollapse}
        >
          {data.collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </Button>

        <span className="text-sm font-medium text-gray-700">
          {data.flow_id}
        </span>

        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleToggleVisibility}
            title={isVisible ? 'Hide flow nodes' : 'Show flow nodes'}
          >
            {isVisible ? (
              <Eye className="w-3 h-3" />
            ) : (
              <EyeOff className="w-3 h-3" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onEdit}
            title="Edit flow configuration"
          >
            <Settings className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Flow Description */}
      {data.description && (
        <div
          className="absolute text-xs text-gray-500 bg-white px-2 py-1 rounded border max-w-sm truncate"
          style={{
            left: 8,
            bottom: -24,
            pointerEvents: 'auto',
            zIndex: 10
          }}
          title={data.description}
        >
          {data.description}
        </div>
      )}

      {/* Entry/Exit Points Indicators */}
      {data.enters.length > 0 && (
        <div className="absolute -left-2 top-4 flex flex-col gap-1">
          {data.enters.map((stepId) => (
            <div
              key={`entry-${stepId}`}
              className="w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"
              title={`Entry point: ${stepId}`}
            />
          ))}
        </div>
      )}

      {data.exits.length > 0 && (
        <div className="absolute -right-2 top-4 flex flex-col gap-1">
          {data.exits.map((stepId) => (
            <div
              key={`exit-${stepId}`}
              className="w-3 h-3 bg-red-500 border-2 border-white rounded-full shadow-sm"
              title={`Exit point: ${stepId}`}
            />
          ))}
        </div>
      )}

      {/* Node count when collapsed */}
      {data.collapsed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-sm">
            <div className="text-sm font-medium text-gray-700">{data.flow_id}</div>
            <div className="text-xs text-gray-500">{nodes.length} nodes</div>
          </div>
        </div>
      )}
    </div>
  );
});

FlowGroup.displayName = 'FlowGroup';
