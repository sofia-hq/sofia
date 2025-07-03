import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import type { Node } from '@xyflow/react';
import type { StepNodeData, ToolNodeData } from '../../models/nomos';

interface NodeEditPanelProps {
  node: Node | null;
  onClose: () => void;
  onSave: (data: Partial<StepNodeData | ToolNodeData>) => void;
}

export function NodeEditPanel({ node, onClose, onSave }: NodeEditPanelProps) {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (node) {
      setFormData({ ...node.data });
    }
  }, [node]);

  if (!node) return null;

  const isStepNode = node.type === 'step';
  const isToolNode = node.type === 'tool';

  const handleSave = () => {
    onSave(formData);
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit {isStepNode ? 'Step' : 'Tool'} Node
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isStepNode && (
            <>
              {/* Step ID */}
              <div className="space-y-2">
                <Label htmlFor="step_id">Step ID</Label>
                <Input
                  id="step_id"
                  value={formData.step_id || ''}
                  onChange={(e) => updateField('step_id', e.target.value)}
                  placeholder="Enter step identifier"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Describe what this step does"
                  rows={3}
                />
              </div>

              {/* Available Tools */}
              <div className="space-y-2">
                <Label htmlFor="available_tools">Available Tools (comma-separated)</Label>
                <Textarea
                  id="available_tools"
                  value={formData.available_tools?.join(', ') || ''}
                  onChange={(e) => updateField('available_tools', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  placeholder="tool1, tool2, tool3"
                  rows={2}
                />
              </div>

              {/* Auto Flow */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto_flow"
                  checked={formData.auto_flow || false}
                  onChange={(e) => updateField('auto_flow', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="auto_flow">Auto Flow</Label>
              </div>

              {/* Quick Suggestions */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="quick_suggestions"
                  checked={formData.quick_suggestions || false}
                  onChange={(e) => updateField('quick_suggestions', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="quick_suggestions">Quick Suggestions</Label>
              </div>

              {/* Decision Examples */}
              <div className="space-y-2">
                <Label>Decision Examples</Label>
                {(formData.examples || []).map((example: any, index: number) => (
                  <div key={index} className="border rounded p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Example {index + 1}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newExamples = [...(formData.examples || [])];
                          newExamples.splice(index, 1);
                          updateField('examples', newExamples);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">Context</Label>
                        <Textarea
                          value={example.context || ''}
                          onChange={(e) => {
                            const newExamples = [...(formData.examples || [])];
                            newExamples[index] = { ...example, context: e.target.value };
                            updateField('examples', newExamples);
                          }}
                          placeholder="Situation context"
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
                            updateField('examples', newExamples);
                          }}
                          placeholder="Expected decision"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Visibility</Label>
                        <select
                          value={example.visibility || 'dynamic'}
                          onChange={(e) => {
                            const newExamples = [...(formData.examples || [])];
                            newExamples[index] = { ...example, visibility: e.target.value };
                            updateField('examples', newExamples);
                          }}
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                        >
                          <option value="dynamic">Dynamic</option>
                          <option value="always">Always</option>
                          <option value="never">Never</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const newExamples = [...(formData.examples || []), { context: '', decision: '', visibility: 'dynamic' }];
                    updateField('examples', newExamples);
                  }}
                >
                  Add Example
                </Button>
              </div>
            </>
          )}

          {isToolNode && (
            <>
              {/* Tool Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Tool Name</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Enter tool name"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Describe what this tool does"
                  rows={3}
                />
              </div>

              {/* Tool Type */}
              <div className="space-y-2">
                <Label htmlFor="tool_type">Tool Type</Label>
                <select
                  id="tool_type"
                  value={formData.tool_type || 'custom'}
                  onChange={(e) => updateField('tool_type', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="custom">Custom</option>
                  <option value="crewai">CrewAI</option>
                  <option value="langchain">Langchain</option>
                  <option value="pkg">Package</option>
                </select>
              </div>

              {formData.tool_type && formData.tool_type !== 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="tool_identifier">Tool Identifier</Label>
                  <Input
                    id="tool_identifier"
                    value={formData.tool_identifier || ''}
                    onChange={(e) => updateField('tool_identifier', e.target.value)}
                    placeholder="Class or function path"
                  />
                </div>
              )}

              {formData.tool_type && formData.tool_type !== 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="kwargs">Kwargs (JSON)</Label>
                  <Textarea
                    id="kwargs"
                    value={JSON.stringify(formData.kwargs || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        updateField('kwargs', JSON.parse(e.target.value));
                      } catch {
                        /* ignore invalid JSON */
                      }
                    }}
                    placeholder='{"key": "value"}'
                    rows={3}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
