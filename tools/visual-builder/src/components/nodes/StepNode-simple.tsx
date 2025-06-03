import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Button } from '../ui/button';
import { Edit, Settings } from 'lucide-react';

interface StepNodeData {
  step_id: string;
  persona?: string;
  tools?: string[];
  routes?: Record<string, string>;
}

export const StepNode = memo((props: NodeProps<StepNodeData>) => {
  const { data } = props;
  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg shadow-sm min-w-[200px] hover:border-gray-400 transition-colors">
      {/* Header */}
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-sm">Step</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Edit className="w-3 h-3" />
        </Button>
      </div>
      
      {/* Content */}
      <div className="p-3">
        <div className="text-sm font-medium text-gray-900 mb-1">
          {data.step_id}
        </div>
        {data.persona && (
          <div className="text-xs text-gray-600 mb-2 line-clamp-2">
            {data.persona}
          </div>
        )}
        {data.tools && data.tools.length > 0 && (
          <div className="text-xs text-gray-500">
            Tools: {data.tools.join(', ')}
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
      />
    </div>
  );
});

StepNode.displayName = 'StepNode';
