import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { Node } from '@xyflow/react';
import type { StepNodeData, ToolNodeData } from '../../models/nomos';

interface NodeEditPanelProps {
  nodeId: string;
  node: Node | null;
  onClose: () => void;
  onSave: (data: Partial<StepNodeData | ToolNodeData>) => void;
}

export function NodeEditPanel({ nodeId, node, onClose, onSave }: NodeEditPanelProps) {
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

              {/* Persona */}
              <div className="space-y-2">
                <Label htmlFor="persona">Persona</Label>
                <Textarea
                  id="persona"
                  value={formData.persona || ''}
                  onChange={(e) => updateField('persona', e.target.value)}
                  placeholder="Define the agent's persona and behavior"
                  rows={3}
                />
              </div>

              {/* Tools */}
              <div className="space-y-2">
                <Label htmlFor="tools">Tools (comma-separated)</Label>
                <Textarea
                  id="tools"
                  value={formData.tools?.join(', ') || ''}
                  onChange={(e) => updateField('tools', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  placeholder="tool1, tool2, tool3"
                  rows={2}
                />
              </div>

              {/* Max Iterations */}
              <div className="space-y-2">
                <Label htmlFor="max_iter">Max Iterations</Label>
                <Input
                  id="max_iter"
                  type="number"
                  value={formData.max_iter || ''}
                  onChange={(e) => updateField('max_iter', parseInt(e.target.value) || undefined)}
                  placeholder="Maximum iterations (optional)"
                />
              </div>

              {/* Answer Model */}
              <div className="space-y-2">
                <Label htmlFor="answer_model">Answer Model</Label>
                <Input
                  id="answer_model"
                  value={formData.answer_model || ''}
                  onChange={(e) => updateField('answer_model', e.target.value)}
                  placeholder="Pydantic model for structured responses (optional)"
                />
              </div>
            </>
          )}

          {isToolNode && (
            <>
              {/* Tool ID */}
              <div className="space-y-2">
                <Label htmlFor="tool_id">Tool ID</Label>
                <Input
                  id="tool_id"
                  value={formData.tool_id || ''}
                  onChange={(e) => updateField('tool_id', e.target.value)}
                  placeholder="Enter tool identifier"
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

              {/* Package Reference */}
              <div className="space-y-2">
                <Label htmlFor="package_reference">Package Reference</Label>
                <Input
                  id="package_reference"
                  value={formData.package_reference || ''}
                  onChange={(e) => updateField('package_reference', e.target.value)}
                  placeholder="package_name:function_name (optional)"
                />
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
