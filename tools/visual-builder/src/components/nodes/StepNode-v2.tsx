import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Button } from '../ui/button';
import { Edit, Play } from 'lucide-react';
import { useFlowContext } from '../../context/FlowContext';
import type { StepNodeData } from '../../types';

export const StepNode = memo((props: NodeProps) => {
  const { setEditingNode } = useFlowContext();
  const data = props.data as StepNodeData;

  const handleEdit = () => {
    setEditingNode(props.id, 'step', data);
  };

  return (
    <div className="bg-white border border-gray-300 rounded shadow-sm w-[280px] hover:border-gray-400 transition-colors">
      {/* Header */}
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-sm text-gray-700">{data.step_id}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-200" onClick={handleEdit}>
          <Edit className="w-3 h-3" />
        </Button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {data.description && (
          <div className="text-sm text-gray-600 line-clamp-2">
            {data.description}
          </div>
        )}

        {data.available_tools && data.available_tools.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {data.available_tools.slice(0, 3).map((tool) => (
              <span
                key={tool}
                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                {tool}
              </span>
            ))}
            {data.available_tools.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{data.available_tools.length - 3}
              </span>
            )}
          </div>
        )}

        {data.routes && data.routes.length > 0 && (
          <div className="text-xs text-gray-500">
            Routes to: {data.routes.map(r => r.target).join(', ')}
          </div>
        )}

        {data.auto_flow && (
          <div className="text-xs text-green-600 font-medium">
            Auto Flow
          </div>
        )}
      </div>

      {/* Handles */}
      {/* Top handle for incoming step connections */}
      <Handle
        type="target"
        position={Position.Top}
        id="step-input"
        className="w-3 h-3 !bg-gray-600 border-2 border-white"
      />
      
      {/* Bottom handle for outgoing step connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="step-output"
        className="w-3 h-3 !bg-gray-600 border-2 border-white"
      />
      
      {/* Right handle for tool connections */}
      <Handle
        type="source"
        position={Position.Right}
        id="tool-output"
        className="w-2 h-2 !bg-blue-500 border-2 border-white"
      />
    </div>
  );
});

StepNode.displayName = 'StepNode';
