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
      <DialogContent
        className="max-w-none w-[45vw] max-h-[90vh] overflow-y-auto"
        style={{ width: '45vw', maxWidth: 'none' }}
      >
        <DialogHeader className="pb-6">
          <DialogTitle className="text-xl">Configure Flow Group</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          {/* Left Column - Basic Information & Flow Control */}
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold border-b border-gray-200 dark:border-gray-700 pb-3 mb-6">Basic Information</h3>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="flow_id" className="text-sm font-medium">Flow ID</Label>
                  <Input
                    id="flow_id"
                    value={formData.flow_id}
                    onChange={(e) =>
                      setFormData({ ...formData, flow_id: e.target.value })
                    }
                    placeholder="e.g., user_authentication_flow"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe what this flow group does..."
                    rows={4}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="color" className="text-sm font-medium">Group Color</Label>
                  <div className="mt-2 flex items-center gap-3">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color || '#3B82F6'}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      className="w-16 h-10"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formData.color || '#3B82F6'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold border-b border-gray-200 dark:border-gray-700 pb-3 mb-6">Flow Control</h3>
              <div className="space-y-8">
                <div>
                  <Label className="text-sm font-medium">Entry Points</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">
                    Steps that can enter this flow group
                  </p>
                  <div className="flex flex-wrap gap-3 mb-4 min-h-[3rem] p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    {formData.enters.map((stepId) => (
                      <Badge key={stepId} variant="secondary" className="flex items-center gap-2 px-3 py-1">
                        {stepId}
                        <X
                          className="w-4 h-4 cursor-pointer hover:text-red-500"
                          onClick={() => removeEnterStep(stepId)}
                        />
                      </Badge>
                    ))}
                    {formData.enters.length === 0 && (
                      <div className="text-sm text-gray-400 italic">No entry points defined</div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <select
                      value={newEnterStep}
                      onChange={(e) => setNewEnterStep(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background"
                    >
                      <option value="">Select a step...</option>
                      {availableStepIds
                        .filter(id => !formData.enters.includes(id))
                        .map(id => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                    </select>
                    <Button size="sm" onClick={addEnterStep} disabled={!newEnterStep} className="px-4">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Exit Points</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">
                    Steps that can exit this flow group
                  </p>
                  <div className="flex flex-wrap gap-3 mb-4 min-h-[3rem] p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    {formData.exits.map((stepId) => (
                      <Badge key={stepId} variant="secondary" className="flex items-center gap-2 px-3 py-1">
                        {stepId}
                        <X
                          className="w-4 h-4 cursor-pointer hover:text-red-500"
                          onClick={() => removeExitStep(stepId)}
                        />
                      </Badge>
                    ))}
                    {formData.exits.length === 0 && (
                      <div className="text-sm text-gray-400 italic">No exit points defined</div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <select
                      value={newExitStep}
                      onChange={(e) => setNewExitStep(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background"
                    >
                      <option value="">Select a step...</option>
                      {availableStepIds
                        .filter(id => !formData.exits.includes(id))
                        .map(id => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                    </select>
                    <Button size="sm" onClick={addExitStep} disabled={!newExitStep} className="px-4">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Components Configuration */}
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold border-b border-gray-200 dark:border-gray-700 pb-3 mb-6">Flow Components</h3>

              <div className="space-y-6 border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50/50 dark:bg-gray-800/30">
                <div>
                  <Label className="text-sm font-medium">Memory Configuration</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-6">
                    Configure memory settings for this flow group
                  </p>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="llm_provider" className="text-sm font-medium">LLM Provider</Label>
                        <select
                          id="llm_provider"
                          value={formData.components?.memory?.llm?.provider || ''}
                          onChange={(e) =>
                            updateMemoryConfig('llm', {
                              ...formData.components?.memory?.llm,
                              provider: e.target.value,
                            })
                          }
                          className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background"
                        >
                          <option value="">Select provider...</option>
                          <option value="openai">OpenAI</option>
                          <option value="anthropic">Anthropic</option>
                          <option value="google">Google</option>
                          <option value="mistral">Mistral</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="llm_model" className="text-sm font-medium">LLM Model</Label>
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
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="retriever_method" className="text-sm font-medium">Retriever Method</Label>
                      <select
                        id="retriever_method"
                        value={formData.components?.memory?.retriever?.method || ''}
                        onChange={(e) =>
                          updateMemoryConfig('retriever', {
                            ...formData.components?.memory?.retriever,
                            method: e.target.value,
                          })
                        }
                        className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background"
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
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <p className="font-medium mb-3 text-blue-800 dark:text-blue-200">Configuration Guide</p>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span><strong>Entry Points:</strong> Define which steps can enter this flow group</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span><strong>Exit Points:</strong> Define which steps can exit this flow group</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span><strong>Memory Config:</strong> Controls how conversation context is stored and retrieved</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span><strong>LLM Settings:</strong> Determines which AI model processes requests in this flow</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span><strong>Group Color:</strong> Visual identifier for this flow group in the editor</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-8 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} className="px-6">
            Cancel
          </Button>
          <Button onClick={handleSave} className="px-6">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
