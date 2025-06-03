import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Button } from '../ui/button';
import { Edit3, Tool } from 'lucide-react';
import type { ToolNodeData } from '../../models/nomos';

export const ToolNode = memo(({ data, selected }: NodeProps<ToolNodeData>) => {
  return (
    <div
      className={`
        relative bg-white border-2 rounded-lg shadow-sm min-w-[180px] p-4
        ${selected ? 'border-gray-800' : 'border-gray-300'}
        hover:border-gray-600 transition-colors
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-gray-600 !border-2 !border-white"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Tool className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900">Tool</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-6 h-6 p-0 hover:bg-gray-100"
        >
          <Edit3 className="w-3 h-3" />
        </Button>
      </div>

      {/* Tool ID */}
      <div className="mb-2">
        <div className="text-xs text-gray-500 mb-1">Tool ID</div>
        <div className="text-sm font-mono bg-gray-50 px-2 py-1 rounded border">
          {data.tool_id}
        </div>
      </div>

      {/* Description (if exists) */}
      {data.description && (
        <div className="mb-2">
          <div className="text-xs text-gray-500 mb-1">Description</div>
          <div className="text-xs text-gray-700 line-clamp-2">
            {data.description}
          </div>
        </div>
      )}

      {/* Package Reference (if exists) */}
      {data.package_reference && (
        <div className="mb-2">
          <div className="text-xs text-gray-500 mb-1">Package</div>
          <div className="text-xs font-mono bg-gray-50 px-2 py-1 rounded border">
            {data.package_reference}
          </div>
        </div>
      )}

      {/* Parameters Count */}
      {data.parameters && Object.keys(data.parameters).length > 0 && (
        <div className="text-xs text-gray-500">
          Parameters: {Object.keys(data.parameters).length}
        </div>
      )}
    </div>
  );
});
