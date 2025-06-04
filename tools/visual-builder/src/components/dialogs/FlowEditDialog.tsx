import { useState, useEffect } from 'react';
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
import { X, Plus, AlertCircle } from 'lucide-react';
import type { FlowGroupData } from '../../types';

interface FlowEditDialogProps {
  open: boolean;
  onClose: () => void;
  flowData: FlowGroupData;
  onSave: (data: FlowGroupData) => void;
  availableStepIds: string[];
}

export function FlowEditDialog({ 
  open, 
  onClose, 
  flowData, 
  onSave,
  availableStepIds: _ 
}: FlowEditDialogProps) {
  const [formData, setFormData] = useState<FlowGroupData>(flowData);
  const [newEntryStep, setNewEntryStep] = useState('');
  const [newExitStep, setNewExitStep] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(flowData);
    setErrors({});
  }, [flowData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.flow_id.trim()) {
      newErrors.flow_id = 'Flow ID is required';
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.flow_id)) {
      newErrors.flow_id = 'Flow ID must start with a letter or underscore and contain only letters, numbers, and underscores';
    }

    if (formData.enters.length === 0) {
      newErrors.enters = 'At least one entry point is required';
    }

    if (formData.exits.length === 0) {
      newErrors.exits = 'At least one exit point is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  const addEntryStep = () => {
    if (newEntryStep.trim() && !formData.enters.includes(newEntryStep.trim())) {
      setFormData(prev => ({
        ...prev,
        enters: [...prev.enters, newEntryStep.trim()]
      }));
      setNewEntryStep('');
    }
  };

  const removeEntryStep = (stepId: string) => {
    setFormData(prev => ({
      ...prev,
      enters: prev.enters.filter(id => id !== stepId)
    }));
  };

  const addExitStep = () => {
    if (newExitStep.trim() && !formData.exits.includes(newExitStep.trim())) {
      setFormData(prev => ({
        ...prev,
        exits: [...prev.exits, newExitStep.trim()]
      }));
      setNewExitStep('');
    }
  };

  const removeExitStep = (stepId: string) => {
    setFormData(prev => ({
      ...prev,
      exits: prev.exits.filter(id => id !== stepId)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Flow Configuration</DialogTitle>
          <DialogDescription>
            Configure flow properties, entry/exit points, and flow-specific components.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="flow_id">Flow ID *</Label>
              <Input
                id="flow_id"
                value={formData.flow_id}
                onChange={(e) => setFormData(prev => ({ ...prev, flow_id: e.target.value }))}
                className={errors.flow_id ? 'border-red-500' : ''}
                placeholder="e.g., order_management"
              />
              {errors.flow_id && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.flow_id}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this flow manages"
                rows={3}
              />
            </div>
          </div>

          {/* Entry Points */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Entry Points *</h3>
            <p className="text-xs text-gray-500">Steps that can enter this flow</p>
            
            <div className="flex gap-2">
              <Input
                value={newEntryStep}
                onChange={(e) => setNewEntryStep(e.target.value)}
                placeholder="Step ID"
                onKeyDown={(e) => e.key === 'Enter' && addEntryStep()}
              />
              <Button onClick={addEntryStep} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.enters.map((stepId) => (
                <Badge key={stepId} variant="secondary" className="gap-1">
                  {stepId}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 w-4 h-4"
                    onClick={() => removeEntryStep(stepId)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            
            {errors.enters && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.enters}
              </p>
            )}
          </div>

          {/* Exit Points */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Exit Points *</h3>
            <p className="text-xs text-gray-500">Steps that can exit this flow</p>
            
            <div className="flex gap-2">
              <Input
                value={newExitStep}
                onChange={(e) => setNewExitStep(e.target.value)}
                placeholder="Step ID"
                onKeyDown={(e) => e.key === 'Enter' && addExitStep()}
              />
              <Button onClick={addExitStep} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.exits.map((stepId) => (
                <Badge key={stepId} variant="secondary" className="gap-1">
                  {stepId}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 w-4 h-4"
                    onClick={() => removeExitStep(stepId)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            
            {errors.exits && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.exits}
              </p>
            )}
          </div>

          {/* Flow Components */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Flow Components</h3>
            
            <div className="space-y-3 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-600">Memory Configuration</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="llm_provider">LLM Provider</Label>
                  <Input
                    id="llm_provider"
                    value={formData.components?.memory?.llm?.provider || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      components: {
                        ...prev.components,
                        memory: {
                          ...prev.components?.memory,
                          llm: {
                            provider: e.target.value,
                            model: prev.components?.memory?.llm?.model || 'gpt-4'
                          }
                        }
                      }
                    }))}
                    placeholder="openai"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="llm_model">LLM Model</Label>
                  <Input
                    id="llm_model"
                    value={formData.components?.memory?.llm?.model || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      components: {
                        ...prev.components,
                        memory: {
                          ...prev.components?.memory,
                          llm: {
                            provider: prev.components?.memory?.llm?.provider || 'openai',
                            model: e.target.value
                          }
                        }
                      }
                    }))}
                    placeholder="gpt-4o-mini"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retriever_method">Retriever Method</Label>
                <Input
                  id="retriever_method"
                  value={formData.components?.memory?.retriever?.method || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    components: {
                      ...prev.components,
                      memory: {
                        ...prev.components?.memory,
                        retriever: {
                          ...prev.components?.memory?.retriever,
                          method: e.target.value
                        }
                      }
                    }
                  }))}
                  placeholder="bm25"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={Object.keys(errors).length > 0}>
            Save Flow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
