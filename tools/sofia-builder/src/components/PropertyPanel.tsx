import React, { useState, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { StepNodeData } from '../nodes/StepNode';
import { ToolNodeData } from '../nodes/ToolNode';
import { RouteEdgeData } from '../edges/RouteEdge';
import { ToolUsageEdgeData } from '../edges/ToolUsageEdge';
import { SofiaConfig, SofiaEdgeType, SofiaNodeType } from '../models/sofia';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface PropertyPanelProps {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onNodeChange: (id: string, data: StepNodeData | ToolNodeData) => void;
  onEdgeChange: (id: string, data: RouteEdgeData | ToolUsageEdgeData) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onSetStartStep: (id: string) => void;
  isStartStep: (id: string) => boolean;
  stepNodes: Node[];
  config: SofiaConfig;
  onAgentConfigChange: (name: string, persona: string) => void;
}

export default function PropertyPanel({
  selectedNode,
  selectedEdge,
  onNodeChange,
  onEdgeChange,
  onDeleteNode,
  onDeleteEdge,
  onSetStartStep,
  isStartStep,
  stepNodes,
  config,
  onAgentConfigChange
}: PropertyPanelProps) {
  // State for controlled form inputs
  const [stepId, setStepId] = useState('');
  const [stepDescription, setStepDescription] = useState('');
  const [stepTools, setStepTools] = useState('');
  const [toolName, setToolName] = useState('');
  const [toolDescription, setToolDescription] = useState('');
  const [routeCondition, setRouteCondition] = useState('');
  const [toolUsageName, setToolUsageName] = useState('');
  
  // Update local state when selection changes
  useEffect(() => {
    if (selectedNode && selectedNode.type === SofiaNodeType.STEP) {
      const data = selectedNode.data as StepNodeData;
      setStepId(data.step_id || '');
      setStepDescription(data.description || '');
      setStepTools(data.available_tools?.join(', ') || '');
    } else if (selectedNode && selectedNode.type === SofiaNodeType.TOOL) {
      const data = selectedNode.data as ToolNodeData;
      setToolName(data.name || '');
      setToolDescription(data.description || '');
    } else if (selectedEdge && selectedEdge.type === SofiaEdgeType.ROUTE) {
      const data = selectedEdge.data as RouteEdgeData;
      setRouteCondition(data?.condition || '');
    } else if (selectedEdge && selectedEdge.type === SofiaEdgeType.TOOL_USAGE) {
      const data = selectedEdge.data as ToolUsageEdgeData;
      setToolUsageName(data?.toolName || '');
    }
  }, [selectedNode, selectedEdge]);

  // Always render as a static flex child
  return (
    <div className="w-[300px] h-full bg-background border-l flex flex-col">
      {/* Agent Settings */}
      {!selectedNode && !selectedEdge && (
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-xs mb-1">Start Step</label>
            <select
              className="w-full border rounded-md px-2 py-1 text-sm bg-background"
              value={config.start_step_id}
              onChange={(e) => onSetStartStep(e.target.value)}
            >
              <option value="">-- Select Start Step --</option>
              {stepNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.data.step_id}
                </option>
              ))}
            </select>
          </div>
          <p className="text-muted-foreground text-xs">Select a step, tool, or route to edit its properties.</p>
        </div>
      )}
      {/* Step Node */}
      {selectedNode && selectedNode.type === SofiaNodeType.STEP && (
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-xs mb-1">Step ID</label>
            <Input
              value={stepId}
              onChange={e => {
                const newValue = e.target.value;
                setStepId(newValue);
                const data = { ...selectedNode.data as StepNodeData };
                data.step_id = newValue;
                onNodeChange(selectedNode.id, data);
              }}
              placeholder="Step ID"
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Description</label>
            <Input
              as="textarea"
              value={stepDescription}
              onChange={e => {
                const newValue = e.target.value;
                setStepDescription(newValue);
                const data = { ...selectedNode.data as StepNodeData };
                data.description = newValue;
                onNodeChange(selectedNode.id, data);
              }}
              placeholder="Description"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Available Tools (comma separated)</label>
            <Input
              value={stepTools}
              onChange={e => {
                const newValue = e.target.value;
                setStepTools(newValue);
                const toolsList = newValue.split(',').map(tool => tool.trim()).filter(Boolean);
                const data = { ...selectedNode.data as StepNodeData };
                data.available_tools = toolsList;
                onNodeChange(selectedNode.id, data);
              }}
              placeholder="tool1, tool2"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={isStartStep(selectedNode.id) ? 'secondary' : 'default'}
              onClick={() => onSetStartStep(selectedNode.id)}
              disabled={isStartStep(selectedNode.id)}
            >
              {isStartStep(selectedNode.id) ? 'Start Step' : 'Set as Start Step'}
            </Button>
            <Button variant="destructive" onClick={() => onDeleteNode(selectedNode.id)}>
              Delete Step
            </Button>
          </div>
        </div>
      )}
      {/* Tool Node */}
      {selectedNode && selectedNode.type === SofiaNodeType.TOOL && (
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-xs mb-1">Name</label>
            <Input
              value={toolName}
              onChange={e => {
                const newValue = e.target.value;
                setToolName(newValue);
                const data = { ...selectedNode.data as ToolNodeData };
                data.name = newValue;
                onNodeChange(selectedNode.id, data);
              }}
              placeholder="Tool Name"
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Description</label>
            <Input
              as="textarea"
              value={toolDescription}
              onChange={e => {
                const newValue = e.target.value;
                setToolDescription(newValue);
                const data = { ...selectedNode.data as ToolNodeData };
                data.description = newValue;
                onNodeChange(selectedNode.id, data);
              }}
              placeholder="Description"
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => onDeleteNode(selectedNode.id)}>
              Delete Tool
            </Button>
          </div>
        </div>
      )}
      {/* Route Edge */}
      {selectedEdge && selectedEdge.type === SofiaEdgeType.ROUTE && (
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-xs mb-1">Condition</label>
            <Input
              as="textarea"
              value={routeCondition}
              onChange={e => {
                const newValue = e.target.value;
                setRouteCondition(newValue);
                onEdgeChange(selectedEdge.id, { condition: newValue } as RouteEdgeData);
              }}
              placeholder="Condition (optional)"
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => onDeleteEdge(selectedEdge.id)}>
              Delete Route
            </Button>
          </div>
        </div>
      )}
      {/* Tool Usage Edge */}
      {selectedEdge && selectedEdge.type === SofiaEdgeType.TOOL_USAGE && (
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-xs mb-1">Tool Name</label>
            <Input
              value={toolUsageName}
              onChange={e => {
                const newValue = e.target.value;
                setToolUsageName(newValue);
                onEdgeChange(selectedEdge.id, { toolName: newValue } as ToolUsageEdgeData);
              }}
              placeholder="Tool Name"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => onDeleteEdge(selectedEdge.id)}>
              Delete Tool Usage
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}