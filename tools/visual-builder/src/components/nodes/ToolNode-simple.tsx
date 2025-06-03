import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Button } from '../ui/button';
import { Edit, Wrench } from 'lucide-react';
import { useFlowContext } from '../../context/FlowContext';
import type { ToolNodeData } from '../../types';

export const ToolNode = memo((props: NodeProps) => {
  const { setEditingNode } = useFlowContext();
  const data = props.data as ToolNodeData;

  const handleEdit = () => {
    setEditingNode(props.id, 'tool', data);
  };

  const paramCount = data.parameters ? Object.keys(data.parameters).length : 0;

  return (
    <div className="bg-blue-50 border border-blue-300 rounded shadow-sm w-[200px] hover:border-blue-400 transition-colors">
      {/* Header */}
      <div className="bg-blue-100 px-3 py-2 border-b border-blue-200 rounded-t flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-sm text-blue-800">{data.name}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-blue-200" onClick={handleEdit}>
          <Edit className="w-3 h-3" />
        </Button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {data.description && (
          <div className="text-sm text-blue-700 line-clamp-2">
            {data.description}
          </div>
        )}

        {paramCount > 0 && (
          <div className="text-xs text-blue-600">
            {paramCount} parameter{paramCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="tool-input"
        className="w-2 h-2 !bg-blue-500 border-2 border-white"
      />
    </div>
  );
});

ToolNode.displayName = 'ToolNode';
