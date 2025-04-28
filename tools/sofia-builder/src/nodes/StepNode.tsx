import { Handle, Position, NodeProps } from '@xyflow/react';
import { SofiaNodeType } from '../models/sofia';

// Type definition for StepNode data
export interface StepNodeData {
  label: string;
  description: string;
  step_id: string;
  available_tools: string[];
}

export function StepNode({ data, selected }: NodeProps<StepNodeData>) {
  return (
    <div className={`node step-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <div className="node-title">{data.label || data.step_id}</div>
      </div>
      <div className="node-content">
        <div className="node-description">
          {data.description ? data.description.substring(0, 100) + (data.description.length > 100 ? '...' : '') : 'No description'}
        </div>
        {data.available_tools && data.available_tools.length > 0 && (
          <div className="node-tools">
            <small>Tools: {data.available_tools.join(', ')}</small>
          </div>
        )}
      </div>
      
      {/* Input handle on the left side */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="step-target"
        className="node-handle"
        style={{ top: '50%' }}
      />
      
      {/* Output handle on the right side */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="step-source"
        className="node-handle"
        style={{ top: '50%' }}
      />
      
      {/* Tool connection handle on the bottom */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="tool-source"
        className="node-handle tool-handle"
        style={{ left: '50%' }}
      />
    </div>
  );
}