import { cn } from '../lib/utils';
import { Wrench } from 'lucide-react';
import { Handle, Position, NodeProps } from '@xyflow/react';

// Type definition for ToolNode data
export interface ToolNodeData {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export function ToolNode({ data, selected }: NodeProps<ToolNodeData>) {
  return (
    <div
      className={cn(
        'sofia-node node tool-node rounded-lg border shadow-sm bg-card text-card-foreground transition-all',
        selected ? 'selected' : '',
        selected
          ? 'ring-4 ring-primary border-primary bg-primary/10 shadow-[0_0_0_8px_#3b82f6]'
          : 'border-border',
        'hover:shadow-lg'
      )}
      data-selected={selected}
    >
      <div className="node-header tool-node-header flex items-center gap-2 px-3 py-2 border-b bg-muted rounded-t-lg">
        <Wrench className="text-primary size-4" />
        <div className="node-title font-semibold text-sm truncate flex-1">{data.name}</div>
      </div>
      <div className="node-content px-3 py-2">
        <div className="node-description text-xs text-muted-foreground mb-1">
          {data.description ? data.description.substring(0, 80) + (data.description.length > 80 ? '...' : '') : 'No description'}
        </div>
        {data.parameters && Object.keys(data.parameters).length > 0 && (
          <div className="node-parameters text-xs text-accent-foreground">
            <span className="font-medium">Parameters:</span> {Object.keys(data.parameters).join(', ')}
          </div>
        )}
      </div>
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