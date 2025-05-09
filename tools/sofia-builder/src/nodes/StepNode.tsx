import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { cn } from '../lib/utils';
import { FootprintsIcon } from 'lucide-react';
import { useStore } from '@xyflow/react';

// Type definition for StepNode data
export interface StepNodeData {
  label: string;
  description: string;
  step_id: string;
  available_tools: string[]; // array of tool node IDs
  [key: string]: unknown; // Add index signature to satisfy Record<string, unknown>
}

export function StepNode({ data, selected }: NodeProps<Node<StepNodeData>>) {
  // Get all nodes from React Flow store
  const allNodes = useStore((s) => s.nodes);
  // Map tool node IDs to tool names
  const toolNames = (data.available_tools || [])
    .map((toolId: string) => {
      const toolNode = allNodes.find((n) => n.id === toolId);
      return toolNode && toolNode.data && toolNode.data.name ? toolNode.data.name : toolId;
    })
    .filter(Boolean);
  // Determine if this is the start node
  const isStartNode = data.label?.startsWith('🚀') || false;
  return (
    <div
      className={cn(
        'sofia-node node step-node rounded-lg border shadow-sm bg-card text-card-foreground transition-all',
        selected ? 'selected' : '',
        selected
          ? 'ring-2 ring-primary border-primary bg-primary/10 shadow-[0_0_0_2px_#3b82f6]'
          : isStartNode
            ? 'border-yellow-400 bg-yellow-100 dark:bg-yellow-900 dark:border-yellow-500'
            : 'border-border',
        'hover:shadow-lg'
      )}
      data-selected={selected}
    >
      <div className="node-header flex items-center gap-2 px-3 py-2 border-b bg-muted rounded-t-lg">
        <FootprintsIcon className="text-primary size-4" />
        <div className="node-title font-semibold text-sm truncate flex-1">{data.label || data.step_id}</div>
      </div>
      <div className="node-content px-3 py-2">
        <div className="node-description text-xs text-muted-foreground mb-1">
          {data.description ? data.description.substring(0, 100) + (data.description.length > 100 ? '...' : '') : 'No description'}
        </div>
        {toolNames.length > 0 && (
          <div className="node-tools text-xs text-accent-foreground">
            <span className="font-medium">Tools:</span> {toolNames.join(', ')}
          </div>
        )}
      </div>
      <Handle
        type="target"
        position={Position.Top}
        id="step-target"
        className="node-handle"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="step-source"
        className="node-handle"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="tool-source"
        className="node-handle tool-handle"
      />
    </div>
  );
}
