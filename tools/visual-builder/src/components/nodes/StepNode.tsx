import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Button } from '../ui/button';
import { Edit3, Settings } from 'lucide-react';
import type { StepNodeData } from '../../models/nomos';

export const StepNode = memo(({ data, selected }: NodeProps<StepNodeData>) => {
  return (
    <div
      className={`
        relative bg-white border-2 rounded-lg shadow-sm min-w-[200px] p-4
        ${selected ? 'border-gray-800' : 'border-gray-300'}
        hover:border-gray-600 transition-colors
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-600 !border-2 !border-white"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900">Step</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-6 h-6 p-0 hover:bg-gray-100"
        >
          <Edit3 className="w-3 h-3" />
        </Button>
      </div>

      {/* Step ID */}
      <div className="mb-2">
        <div className="text-xs text-gray-500 mb-1">Step ID</div>
        <div className="text-sm font-mono bg-gray-50 px-2 py-1 rounded border">
          {data.step_id}
        </div>
      </div>

      {/* Persona (if exists) */}
      {data.persona && (
        <div className="mb-2">
          <div className="text-xs text-gray-500 mb-1">Persona</div>
          <div className="text-xs text-gray-700 line-clamp-2">
            {data.persona}
          </div>
        </div>
      )}

      {/* Tools Count */}
      {data.tools && data.tools.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-gray-500">
            Tools: {data.tools.length}
          </div>
        </div>
      )}

      {/* Routes Count */}
      {data.routes && Object.keys(data.routes).length > 0 && (
        <div className="text-xs text-gray-500">
          Routes: {Object.keys(data.routes).length}
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-600 !border-2 !border-white"
      />
    </div>
  );
});
