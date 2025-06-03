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
import { X, Plus } from 'lucide-react';
import type { ToolNodeData } from '../../types';

interface ToolEditDialogProps {
  open: boolean;
  onClose: () => void;
  toolData: ToolNodeData;
  onSave: (data: ToolNodeData) => void;
}

export function ToolEditDialog({ open, onClose, toolData, onSave }: ToolEditDialogProps) {
  const [formData, setFormData] = useState<ToolNodeData>(toolData);
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamType, setNewParamType] = useState('string');

  useEffect(() => {
    setFormData(toolData);
  }, [toolData]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const addParameter = () => {
    if (newParamKey.trim()) {
      setFormData(prev => ({
        ...prev,
        parameters: {
          ...prev.parameters,
          [newParamKey.trim()]: { type: newParamType, description: '' }
        }
      }));
      setNewParamKey('');
      setNewParamType('string');
    }
  };

  const removeParameter = (key: string) => {
    setFormData(prev => {
      const newParams = { ...prev.parameters };
      delete newParams[key];
      return { ...prev, parameters: newParams };
    });
  };

  const updateParameterDescription = (key: string, description: string) => {
    setFormData(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: {
          type: prev.parameters?.[key]?.type || 'string',
          description
        }
      }
    }));
  };

  const parameterTypes = ['string', 'number', 'boolean', 'array', 'object'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tool</DialogTitle>
          <DialogDescription>
            Configure the tool name, description, and parameters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tool Name */}
          <div className="space-y-2">
            <Label htmlFor="tool-name">Tool Name</Label>
            <Input
              id="tool-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter tool name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="tool-description">Description</Label>
            <Textarea
              id="tool-description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this tool does..."
              rows={3}
            />
          </div>

          {/* Parameters */}
          <div className="space-y-2">
            <Label>Parameters</Label>
            
            {/* Add new parameter */}
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={newParamKey}
                onChange={(e) => setNewParamKey(e.target.value)}
                placeholder="Parameter name"
                onKeyPress={(e) => e.key === 'Enter' && addParameter()}
              />
              <select
                value={newParamType}
                onChange={(e) => setNewParamType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {parameterTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <Button type="button" onClick={addParameter} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Existing parameters */}
            <div className="space-y-2">
              {Object.entries(formData.parameters || {}).map(([key, param]) => (
                <div key={key} className="p-3 border rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{key}</Badge>
                      <Badge variant="secondary">{param?.type || 'string'}</Badge>
                    </div>
                    <button onClick={() => removeParameter(key)} className="hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <Input
                    value={param?.description || ''}
                    onChange={(e) => updateParameterDescription(key, e.target.value)}
                    placeholder="Parameter description"
                    className="text-sm"
                  />
                </div>
              ))}
            </div>

            {Object.keys(formData.parameters || {}).length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">
                No parameters defined
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
