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
      container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 hover:border-blue-400 dark:hover:border-blue-500',
      selected: 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-400/30',
      header: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
      text: 'text-blue-800 dark:text-blue-300',
      icon: 'text-blue-600 dark:text-blue-400',
    },
    crewai: {
      container: 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-600 hover:border-purple-400 dark:hover:border-purple-500',
      selected: 'bg-purple-100 dark:bg-purple-900/30 border-purple-500 dark:border-purple-400 ring-2 ring-purple-200 dark:ring-purple-400/30',
      header: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700',
      text: 'text-purple-800 dark:text-purple-300',
      icon: 'text-purple-600 dark:text-purple-400',
    },
    langchain: {
      container: 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-600 hover:border-green-400 dark:hover:border-green-500',
      selected: 'bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-400 ring-2 ring-green-200 dark:ring-green-400/30',
      header: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-700',
      text: 'text-green-800 dark:text-green-300',
      icon: 'text-green-600 dark:text-green-400',
    },
    pkg: {
      container: 'bg-teal-50 dark:bg-teal-900/20 border-teal-300 dark:border-teal-600 hover:border-teal-400 dark:hover:border-teal-500',
      selected: 'bg-teal-100 dark:bg-teal-900/30 border-teal-500 dark:border-teal-400 ring-2 ring-teal-200 dark:ring-teal-400/30',
      header: 'bg-teal-100 dark:bg-teal-900/30 border-teal-200 dark:border-teal-700',
      text: 'text-teal-800 dark:text-teal-300',
      icon: 'text-teal-600 dark:text-teal-400',
    },
  };

  const colors = colorMap[data.tool_type || 'custom'];

  return (
    <div
      className={`border rounded shadow-sm w-[200px] transition-colors ${
        isSelected
          ? colors.selected
          : hasErrors
          ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-600'
          : hasWarnings
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-600'
          : colors.container
      }`}
    >
      {/* Header */}
      <div
        className={`px-3 py-2 border-b rounded-t flex items-center justify-between ${
          isSelected
            ? colors.selected
            : hasErrors
            ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700'
            : hasWarnings
            ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700'
            : colors.header
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Wrench className={`w-4 h-4 flex-shrink-0 ${colors.icon}`} />
          <span className={`font-medium text-sm truncate ${colors.text}`}>{data.name}</span>
          {hasErrors && (
            <div title="Node has validation errors">
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
            </div>
          )}
          {hasWarnings && !hasErrors && (
            <div title="Node has validation warnings">
              <AlertTriangle className="w-4 h-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-blue-200 dark:hover:bg-blue-700 flex-shrink-0" onClick={handleEdit}>
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
        className={`w-2 h-2 border-2 border-white dark:border-gray-800 ${colors.icon}`}
      />
    </div>
  );
});

ToolNode.displayName = 'ToolNode';
