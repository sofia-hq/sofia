import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertTriangle, CheckCircle, Download, Upload, FileText, Copy } from 'lucide-react';
import { exportToYaml, mergeImportFromYaml, type ExportResult, type MergeImportResult, type ValidationError } from '../../utils/nomosYaml';
import type { Node, Edge } from '@xyflow/react';

interface ExportImportDialogProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  onImport?: (mergeResult: MergeImportResult) => void;
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

// Use the Alert components
const AlertComponent = Alert;
const AlertDescriptionComponent = AlertDescription;

export function ExportImportDialog({
  open,
  onClose,
  nodes,
  edges,
  onImport,
  agentName = 'my-agent',
  persona = 'A helpful assistant',
  onAgentConfigChange
}: ExportImportDialogProps) {
  const [activeTab, setActiveTab] = useState('export');
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<MergeImportResult | null>(null);
  const [currentAgentName, setCurrentAgentName] = useState(agentName);
  const [currentPersona, setCurrentPersona] = useState(persona);
  const [copied, setCopied] = useState(false);

  // Export functionality
  const handleExport = useCallback(() => {
    const result = exportToYaml(nodes, edges, currentAgentName, currentPersona);
    setExportResult(result);
  }, [nodes, edges, currentAgentName, currentPersona]);

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
          importResult.config.name || currentAgentName,
          importResult.config.persona || currentPersona
        );
      }
      
      onClose();
    }
  }, [importResult, onImport, onClose, currentAgentName, currentPersona, onAgentConfigChange]);

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
    const filteredErrors = errors.filter(e => e.type === type);
    if (filteredErrors.length === 0) return null;

    return (
      <AlertComponent className={type === 'error' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
        <div className="flex items-start gap-2">
          {type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
          )}
          <div className="flex-1">
            <h4 className={`font-medium ${type === 'error' ? 'text-red-800' : 'text-yellow-800'}`}>
              {type === 'error' ? 'Errors' : 'Warnings'} ({filteredErrors.length})
            </h4>
            <AlertDescriptionComponent>
              <ul className="mt-1 list-disc list-inside space-y-1">
                {filteredErrors.map((error, index) => (
                  <li key={index} className={`text-sm ${type === 'error' ? 'text-red-700' : 'text-yellow-700'}`}>
                    {error.path && <span className="font-mono text-xs bg-gray-200 px-1 rounded">{error.path}</span>}{' '}
                    {error.message}
                  </li>
                ))}
              </ul>
            </AlertDescriptionComponent>
          </div>
        </div>
      </AlertComponent>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            YAML Import/Export
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </TabsTrigger>
              <TabsTrigger value="import" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import
              </TabsTrigger>
            </TabsList>

            {/* Export Tab */}
            <TabsContent value="export" className="flex-1 space-y-4 overflow-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agent-name">Agent Name</Label>
                  <Input
                    id="agent-name"
                    value={currentAgentName}
                    onChange={(e) => setCurrentAgentName(e.target.value)}
                    placeholder="my-agent"
                  />
                </div>
                <div>
                  <Label htmlFor="persona">Persona</Label>
                  <Input
                    id="persona"
                    value={currentPersona}
                    onChange={(e) => setCurrentPersona(e.target.value)}
                    placeholder="A helpful assistant"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleExport} variant="default">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate YAML
                </Button>
                {exportResult?.yaml && (
                  <>
                    <Button onClick={handleDownload} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button onClick={handleCopy} variant="outline">
                      {copied ? (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      ) : (
                        <Copy className="w-4 h-4 mr-2" />
                      )}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </>
                )}
              </div>

              {exportResult && (
                <div className="space-y-4">
                  {/* Validation Results */}
                  {renderValidationErrors([...exportResult.errors, ...exportResult.warnings], 'error')}
                  {renderValidationErrors([...exportResult.errors, ...exportResult.warnings], 'warning')}

                  {/* YAML Output */}
                  {exportResult.yaml && (
                    <div>
                      <Label>Generated YAML Configuration</Label>
                      <Textarea
                        value={exportResult.yaml}
                        readOnly
                        className="font-mono text-sm h-64 mt-2"
                        placeholder="YAML will appear here..."
                      />
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Import Tab */}
            <TabsContent value="import" className="flex-1 space-y-4 overflow-auto">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="yaml-file">Upload YAML File</Label>
                  <Input
                    id="yaml-file"
                    type="file"
                    accept=".yaml,.yml"
                    onChange={handleFileUpload}
                    className="mt-2"
                  />
                </div>

                <div className="text-center text-gray-500">
                  <span>or</span>
                </div>

                <div>
                  <Label htmlFor="yaml-input">Paste YAML Content</Label>
                  <Textarea
                    id="yaml-input"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="font-mono text-sm h-48 mt-2"
                    placeholder="Paste your config.agent.yaml content here..."
                  />
                </div>

                <Button onClick={handleImport} disabled={!importText.trim()}>
                  <FileText className="w-4 h-4 mr-2" />
                  Parse YAML
                </Button>
              </div>

              {importResult && (
                <div className="space-y-4">
                  {/* Validation Results */}
                  {renderValidationErrors([...importResult.errors, ...importResult.warnings], 'error')}
                  {renderValidationErrors([...importResult.errors, ...importResult.warnings], 'warning')}

                  {/* Import Summary */}
                  {importResult.nodes.length > 0 && (
                    <div className="space-y-3">
                      <AlertComponent className="border-green-200 bg-green-50">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <AlertDescriptionComponent>
                          <div className="text-green-800">
                            <h4 className="font-medium">Import successful!</h4>
                            <div className="mt-1 text-sm">
                              Found {importResult.nodes.filter(n => n.type === 'step').length} steps, {' '}
                              {importResult.nodes.filter(n => n.type === 'tool').length} tools, {' '}
                              {importResult.nodes.filter(n => n.type === 'group').length} flows, and {' '}
                              {importResult.edges.length} connections.
                            </div>
                            {importResult.config.name && (
                              <div className="mt-1 text-sm">
                                Agent: <span className="font-mono">{importResult.config.name}</span>
                              </div>
                            )}
                          </div>
                        </AlertDescriptionComponent>
                      </AlertComponent>

                      {/* Conflict Information */}
                      {importResult.conflicts && (importResult.conflicts.stepIds.length > 0 || importResult.conflicts.toolNames.length > 0) && (
                        <AlertComponent className="border-orange-200 bg-orange-50">
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                          <AlertDescriptionComponent>
                            <div className="text-orange-800">
                              <h4 className="font-medium">
                                Conflicts Resolved ({importResult.conflicts.stepIds.length + importResult.conflicts.toolNames.length})
                              </h4>
                              <div className="mt-1 text-sm">
                                The following conflicts were automatically resolved by renaming:
                              </div>
                              <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                                {importResult.conflicts.stepIds.map((stepId: string, index: number) => (
                                  <li key={`step-${index}`}>
                                    Step ID: <span className="font-mono text-xs bg-gray-200 px-1 rounded">
                                      {stepId}
                                    </span> (renamed with suffix)
                                  </li>
                                ))}
                                {importResult.conflicts.toolNames.map((toolName: string, index: number) => (
                                  <li key={`tool-${index}`}>
                                    Tool Name: <span className="font-mono text-xs bg-gray-200 px-1 rounded">
                                      {toolName}
                                    </span> (renamed with suffix)
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </AlertDescriptionComponent>
                        </AlertComponent>
                      )}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {activeTab === 'import' && importResult && importResult.nodes.length > 0 && (
            <Button 
              onClick={handleApplyImport}
              disabled={importResult.errors.some(e => e.type === 'error')}
            >
              Apply Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
