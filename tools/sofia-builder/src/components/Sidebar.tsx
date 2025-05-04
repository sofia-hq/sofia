import React, { useCallback, useState, useEffect } from 'react';
import { SofiaConfig } from '../models/sofia';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ThemeToggle } from './ThemeToggle';
import { PlusCircle } from 'lucide-react';

interface SidebarProps {
  onImportYaml: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportYaml: () => void;
  onNewConfig: () => void;
  config: SofiaConfig | null;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, nodeType: string, label: string) => void;
  onAgentConfigChange: (name: string, persona: string) => void;
}

export default function SofiaSidebar({ 
  onImportYaml, 
  onExportYaml, 
  onNewConfig, 
  config, 
  onDragStart,
  onAgentConfigChange
}: SidebarProps) {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentPersona, setAgentPersona] = useState('');

  useEffect(() => {
    if (config) {
      setAgentName(config.name || '');
      setAgentPersona(config.persona || '');
    }
  }, [config]);

  const handleImportClick = useCallback(() => {
    document.getElementById('yaml-import')?.click();
  }, []);

  const handleConfigSave = useCallback(() => {
    onAgentConfigChange(agentName, agentPersona);
    setShowConfigForm(false);
  }, [agentName, agentPersona, onAgentConfigChange]);

  const handleConfigCancel = useCallback(() => {
    if (config) {
      setAgentName(config.name);
      setAgentPersona(config.persona);
    }
    setShowConfigForm(false);
  }, [config]);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string, label: string) => {
    onDragStart(event, nodeType, label);
  };

  return (
    <div className="w-[250px] h-full flex flex-col bg-sidebar text-sidebar-foreground border-r border-border z-5">
      <div className="flex items-center justify-between w-full p-2 border-b">
        <img 
          src="https://i.ibb.co/202j1W2v/sofia-logo.png" 
          alt="SOFIA Builder Logo" 
          className="h-8" 
        />
        <ThemeToggle />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {showConfigForm ? (
          <div>
            <div className="font-semibold mb-2">Agent Configuration</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1">Agent Name</label>
                <Input
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  placeholder="Agent Name"
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Agent Persona</label>
                <Textarea
                  value={agentPersona}
                  onChange={e => setAgentPersona(e.target.value)}
                  placeholder="Agent Persona"
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="default" onClick={handleConfigSave}>Save</Button>
                <Button variant="secondary" onClick={handleConfigCancel}>Cancel</Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, 'step', 'New Step')}
              className="mb-3"
            >
              <Button
                variant="outline"
                className="w-full h-30 text-base flex flex-col items-center justify-center"
              >
                <span className="font-semibold flex items-center justify-center gap-2"><PlusCircle className="w-4 h-4" /> Step</span>
                <span className="text-xs text-muted-foreground mt-1 block text-center">A step is a state in your<br /> agent's flow</span>
              </Button>
            </div>
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, 'tool', 'New Tool')}
              className="mb-3"
            >
              <Button
                variant="outline"
                className="w-full h-30 text-base flex flex-col items-center justify-center"
              >
                <span className="font-semibold flex items-center justify-center gap-2"><PlusCircle className="w-4 h-4" /> Tool</span>
                <span className="text-xs text-muted-foreground mt-1 block text-center">A tool is an action your agent<br /> can use</span>
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full h-30 text-base flex flex-col items-center justify-center mb-3"
              disabled
            >
              <span className="font-semibold flex items-center justify-center gap-2">
                <PlusCircle className="w-4 h-4" />
               Agent
              </span>
              <span className="text-xs text-muted-foreground mt-1 block text-center">
                Another SOFIA agent<br />to assist your agent<br />(coming soon)
              </span>
            </Button>
            <Button
              variant="outline"
              className="w-full h-30 text-base flex flex-col items-center justify-center mb-3"
              disabled
            >
              <span className="font-semibold flex items-center justify-center gap-2"><PlusCircle className="w-4 h-4" /> MCP</span>
              <span className="text-xs text-muted-foreground mt-1 block text-center">
                Conect a MCP Server <br /> to your agent<br />(coming soon)
              </span>
            </Button>
          </>
        )}
      </div>
      <div className="p-2 border-t flex flex-col gap-2">
        <Button variant="secondary" className="w-full mb-2" onClick={onNewConfig}>
          New Config
        </Button>
        <Button variant="secondary" className="w-full mb-2" onClick={handleImportClick}>
          Import YAML
        </Button>
        <input
          id="yaml-import"
          type="file"
          accept=".yaml,.yml"
          onChange={onImportYaml}
          style={{ display: 'none' }}
        />
        <Button 
          variant="default"
          className="w-full"
          onClick={onExportYaml}
          disabled={!config || config.steps.length === 0}
        >
          Export YAML
        </Button>
      </div>
    </div>
  );
}