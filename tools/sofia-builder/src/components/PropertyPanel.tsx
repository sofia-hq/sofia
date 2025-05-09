import { useState, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { StepNodeData } from '../nodes/StepNode';
import { ToolNodeData } from '../nodes/ToolNode';
import { RouteEdgeData } from '../edges/RouteEdge';
import { ToolUsageEdgeData } from '../edges/ToolUsageEdge';
import { SofiaConfig, SofiaEdgeType, SofiaNodeType } from '../models/sofia';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';

interface PropertyPanelProps {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onNodeChange: (id: string, data: StepNodeData | ToolNodeData) => void;
  onEdgeChange: (id: string, data: RouteEdgeData | ToolUsageEdgeData) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onSetStartStep: (id: string) => void;
  isStartStep: (id: string) => boolean;
  config: SofiaConfig;
  onAgentConfigChange: (name: string, persona: string) => void;
}

export default function PropertyPanel({
  nodes,
  edges,
  selectedNode,
  onNodeChange,
  onEdgeChange,
  onDeleteNode,
  onSetStartStep,
  isStartStep,
  config,
  onAgentConfigChange
}: PropertyPanelProps) {
  const [agentName, setAgentName] = useState(config.name);
  const [agentPersona, setAgentPersona] = useState(config.persona);
  const [openStep, setOpenStep] = useState<string | null>(selectedNode?.type === SofiaNodeType.STEP ? selectedNode.id : null);
  const [openTool, setOpenTool] = useState<string | null>(selectedNode?.type === SofiaNodeType.TOOL ? selectedNode.id : null);
  const [edgeDialog, setEdgeDialog] = useState<{ open: boolean; edge: Edge | null }>({ open: false, edge: null });
  const [edgeCondition, setEdgeCondition] = useState('');

  useEffect(() => {
    setAgentName(config.name);
    setAgentPersona(config.persona);
  }, [config]);

  useEffect(() => {
    if (selectedNode?.type === SofiaNodeType.STEP) {
      setOpenStep(selectedNode.id);
      setOpenTool(null);
    } else if (selectedNode?.type === SofiaNodeType.TOOL) {
      setOpenTool(selectedNode.id);
      setOpenStep(null);
    } else {
      setOpenStep(null);
      setOpenTool(null);
    }
  }, [selectedNode]);

  // Only one open handler for step/tool
  const handleOpen = (type: 'step' | 'tool', id: string | null) => {
    if (type === 'step') {
      setOpenStep(id);
      setOpenTool(null);
    } else {
      setOpenTool(id);
      setOpenStep(null);
    }
  };

  // Get all steps and tools
  const stepNodes = (nodes ?? []).filter(n => n.type === SofiaNodeType.STEP);
  const toolNodes = (nodes ?? []).filter(n => n.type === SofiaNodeType.TOOL);

  return (
    <div className="w-[350px] h-full bg-background border-l flex flex-col overflow-y-auto">
      {/* Agent Properties */}
      <div className="space-y-4 p-4 border-b">
        <div>
          <label className="block text-xs mb-1">Agent Name</label>
          <Input
            value={agentName}
            onChange={e => setAgentName(e.target.value)}
            onBlur={() => onAgentConfigChange(agentName, agentPersona)}
            placeholder="Agent Name"
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Agent Persona</label>
          <Textarea
            value={agentPersona}
            onChange={e => setAgentPersona(e.target.value)}
            onBlur={() => onAgentConfigChange(agentName, agentPersona)}
            placeholder="Agent Persona"
            rows={4}
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Start Step</label>
          <Select value={config.start_step_id} onValueChange={onSetStartStep}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="-- Select Start Step --" />
            </SelectTrigger>
            <SelectContent>
              {stepNodes.map((node) => (
                <SelectItem key={node.id} value={node.id}>
                  {(node.data as StepNodeData).step_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Steps */}
      <div className="space-y-4 p-4 border-b">
        <div className="font-semibold text-sm mb-2">Steps</div>
        {stepNodes.map((node) => {
          const data = node.data as StepNodeData;
          const isOpen = openStep === node.id;
          // Find all outgoing route edges from this step
          const outgoingRoutes = (edges ?? []).filter(e => e.type === SofiaEdgeType.ROUTE && e.source === node.id);
          return (
            <Collapsible key={node.id} open={isOpen} onOpenChange={open => handleOpen('step', open ? node.id : null)}>
              <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 border rounded mb-1 bg-muted">
                <span>{data.label || data.step_id} {isStartStep(node.id) && <span className="ml-2 text-xs text-yellow-600">(Start)</span>}</span>
                <span>{isOpen ? '-' : '+'}</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-3 border rounded-b mb-2 bg-card">
                <div className="mb-2">
                  <label className="block text-xs mb-1">Step ID</label>
                  <Input
                    value={data.step_id}
                    onChange={e => onNodeChange(node.id, { ...data, step_id: e.target.value })}
                    placeholder="Step ID"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-xs mb-1">Description</label>
                  <Textarea
                    value={data.description}
                    onChange={e => onNodeChange(node.id, { ...data, description: e.target.value })}
                    placeholder="Description"
                    rows={3}
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-xs mb-1">Attached Tools</label>
                  <div className="flex flex-wrap gap-1">
                    {data.available_tools && data.available_tools.length > 0 ? (
                      data.available_tools.map((toolId: string) => {
                        const toolNode = toolNodes.find((n) => n.id === toolId);
                        const toolData = toolNode?.data as ToolNodeData | undefined;
                        const toolName = toolData?.name ?? 'Unknown Tool';
                        return (
                          <Badge
                            key={toolId}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => handleOpen('tool', toolId)}
                          >
                            {toolName}
                          </Badge>
                        );
                      })
                    ) : (
                      <span className="text-muted-foreground">No tools attached</span>
                    )}
                  </div>
                </div>
                {/* List outgoing route edges */}
                {outgoingRoutes.length > 0 && (
                  <div className="mb-2">
                    <label className="block text-xs mb-1">Routes</label>
                    <div className="flex flex-wrap gap-1">
                      {outgoingRoutes.map((edge) => {
                        const targetStep = stepNodes.find(n => n.id === edge.target);
                        const edgeData = edge.data as Record<string, unknown>;
                        const condition = String(edgeData?.condition || '');
                        const cappedCondition = condition.length > 32 ? condition.slice(0, 32) + '…' : condition;
                        return (
                          <Badge
                            key={edge.id}
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => {
                              setOpenStep(node.id);
                              setEdgeDialog({ open: true, edge });
                              setEdgeCondition(condition);
                            }}
                          >
                            {`→ ${targetStep?.data?.step_id || edge.target}`}
                            {cappedCondition && (
                              <span className="ml-1 text-muted-foreground">({cappedCondition})</span>
                            )}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={isStartStep(node.id) ? 'secondary' : 'default'}
                    onClick={() => onSetStartStep(node.id)}
                    disabled={isStartStep(node.id)}
                  >
                    {isStartStep(node.id) ? 'Start Step' : 'Set as Start Step'}
                  </Button>
                  <Button variant="destructive" onClick={() => onDeleteNode(node.id)}>
                    Delete Step
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
      {/* Tools */}
      <div className="space-y-4 p-4 border-b">
        <div className="font-semibold text-sm mb-2">Tools</div>
        {toolNodes.map((node) => {
          const data = node.data as ToolNodeData;
          const isOpen = openTool === node.id;
          return (
            <Collapsible key={node.id} open={isOpen} onOpenChange={open => handleOpen('tool', open ? node.id : null)}>
              <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 border rounded mb-1 bg-muted">
                <span>{data.name}</span>
                <span>{isOpen ? '-' : '+'}</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-3 border rounded-b mb-2 bg-card">
                <div className="mb-2">
                  <label className="block text-xs mb-1">Name</label>
                  <Input
                    value={data.name}
                    onChange={e => onNodeChange(node.id, { ...data, name: e.target.value })}
                    placeholder="Tool Name"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-xs mb-1">Arguments</label>
                  <div className="flex flex-col gap-2">
                    {(data.arguments || []).map((arg, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          className="w-1/3"
                          value={arg.name}
                          onChange={e => {
                            const newArgs = [...data.arguments];
                            newArgs[idx] = { ...arg, name: e.target.value };
                            onNodeChange(node.id, { ...data, arguments: newArgs });
                          }}
                          placeholder="Arg name"
                        />
                        <Input
                          className="flex-1"
                          value={arg.description}
                          onChange={e => {
                            const newArgs = [...data.arguments];
                            newArgs[idx] = { ...arg, description: e.target.value };
                            onNodeChange(node.id, { ...data, arguments: newArgs });
                          }}
                          placeholder="Description"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const newArgs = data.arguments.filter((_, i) => i !== idx);
                            onNodeChange(node.id, { ...data, arguments: newArgs });
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-1 w-fit"
                      onClick={() => {
                        const newArgs = [...(data.arguments || []), { name: '', description: '' }];
                        onNodeChange(node.id, { ...data, arguments: newArgs });
                      }}
                    >
                      + Add Argument
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button variant="destructive" onClick={() => onDeleteNode(node.id)}>
                    Delete Tool
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Edge Condition Dialog */}
      <Dialog open={edgeDialog.open} onOpenChange={open => setEdgeDialog({ open, edge: edgeDialog.edge })}>
        <DialogContent>
          <DialogTitle>Edit Edge Condition</DialogTitle>
          <DialogDescription>
            Set the condition for when this route should be taken.
          </DialogDescription>
          <Textarea
            value={edgeCondition}
            onChange={e => setEdgeCondition(e.target.value)}
            rows={3}
            placeholder="Condition"
          />
          <div className="flex gap-2 mt-4">
            <Button variant="default" onClick={() => {
              if (edgeDialog.edge) {
                const edgeData = edgeDialog.edge.data as unknown as RouteEdgeData;
                onEdgeChange(edgeDialog.edge.id, {
                  ...edgeData,
                  condition: edgeCondition
                });
                setEdgeDialog({ open: false, edge: null });
              }
            }}>Save</Button>
            <Button variant="secondary" onClick={() => setEdgeDialog({ open: false, edge: null })}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
