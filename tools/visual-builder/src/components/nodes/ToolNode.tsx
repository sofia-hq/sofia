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

  return (
    <div className={`border rounded shadow-sm w-[200px] hover:border-blue-400 transition-colors ${
      isSelected
        ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-200'
        : hasErrors 
        ? 'bg-red-50 border-red-300' 
        : hasWarnings 
        ? 'bg-yellow-50 border-yellow-300' 
        : 'bg-blue-50 border-blue-300'
    }`}>
      {/* Header */}
      <div className={`px-3 py-2 border-b rounded-t flex items-center justify-between ${
        isSelected
          ? 'bg-blue-200 border-blue-300'
          : hasErrors 
          ? 'bg-red-100 border-red-200' 
          : hasWarnings 
          ? 'bg-yellow-100 border-yellow-200' 
          : 'bg-blue-100 border-blue-200'
      }`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Wrench className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="font-medium text-sm text-blue-800 truncate">{data.name}</span>
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
