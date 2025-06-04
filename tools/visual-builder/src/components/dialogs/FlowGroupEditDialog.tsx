import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { X, Plus } from 'lucide-react';
import type { FlowGroupData } from '../../types';

interface FlowGroupEditDialogProps {
  open: boolean;
  onClose: () => void;
  flowData: FlowGroupData;
  onSave: (data: FlowGroupData) => void;
  availableStepIds: string[];
}

export function FlowGroupEditDialog({
  open,
  onClose,
  flowData,
  onSave,
  availableStepIds,
}: FlowGroupEditDialogProps) {
  const [formData, setFormData] = useState<FlowGroupData>(flowData);
  const [newEnterStep, setNewEnterStep] = useState('');
  const [newExitStep, setNewExitStep] = useState('');

  useEffect(() => {
    setFormData(flowData);
  }, [flowData]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const addEnterStep = () => {
    if (newEnterStep && !formData.enters.includes(newEnterStep)) {
      setFormData({
        ...formData,
        enters: [...formData.enters, newEnterStep],
      });
      setNewEnterStep('');
    }
  };

  const removeEnterStep = (stepId: string) => {
    setFormData({
      ...formData,
      enters: formData.enters.filter(id => id !== stepId),
    });
  };

  const addExitStep = () => {
    if (newExitStep && !formData.exits.includes(newExitStep)) {
      setFormData({
        ...formData,
        exits: [...formData.exits, newExitStep],
      });
      setNewExitStep('');
    }
  };

  const removeExitStep = (stepId: string) => {
    setFormData({
      ...formData,
      exits: formData.exits.filter(id => id !== stepId),
    });
  };

  const updateMemoryConfig = (key: string, value: any) => {
    setFormData({
      ...formData,
      components: {
        ...formData.components,
        memory: {
          ...formData.components?.memory,
          [key]: value,
        },
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Flow Group</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="flow">Flow Control</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="flow_id">Flow ID</Label>
                <Input
                  id="flow_id"
                  value={formData.flow_id}
                  onChange={(e) =>
                    setFormData({ ...formData, flow_id: e.target.value })
                  }
                  placeholder="e.g., user_authentication_flow"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe what this flow group does..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="color">Group Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color || '#3B82F6'}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="flow" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Entry Points</Label>
                <p className="text-sm text-gray-600 mb-2">
                  Steps that can enter this flow group
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.enters.map((stepId) => (
                    <Badge key={stepId} variant="secondary" className="flex items-center gap-1">
                      {stepId}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeEnterStep(stepId)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    value={newEnterStep}
                    onChange={(e) => setNewEnterStep(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select a step...</option>
                    {availableStepIds
                      .filter(id => !formData.enters.includes(id))
                      .map(id => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                  </select>
                  <Button size="sm" onClick={addEnterStep} disabled={!newEnterStep}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Exit Points</Label>
                <p className="text-sm text-gray-600 mb-2">
                  Steps that can exit this flow group
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.exits.map((stepId) => (
                    <Badge key={stepId} variant="secondary" className="flex items-center gap-1">
                      {stepId}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeExitStep(stepId)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    value={newExitStep}
                    onChange={(e) => setNewExitStep(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select a step...</option>
                    {availableStepIds
                      .filter(id => !formData.exits.includes(id))
                      .map(id => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                  </select>
                  <Button size="sm" onClick={addExitStep} disabled={!newExitStep}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="components" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Memory Configuration</Label>
                <p className="text-sm text-gray-600 mb-3">
                  Configure memory settings for this flow group
                </p>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="llm_provider">LLM Provider</Label>
                    <select
                      id="llm_provider"
                      value={formData.components?.memory?.llm?.provider || ''}
                      onChange={(e) =>
                        updateMemoryConfig('llm', {
                          ...formData.components?.memory?.llm,
                          provider: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select provider...</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google">Google</option>
                      <option value="mistral">Mistral</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="llm_model">LLM Model</Label>
                    <Input
                      id="llm_model"
                      value={formData.components?.memory?.llm?.model || ''}
                      onChange={(e) =>
                        updateMemoryConfig('llm', {
                          ...formData.components?.memory?.llm,
                          model: e.target.value,
                        })
                      }
                      placeholder="e.g., gpt-4, claude-3-opus"
                    />
                  </div>

                  <div>
                    <Label htmlFor="retriever_method">Retriever Method</Label>
                    <select
                      id="retriever_method"
                      value={formData.components?.memory?.retriever?.method || ''}
                      onChange={(e) =>
                        updateMemoryConfig('retriever', {
                          ...formData.components?.memory?.retriever,
                          method: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select method...</option>
                      <option value="similarity">Similarity Search</option>
                      <option value="mmr">Maximum Marginal Relevance</option>
                      <option value="similarity_score_threshold">Similarity Score Threshold</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
