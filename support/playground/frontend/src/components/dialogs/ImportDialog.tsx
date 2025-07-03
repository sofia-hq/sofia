import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { AlertTriangle, CheckCircle, Upload, FileText } from 'lucide-react';
import { mergeImportFromYaml, type MergeImportResult, type ValidationError } from '../../utils/nomosYaml';
import type { Node, Edge } from '@xyflow/react';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  onImport?: (mergeResult: MergeImportResult) => void;
  onAgentConfigChange?: (name: string, persona: string) => void;
}

interface AlertProps {
  className?: string;
  children: React.ReactNode;
}

interface AlertDescriptionProps {
  children: React.ReactNode;
}

// Alert components
const Alert = ({ className = '', children }: AlertProps) => (
  <div className={`rounded-lg border p-4 ${className}`}>
    {children}
  </div>
);

const AlertDescription = ({ children }: AlertDescriptionProps) => (
  <div className="text-sm">{children}</div>
);

export function ImportDialog({
  open,
  onClose,
  nodes,
  edges,
  onImport,
  onAgentConfigChange
}: ImportDialogProps) {
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<MergeImportResult | null>(null);

  // Import functionality
  const handleImport = useCallback(() => {
    if (!importText.trim()) return;

    const result = mergeImportFromYaml(importText, nodes, edges);
    setImportResult(result);
  }, [importText, nodes, edges]);

  // Apply import result
  const handleApplyImport = useCallback(() => {
    if (importResult && importResult.nodes.length > 0 && onImport) {
      onImport(importResult);

      // Update agent config if available
      if (importResult.config && onAgentConfigChange) {
        onAgentConfigChange(
          importResult.config.name || 'my-agent',
          importResult.config.persona || 'A helpful assistant'
        );
      }

      onClose();
    }
  }, [importResult, onImport, onClose, onAgentConfigChange]);

  // File upload handler
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportText(content);
        // Auto-import when file is loaded
        const result = mergeImportFromYaml(content, nodes, edges);
        setImportResult(result);
      };
      reader.readAsText(file);
    }
  }, [nodes, edges]);

  // Validation error rendering
  const renderValidationErrors = (errors: ValidationError[], type: 'error' | 'warning') => {
    if (errors.length === 0) return null;

    return (
      <Alert className={type === 'error' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' : 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'}>
        <div className="flex items-start gap-2">
          <AlertTriangle className={`w-4 h-4 mt-0.5 ${type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
          <div className="flex-1">
            <h4 className={`font-medium ${type === 'error' ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
              {type === 'error' ? 'Errors' : 'Warnings'} ({errors.length})
            </h4>
            <AlertDescription>
              <ul className="mt-1 list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className={`text-sm ${type === 'error' ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                    {error.path && <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">{error.path}</span>}{' '}
                    {error.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </div>
        </div>
      </Alert>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-none w-[42vw] max-h-[80vh] overflow-hidden flex flex-col"
        style={{ width: '42vw', maxWidth: 'none' }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Upload YAML File</Label>
            <div className="flex items-center gap-2">
              <input
                id="file-upload"
                type="file"
                accept=".yaml,.yml"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 dark:text-gray-400
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-lg file:border-0
                         file:text-sm file:font-medium
                         file:bg-blue-50 file:text-blue-700
                         hover:file:bg-blue-100
                         dark:file:bg-blue-900 dark:file:text-blue-300
                         dark:hover:file:bg-blue-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
            <span className="text-sm text-gray-500 dark:text-gray-400">or</span>
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
          </div>

          {/* Manual Input */}
          <div className="space-y-2">
            <Label htmlFor="yaml-input">Paste YAML Content</Label>
            <Textarea
              id="yaml-input"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste your YAML configuration here..."
              className="font-mono text-sm min-h-[200px] resize-none"
            />
          </div>

          {/* Import Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="w-full max-w-xs"
            >
              <FileText className="w-4 h-4 mr-2" />
              Parse YAML
            </Button>
          </div>

          {/* Import Results */}
          {importResult && (
            <div className="space-y-4">
              {/* Validation Results */}
              {(importResult.errors.length > 0 || importResult.warnings.length > 0) && (
                <div className="space-y-2">
                  {importResult.errors.length > 0 && renderValidationErrors(importResult.errors, 'error')}
                  {importResult.warnings.length > 0 && renderValidationErrors(importResult.warnings, 'warning')}
                </div>
              )}

              {/* Success Message */}
              {importResult.nodes.length > 0 && (
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <div>
                      <h4 className="font-medium text-green-800 dark:text-green-200">Import Successful</h4>
                      <AlertDescription>
                        <p className="text-green-700 dark:text-green-300">
                          Ready to import {importResult.nodes.length} nodes and {importResult.edges.length} connections.
                        </p>
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}

              {/* Import Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {importResult.nodes.filter(n => n.type === 'step').length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Step Nodes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {importResult.nodes.filter(n => n.type === 'tool').length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Tool Nodes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {importResult.edges.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Connections</div>
                </div>
              </div>

              {/* Agent Configuration Preview */}
              {importResult.config && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Agent Configuration</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Name:</span> {importResult.config.name || 'Not specified'}</div>
                    <div><span className="font-medium">Persona:</span> {importResult.config.persona || 'Not specified'}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {importResult && importResult.nodes.length > 0 && (
            <Button
              onClick={handleApplyImport}
              disabled={importResult.errors.length > 0}
            >
              Apply Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
