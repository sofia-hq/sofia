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
import { validateToolNode } from '../../utils/validation';
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
  const [newKwargKey, setNewKwargKey] = useState('');
  const [newKwargValue, setNewKwargValue] = useState('');

  // Real-time validation
  const validation = validateToolNode(formData);
  const hasErrors = !validation.isValid;

  useEffect(() => {
    setFormData(toolData);
  }, [toolData]);

  const handleSave = () => {
    if (!hasErrors) {
      onSave(formData);
      onClose();
    }
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

  const addKwarg = () => {
    if (newKwargKey.trim()) {
      setFormData(prev => ({
        ...prev,
        kwargs: {
          ...(prev.kwargs || {}),
          [newKwargKey.trim()]: newKwargValue
        }
      }));
      setNewKwargKey('');
      setNewKwargValue('');
    }
  };

  const removeKwarg = (key: string) => {
    setFormData(prev => {
      const newKwargs = { ...(prev.kwargs || {}) };
      delete newKwargs[key];
      return { ...prev, kwargs: newKwargs };
    });
  };

  const updateKwargValue = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      kwargs: { ...(prev.kwargs || {}), [key]: value }
    }));
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-none w-[42vw] max-h-[80vh] overflow-y-auto"
        style={{ width: '42vw', maxWidth: 'none' }}
      >
        <DialogHeader>
          <DialogTitle>Edit Tool</DialogTitle>
          <DialogDescription>
            Configure the tool name, description, and parameters.
          </DialogDescription>
        </DialogHeader>

        {/* Validation Summary */}
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="space-y-2 mb-4">
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

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>

            {/* Tool Name */}
            <div className="space-y-2">
              <Label htmlFor="tool-name">Tool Name</Label>
              <Input
                id="tool-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter tool name"
                className={validation.errors.some(e => e.field === 'name') ? 'border-red-300' : ''}
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
                disabled={formData.tool_type === 'crewai' || formData.tool_type === 'langchain'}
              />
            </div>

            {/* Tool Type */}
            <div className="space-y-2">
              <Label htmlFor="tool-type">Tool Type</Label>
              <select
                id="tool-type"
                value={formData.tool_type || 'custom'}
                onChange={(e) => setFormData(prev => ({ ...prev, tool_type: e.target.value as any }))}
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
                <Label htmlFor="tool-identifier">Tool Identifier</Label>
                <Input
                  id="tool-identifier"
                  value={formData.tool_identifier || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tool_identifier: e.target.value }))}
                  placeholder="Class or function path"
                />
              </div>
            )}
          </div>

          {/* Right Column - Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Configuration</h3>

            {formData.tool_type && formData.tool_type !== 'custom' && (
              <div className="space-y-2">
                <Label>Kwargs</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    value={newKwargKey}
                    onChange={(e) => setNewKwargKey(e.target.value)}
                    placeholder="Arg name"
                    onKeyPress={(e) => e.key === 'Enter' && addKwarg()}
                  />
                  <Input
                    value={newKwargValue}
                    onChange={(e) => setNewKwargValue(e.target.value)}
                    placeholder="Value"
                  />
                  <Button type="button" onClick={addKwarg} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {Object.entries(formData.kwargs || {}).map(([key, value]) => (
                    <div key={key} className="p-2 border rounded flex items-center gap-2">
                      <Badge variant="outline">{key}</Badge>
                      <Input
                        value={value as string}
                        onChange={(e) => updateKwargValue(key, e.target.value)}
                        className="flex-1"
                      />
                      <button onClick={() => removeKwarg(key)} className="hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {Object.keys(formData.kwargs || {}).length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-2">No kwargs defined</div>
                  )}
                </div>
              </div>
            )}

            {(formData.tool_type !== 'crewai' && formData.tool_type !== 'langchain') && (
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
                  <Input
                    value={newParamType}
                    onChange={(e) => setNewParamType(e.target.value)}
                    placeholder="Parameter type (e.g., string, number, boolean)"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  />
                  <Button type="button" onClick={addParameter} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Existing parameters */}
                <div className="space-y-2 max-h-40 overflow-y-auto">
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
