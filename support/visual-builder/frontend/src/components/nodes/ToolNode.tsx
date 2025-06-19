import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Button } from '../ui/button';
import { Edit, Wrench, AlertTriangle, AlertCircle } from 'lucide-react';
import { useFlowContext } from '../../context/FlowContext';
import { validateToolNode } from '../../utils/validation';
import type { ToolNodeData, ToolType } from '../../types';

export const ToolNode = memo((props: NodeProps) => {
  const { setEditingNode } = useFlowContext();
  const data = props.data as ToolNodeData;
  const isSelected = props.selected;

  // Validate the node data
  const validation = validateToolNode(data);
  const hasErrors = !validation.isValid;
  const hasWarnings = validation.warnings.length > 0;

  const handleEdit = () => {
    setEditingNode(props.id, 'tool', data);
  };

  const paramCount = data.parameters ? Object.keys(data.parameters).length : 0;

  const colorMap: Record<ToolType | 'custom', any> = {
    custom: {
      container: 'bg-blue-50 border-blue-300 hover:border-blue-400',
      selected: 'bg-blue-100 border-blue-500 ring-2 ring-blue-200',
      header: 'bg-blue-100 border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-600',
    },
    crewai: {
      container: 'bg-purple-50 border-purple-300 hover:border-purple-400',
      selected: 'bg-purple-100 border-purple-500 ring-2 ring-purple-200',
      header: 'bg-purple-100 border-purple-200',
      text: 'text-purple-800',
      icon: 'text-purple-600',
    },
    langchain: {
      container: 'bg-green-50 border-green-300 hover:border-green-400',
      selected: 'bg-green-100 border-green-500 ring-2 ring-green-200',
      header: 'bg-green-100 border-green-200',
      text: 'text-green-800',
      icon: 'text-green-600',
    },
    pkg: {
      container: 'bg-teal-50 border-teal-300 hover:border-teal-400',
      selected: 'bg-teal-100 border-teal-500 ring-2 ring-teal-200',
      header: 'bg-teal-100 border-teal-200',
      text: 'text-teal-800',
      icon: 'text-teal-600',
    },
  };

  const colors = colorMap[data.tool_type || 'custom'];

  return (
    <div
      className={`border rounded shadow-sm w-[200px] transition-colors ${
        isSelected
          ? colors.selected
          : hasErrors
          ? 'bg-red-50 border-red-300'
          : hasWarnings
          ? 'bg-yellow-50 border-yellow-300'
          : colors.container
      }`}
    >
      {/* Header */}
      <div
        className={`px-3 py-2 border-b rounded-t flex items-center justify-between ${
          isSelected
            ? colors.selected
            : hasErrors
            ? 'bg-red-100 border-red-200'
            : hasWarnings
            ? 'bg-yellow-100 border-yellow-200'
            : colors.header
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Wrench className={`w-4 h-4 flex-shrink-0 ${colors.icon}`} />
          <span className={`font-medium text-sm truncate ${colors.text}`}>{data.name}</span>
          {hasErrors && (
            <div title="Node has validation errors">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            </div>
          )}
          {hasWarnings && !hasErrors && (
            <div title="Node has validation warnings">
              <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-blue-200 flex-shrink-0" onClick={handleEdit}>
          <Edit className="w-3 h-3" />
        </Button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {data.description && (
          <div className={`text-sm ${colors.text} line-clamp-2`}>{data.description}</div>
        )}

        {data.tool_type && data.tool_type !== 'custom' && data.tool_identifier && (
          <div className={`text-xs ${colors.text} break-all`}>@{data.tool_type}/{data.tool_identifier}</div>
        )}

        {paramCount > 0 && (
          <div className={`text-xs ${colors.text}`}>{paramCount} parameter{paramCount !== 1 ? 's' : ''}</div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="tool-input"
        className={`w-2 h-2 border-2 border-white ${colors.icon}`}
      />
    </div>
  );
});

ToolNode.displayName = 'ToolNode';
