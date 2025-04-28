import { Handle, Position, NodeProps } from '@xyflow/react';
import { SofiaNodeType } from '../models/sofia';
import { cn } from '../lib/utils';
import { WrenchIcon } from 'lucide-react';

export interface ToolArgument {
  name: string;
  description: string;
}

export interface ToolNodeData {
  name: string;
  arguments: ToolArgument[];
}

export function ToolNode({ data, selected }: NodeProps<ToolNodeData>) {
  return (
    <div
      className={cn(
        'sofia-node node tool-node rounded-lg border shadow-sm bg-card text-card-foreground transition-all',
        selected ? 'selected' : '',
        selected
          ? 'ring-2 ring-primary border-primary bg-primary/10 shadow-[0_0_0_2px_#3b82f6]'
          : 'border-border',
        'hover:shadow-lg'
      )}
      data-selected={selected}
    >
      <div className="node-header flex items-center gap-2 px-3 py-2 border-b bg-muted rounded-t-lg">
        <WrenchIcon className="text-primary size-4" />
        <div className="node-title font-semibold text-sm truncate flex-1">{data.name}</div>
      </div>
      <div className="node-content px-3 py-2">
        {data.arguments && data.arguments.length > 0 ? (
          <div className="node-args text-xs text-accent-foreground">
            <span className="font-medium">Arguments:</span>
            <ul className="pl-2 mt-1">
              {data.arguments.map((arg, idx) => (
                <li key={idx} className="mb-1">
                  <span className="font-semibold">{arg.name}</span>
                  {arg.description && (
                    <span className="ml-1 text-muted-foreground">- {arg.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No arguments</div>
        )}
      </div>
      <Handle 
        type="target" 
        position={Position.Left} 
        id="tool-target"
        className="node-handle tool-handle"
      />
    </div>
  );
}