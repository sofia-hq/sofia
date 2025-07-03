import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Button } from '../ui/button';
import { Edit, Play, AlertTriangle, AlertCircle } from 'lucide-react';
import { useFlowContext } from '../../context/FlowContext';
import { validateStepNode } from '../../utils/validation';
import type { StepNodeData } from '../../types';

export const StepNode = memo((props: NodeProps) => {
  const { setEditingNode } = useFlowContext();
  const data = props.data as StepNodeData;
  const isSelected = props.selected;

  // Validate the node data
  const validation = validateStepNode(data);
  const hasErrors = !validation.isValid;
  const hasWarnings = validation.warnings.length > 0;

  const handleEdit = () => {
    setEditingNode(props.id, 'step', data);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border rounded shadow-sm w-[280px] hover:border-gray-400 dark:hover:border-gray-500 transition-colors ${
      isSelected
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-400/30'
        : hasErrors
        ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
        : hasWarnings
        ? 'border-yellow-300 dark:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
        : 'border-gray-300 dark:border-gray-600'
    }`}>
      {/* Header */}
      <div className={`px-3 py-2 border-b rounded-t flex items-center justify-between ${
        isSelected
          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
          : hasErrors
          ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700'
          : hasWarnings
          ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700'
          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
      }`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Play className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
          <span className="font-medium text-sm text-gray-700 dark:text-gray-300 truncate">{data.step_id}</span>
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
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0" onClick={handleEdit}>
          <Edit className="w-3 h-3" />
        </Button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {data.description && (
          <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {data.description}
          </div>
        )}

        {data.available_tools && data.available_tools.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {data.available_tools.slice(0, 3).map((tool) => (
              <span
                key={tool}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded-full truncate max-w-[80px]"
                title={tool}
              >
                {tool}
              </span>
            ))}
            {data.available_tools.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                +{data.available_tools.length - 3}
              </span>
            )}
          </div>
        )}

        {data.routes && data.routes.length > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            Routes to: {data.routes.map(r => r.target).join(', ')}
          </div>
        )}

        {data.auto_flow && (
          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
            Auto Flow
          </div>
        )}

        {data.quick_suggestions && (
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            Quick Suggestions
          </div>
        )}

        {data.examples && data.examples.length > 0 && (
          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
            {data.examples.length} Example{data.examples.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Handles */}
      {/* Top handle for incoming step connections */}
      <Handle
        type="target"
        position={Position.Top}
        id="step-input"
        className="w-3 h-3 !bg-gray-600 dark:!bg-gray-400 border-2 border-white dark:border-gray-800"
      />

      {/* Bottom handle for outgoing step connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="step-output"
        className="w-3 h-3 !bg-gray-600 dark:!bg-gray-400 border-2 border-white dark:border-gray-800"
      />

      {/* Right handle for tool connections */}
      <Handle
        type="source"
        position={Position.Right}
        id="tool-output"
        className="w-2 h-2 !bg-blue-500 dark:!bg-blue-400 border-2 border-white dark:border-gray-800"
      />
    </div>
  );
});

StepNode.displayName = 'StepNode';
