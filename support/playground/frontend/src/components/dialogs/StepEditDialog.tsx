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
import { AlertCircle, AlertTriangle, Link, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [collapsedExamples, setCollapsedExamples] = useState<Set<number>>(new Set());

  const toggleExampleCollapse = (index: number) => {
    const newCollapsed = new Set(collapsedExamples);
    if (newCollapsed.has(index)) {
      newCollapsed.delete(index);
    } else {
      newCollapsed.add(index);
    }
    setCollapsedExamples(newCollapsed);
  };

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
      <DialogContent
        className="max-w-none w-[45vw] max-h-[85vh] overflow-y-auto"
        style={{ width: '45vw', maxWidth: 'none' }}
      >
        <DialogHeader>
          <DialogTitle>Edit Step</DialogTitle>
          <DialogDescription>
            Configure the step properties, persona, tools, and routing logic.
          </DialogDescription>
        </DialogHeader>

        {/* Validation Summary */}
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="space-y-2 mb-4">
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

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Basic Properties */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Basic Properties</h3>

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

            {/* Quick Suggestions */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="quick-suggestions"
                checked={formData.quick_suggestions || false}
                onChange={(e) => setFormData(prev => ({ ...prev, quick_suggestions: e.target.checked }))}
                className="h-4 w-4"
              />
              <Label htmlFor="quick-suggestions">Quick Suggestions (provide response suggestions)</Label>
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

          {/* Right Column - Decision Examples */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Decision Examples</h3>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {(formData.examples || []).map((example, index) => {
                const isCollapsed = collapsedExamples.has(index);
                return (
                  <div key={index} className="border rounded p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                        onClick={() => toggleExampleCollapse(index)}
                      >
                        <span className="text-sm font-medium">Example {index + 1}</span>
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newExamples = [...(formData.examples || [])];
                          newExamples.splice(index, 1);
                          setFormData(prev => ({ ...prev, examples: newExamples }));
                        }}
                      >
                        Remove
                      </Button>
                    </div>

                    {!isCollapsed && (
                      <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Context</Label>
                      <Textarea
                        value={example.context || ''}
                        onChange={(e) => {
                          const newExamples = [...(formData.examples || [])];
                          newExamples[index] = { ...example, context: e.target.value };
                          setFormData(prev => ({ ...prev, examples: newExamples }));
                        }}
                        placeholder="Describe the situation context"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Decision</Label>
                      <Textarea
                        value={example.decision || ''}
                        onChange={(e) => {
                          const newExamples = [...(formData.examples || [])];
                          newExamples[index] = { ...example, decision: e.target.value };
                          setFormData(prev => ({ ...prev, examples: newExamples }));
                        }}
                        placeholder="Expected decision for this context"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Visibility</Label>
                      <select
                        value={example.visibility || 'dynamic'}
                        onChange={(e) => {
                          const newExamples = [...(formData.examples || [])];
                          newExamples[index] = { ...example, visibility: e.target.value as 'always' | 'never' | 'dynamic' };
                          setFormData(prev => ({ ...prev, examples: newExamples }));
                        }}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      >
                        <option value="dynamic">Dynamic (shown based on similarity)</option>
                        <option value="always">Always (always shown)</option>
                        <option value="never">Never (hidden)</option>
                      </select>
                    </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {(!formData.examples || formData.examples.length === 0) && (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No decision examples defined. Add examples to help guide the AI's decision-making process.
                </div>
              )}
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const newExamples = [...(formData.examples || []), { context: '', decision: '', visibility: 'dynamic' as const }];
                  setFormData(prev => ({ ...prev, examples: newExamples }));
                }}
              >
                Add Example
              </Button>
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
