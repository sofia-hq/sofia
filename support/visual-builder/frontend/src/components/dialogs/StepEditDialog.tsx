import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { AlertCircle, AlertTriangle, Link, ArrowRight } from 'lucide-react';
import { validateStepNode } from '../../utils/validation';
import type { StepNodeData, ToolNodeData } from '../../types';
import type { Node, Edge } from '@xyflow/react';

interface StepEditDialogProps {
  open: boolean;
  onClose: () => void;
  stepData: StepNodeData;
  onSave: (data: StepNodeData) => void;
  nodeId: string;
  nodes: Node[];
  edges: Edge[];
}

export function StepEditDialog({ open, onClose, stepData, onSave, nodeId, nodes, edges }: StepEditDialogProps) {
  const [formData, setFormData] = useState<StepNodeData>(stepData);

  // Compute current connections from edges in real-time
  const currentConnections = useMemo(() => {
    const connectedTools = edges
      .filter(edge => edge.source === nodeId && edge.type === 'tool')
      .map(edge => {
        const toolNode = nodes.find(n => n.id === edge.target);
        return toolNode?.data as ToolNodeData;
      })
      .filter(Boolean);

    const outgoingRoutes = edges
      .filter(edge => edge.source === nodeId && edge.type === 'route')
      .map(edge => {
        const targetNode = nodes.find(n => n.id === edge.target);
        const targetStepData = targetNode?.data as StepNodeData;
        return {
          target: targetStepData?.step_id || 'unknown',
          condition: (edge.data as any)?.condition || 'Default',
          targetNodeId: edge.target
        };
      });

    const toolNames = connectedTools.map(tool => tool.name);
    const routes = outgoingRoutes.map(route => ({
      target: route.target,
      condition: route.condition
    }));

    return { connectedTools, outgoingRoutes, toolNames, routes };
  }, [edges, nodeId, nodes]);

  // Real-time validation using current connections
  const formDataWithConnections = useMemo(() => ({
    ...formData,
    available_tools: currentConnections.toolNames,
    routes: currentConnections.routes
  }), [formData, currentConnections]);

  const validation = validateStepNode(formDataWithConnections);
  const hasErrors = !validation.isValid;

  useEffect(() => {
    setFormData(stepData);
  }, [stepData]);

  const handleSave = () => {
    if (!hasErrors) {
      // Use the computed connections from formDataWithConnections
      onSave(formDataWithConnections);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Step</DialogTitle>
          <DialogDescription>
            Configure the step properties, persona, tools, and routing logic.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Validation Summary */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="space-y-2">
              {validation.errors.map((error, index) => (
                <div key={`error-${index}`} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error.message}</span>
                </div>
              ))}
              {validation.warnings.map((warning, index) => (
                <div key={`warning-${index}`} className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Step ID */}
          <div className="space-y-2">
            <Label htmlFor="step-id">Step ID</Label>
            <Input
              id="step-id"
              value={formData.step_id}
              onChange={(e) => setFormData(prev => ({ ...prev, step_id: e.target.value }))}
              placeholder="Enter step ID"
              className={validation.errors.some(e => e.field === 'step_id') ? 'border-red-300' : ''}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this step does..."
              rows={4}
            />
          </div>

          {/* Auto Flow */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="auto-flow"
              checked={formData.auto_flow || false}
              onChange={(e) => setFormData(prev => ({ ...prev, auto_flow: e.target.checked }))}
              className="h-4 w-4"
            />
            <Label htmlFor="auto-flow">Auto Flow (automatically proceed to next step)</Label>
          </div>

          {/* Connected Tools (Read-only) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Connected Tools</Label>
              <Link className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Based on visual connections</span>
            </div>
            {currentConnections.toolNames && currentConnections.toolNames.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {currentConnections.toolNames.map(toolName => (
                  <Badge key={toolName} variant="secondary" className="flex items-center gap-1">
                    {toolName}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                No tools connected. Connect tool nodes to this step to add tools.
              </div>
            )}
          </div>

          {/* Outgoing Routes (Read-only) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Outgoing Routes</Label>
              <ArrowRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Based on visual connections</span>
            </div>
            {currentConnections.routes && currentConnections.routes.length > 0 ? (
              <div className="space-y-1">
                {currentConnections.routes.map((route, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{route.target}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                    <span className="flex-1 text-gray-600 dark:text-gray-300">{route.condition}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                No routes defined. Connect this step to other steps to create routes.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={hasErrors}>
            Save {hasErrors && '(Fix errors first)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
