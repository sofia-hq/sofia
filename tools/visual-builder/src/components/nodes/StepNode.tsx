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
    <div className={`bg-white border rounded shadow-sm w-[280px] hover:border-gray-400 transition-colors ${
      isSelected 
        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
        : hasErrors 
        ? 'border-red-300 bg-red-50' 
        : hasWarnings 
        ? 'border-yellow-300 bg-yellow-50' 
        : 'border-gray-300'
    }`}>
      {/* Header */}
      <div className={`px-3 py-2 border-b rounded-t flex items-center justify-between ${
        isSelected
          ? 'bg-blue-100 border-blue-200'
          : hasErrors 
          ? 'bg-red-100 border-red-200' 
          : hasWarnings 
          ? 'bg-yellow-100 border-yellow-200' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Play className="w-4 h-4 text-gray-600 flex-shrink-0" />
          <span className="font-medium text-sm text-gray-700 truncate">{data.step_id}</span>
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
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-200 flex-shrink-0" onClick={handleEdit}>
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
                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full truncate max-w-[80px]"
                title={tool}
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
          <div className="text-xs text-gray-500 truncate">
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
