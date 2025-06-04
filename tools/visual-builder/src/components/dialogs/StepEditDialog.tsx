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
import { X, Plus, AlertCircle, AlertTriangle } from 'lucide-react';
import { validateStepNode } from '../../utils/validation';
import type { StepNodeData } from '../../types';

interface StepEditDialogProps {
  open: boolean;
  onClose: () => void;
  stepData: StepNodeData;
  onSave: (data: StepNodeData) => void;
}

export function StepEditDialog({ open, onClose, stepData, onSave }: StepEditDialogProps) {
  const [formData, setFormData] = useState<StepNodeData>(stepData);
  const [newTool, setNewTool] = useState('');
  const [newRouteTarget, setNewRouteTarget] = useState('');
  const [newRouteCondition, setNewRouteCondition] = useState('');
  
  // Real-time validation
  const validation = validateStepNode(formData);
  const hasErrors = !validation.isValid;

  useEffect(() => {
    setFormData(stepData);
  }, [stepData]);

  const handleSave = () => {
    if (!hasErrors) {
      onSave(formData);
      onClose();
    }
  };

  const addTool = () => {
    if (newTool.trim()) {
      setFormData(prev => ({
        ...prev,
        available_tools: [...(prev.available_tools || []), newTool.trim()]
      }));
      setNewTool('');
    }
  };

  const removeTool = (tool: string) => {
    setFormData(prev => ({
      ...prev,
      available_tools: prev.available_tools?.filter(t => t !== tool)
    }));
  };

  const addRoute = () => {
    if (newRouteTarget.trim() && newRouteCondition.trim()) {
      setFormData(prev => ({
        ...prev,
        routes: [
          ...(prev.routes || []),
          {
            target: newRouteTarget.trim(),
            condition: newRouteCondition.trim()
          }
        ]
      }));
      setNewRouteTarget('');
      setNewRouteCondition('');
    }
  };

  const removeRoute = (index: number) => {
    setFormData(prev => ({
      ...prev,
      routes: prev.routes?.filter((_, i) => i !== index)
    }));
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
                <div key={`error-${index}`} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error.message}</span>
                </div>
              ))}
              {validation.warnings.map((warning, index) => (
                <div key={`warning-${index}`} className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
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

          {/* Available Tools */}
          <div className="space-y-2">
            <Label>Available Tools</Label>
            <div className="flex gap-2">
              <Input
                value={newTool}
                onChange={(e) => setNewTool(e.target.value)}
                placeholder="Add tool name"
                onKeyPress={(e) => e.key === 'Enter' && addTool()}
              />
              <Button type="button" onClick={addTool} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {formData.available_tools?.map(tool => (
                <Badge key={tool} variant="secondary" className="flex items-center gap-1">
                  {tool}
                  <button onClick={() => removeTool(tool)} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Routes */}
          <div className="space-y-2">
            <Label>Routes</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={newRouteTarget}
                onChange={(e) => setNewRouteTarget(e.target.value)}
                placeholder="Target step"
              />
              <div className="flex gap-2">
                <Input
                  value={newRouteCondition}
                  onChange={(e) => setNewRouteCondition(e.target.value)}
                  placeholder="Condition"
                  onKeyPress={(e) => e.key === 'Enter' && addRoute()}
                />
                <Button type="button" onClick={addRoute} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              {formData.routes?.map((route, index) => (
                <div key={index} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                  <span className="font-medium">{route.target}</span>
                  <span>←</span>
                  <span className="flex-1">{route.condition}</span>
                  <button onClick={() => removeRoute(index)} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
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
