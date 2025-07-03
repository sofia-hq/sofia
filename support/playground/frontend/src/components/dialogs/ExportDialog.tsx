import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { AlertTriangle, CheckCircle, Download, Copy } from 'lucide-react';
import { exportToYaml, type ExportResult, type ValidationError } from '../../utils/nomosYaml';
import type { Node, Edge } from '@xyflow/react';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  agentName?: string;
  persona?: string;
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

export function ExportDialog({
  open,
  onClose,
  nodes,
  edges,
  agentName = 'my-agent',
  persona = 'A helpful assistant',
  onAgentConfigChange
}: ExportDialogProps) {
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [currentAgentName, setCurrentAgentName] = useState(agentName);
  const [currentPersona, setCurrentPersona] = useState(persona);
  const [copied, setCopied] = useState(false);

  // Export functionality
  const handleExport = useCallback(() => {
    const result = exportToYaml(nodes, edges, currentAgentName, currentPersona);
    setExportResult(result);

    // Update agent config
    if (onAgentConfigChange) {
      onAgentConfigChange(currentAgentName, currentPersona);
    }
  }, [nodes, edges, currentAgentName, currentPersona, onAgentConfigChange]);

  // Download YAML file
  const handleDownload = useCallback(() => {
    if (exportResult?.yaml) {
      const blob = new Blob([exportResult.yaml], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentAgentName}.config.agent.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [exportResult, currentAgentName]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (exportResult?.yaml) {
      try {
        await navigator.clipboard.writeText(exportResult.yaml);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  }, [exportResult]);

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
            <Download className="w-5 h-5" />
            Export Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Agent Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input
                id="agent-name"
                value={currentAgentName}
                onChange={(e) => setCurrentAgentName(e.target.value)}
                placeholder="Enter agent name"
              />
            </div>
            <div>
              <Label htmlFor="persona">Persona</Label>
              <Input
                id="persona"
                value={currentPersona}
                onChange={(e) => setCurrentPersona(e.target.value)}
                placeholder="Agent persona description"
              />
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-center">
            <Button onClick={handleExport} className="w-full max-w-xs">
              Generate YAML
            </Button>
          </div>

          {/* Export Results */}
          {exportResult && (
            <div className="space-y-4">
              {/* Validation Results */}
              {(exportResult.errors.length > 0 || exportResult.warnings.length > 0) && (
                <div className="space-y-2">
                  {exportResult.errors.length > 0 && renderValidationErrors(exportResult.errors, 'error')}
                  {exportResult.warnings.length > 0 && renderValidationErrors(exportResult.warnings, 'warning')}
                </div>
              )}

              {/* Success Message */}
              {exportResult.yaml && (
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <div>
                      <h4 className="font-medium text-green-800 dark:text-green-200">Export Successful</h4>
                      <AlertDescription>
                        <p className="text-green-700 dark:text-green-300">
                          Configuration exported successfully.
                        </p>
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}

              {/* Export Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{nodes.filter(n => n.type === 'step').length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Step Nodes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{nodes.filter(n => n.type === 'tool').length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Tool Nodes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{edges.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Connections</div>
                </div>
              </div>

              {/* YAML Output */}
              {exportResult.yaml && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="yaml-output">Generated YAML</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                        className="flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    id="yaml-output"
                    value={exportResult.yaml}
                    readOnly
                    className="font-mono text-sm min-h-[300px] resize-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
