import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Button } from '../ui/button';
import { Edit, Wrench, AlertTriangle, AlertCircle } from 'lucide-react';
import { useFlowContext } from '../../context/FlowContext';
import { validateToolNode } from '../../utils/validation';
import type { ToolNodeData } from '../../types';

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

  const typeColors: Record<string, { bg: string; border: string; text: string }> = {
    custom: { bg: 'blue', border: 'blue', text: 'blue' },
    crewai: { bg: 'purple', border: 'purple', text: 'purple' },
    langchain: { bg: 'teal', border: 'teal', text: 'teal' },
    package: { bg: 'green', border: 'green', text: 'green' }
  };

  const colors = typeColors[data.tool_type || 'custom'];

  return (
    <div className={`border rounded shadow-sm w-[200px] hover:border-${colors.border}-400 transition-colors ${
      isSelected
        ? `bg-${colors.bg}-100 border-${colors.border}-500 ring-2 ring-${colors.bg}-200`
        : hasErrors
        ? 'bg-red-50 border-red-300'
        : hasWarnings
        ? 'bg-yellow-50 border-yellow-300'
        : `bg-${colors.bg}-50 border-${colors.border}-300`
    }`}>
      {/* Header */}
      <div className={`px-3 py-2 border-b rounded-t flex items-center justify-between ${
        isSelected
          ? `bg-${colors.bg}-200 border-${colors.border}-300`
          : hasErrors
          ? 'bg-red-100 border-red-200'
          : hasWarnings
          ? 'bg-yellow-100 border-yellow-200'
          : `bg-${colors.bg}-100 border-${colors.border}-200`
      }`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Wrench className={`w-4 h-4 text-${colors.text}-600 flex-shrink-0`} />
          <span className={`font-medium text-sm text-${colors.text}-800 truncate`}>{data.name}</span>
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
          <div className={`text-sm text-${colors.text}-700 line-clamp-2`}>
            {data.description}
          </div>
        )}

        {data.tool_type && data.tool_type !== 'custom' && data.reference && (
          <div className={`text-xs text-${colors.text}-600 break-all`}>{`@${data.tool_type}/${data.reference}`}</div>
        )}

        {paramCount > 0 && (
          <div className={`text-xs text-${colors.text}-600`}>
            {paramCount} parameter{paramCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="tool-input"
        className={`w-2 h-2 !bg-${colors.bg}-500 border-2 border-white`}
      />
    </div>
  );
});

ToolNode.displayName = 'ToolNode';
