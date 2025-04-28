import { Handle, Position, NodeProps } from '@xyflow/react';

// Type definition for ToolNode data
export interface ToolNodeData {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export function ToolNode({ data, selected }: NodeProps<ToolNodeData>) {
  return (
    <div className={`node tool-node ${selected ? 'selected' : ''}`}>
      <div className="node-header tool-node-header">
        <div className="node-title">{data.name}</div>
      </div>
      <div className="node-content">
        <div className="node-description">
          {data.description ? data.description.substring(0, 80) + (data.description.length > 80 ? '...' : '') : 'No description'}
        </div>
        {data.parameters && Object.keys(data.parameters).length > 0 && (
          <div className="node-parameters">
            <small>Parameters: {Object.keys(data.parameters).join(', ')}</small>
          </div>
        )}
      </div>
      
      {/* Tool connection handle on the top */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="tool-target"
        className="node-handle tool-handle"
        style={{ left: '50%' }}
      />
    </div>
  );
}