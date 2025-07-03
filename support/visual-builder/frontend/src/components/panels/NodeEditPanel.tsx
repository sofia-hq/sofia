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
      <DialogContent
        className="max-w-none w-[70vw] max-h-[80vh] overflow-y-auto"
        style={{ width: '70vw', maxWidth: 'none' }}
      >
        <DialogHeader>
          <DialogTitle>
            Edit {isStepNode ? 'Step' : 'Tool'} Node
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isStepNode && (
            <>
              {/* Left Column - Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">Basic Information</h3>

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
                    rows={4}
                  />
                </div>

                {/* Available Tools */}
                <div className="space-y-2">
                  <Label htmlFor="available_tools">Available Tools</Label>
                  <Textarea
                    id="available_tools"
                    value={formData.available_tools?.join(', ') || ''}
                    onChange={(e) => updateField('available_tools', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                    placeholder="tool1, tool2, tool3"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Separate multiple tools with commas</p>
                </div>

                {/* Flow Options */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Flow Options</h4>
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
                </div>
              </div>

              {/* Right Column - Decision Examples */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">Decision Examples</h3>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(formData.examples || []).map((example: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2 bg-gray-50 dark:bg-gray-800">
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
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const newExamples = [...(formData.examples || []), { context: '', decision: '', visibility: 'dynamic' }];
                    updateField('examples', newExamples);
                  }}
                  className="w-full"
                >
                  Add Example
                </Button>
              </div>
            </>
          )}

          {isToolNode && (
            <>
              {/* Left Column - Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">Tool Information</h3>

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
                    rows={4}
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
              </div>

              {/* Right Column - Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">Configuration</h3>

                {formData.tool_type && formData.tool_type !== 'custom' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="tool_identifier">Tool Identifier</Label>
                      <Input
                        id="tool_identifier"
                        value={formData.tool_identifier || ''}
                        onChange={(e) => updateField('tool_identifier', e.target.value)}
                        placeholder="Class or function path"
                      />
                    </div>

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
                        rows={8}
                      />
                    </div>
                  </>
                )}

                {(!formData.tool_type || formData.tool_type === 'custom') && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    Custom tools are defined in your uploaded Python files. Configure the tool type above to set up tool-specific parameters.
                  </div>
                )}
              </div>
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
