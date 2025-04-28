import React, { useCallback, useState, useEffect } from 'react';
import { SofiaConfig } from '../models/sofia';

interface SidebarProps {
  onImportYaml: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportYaml: () => void;
  onNewConfig: () => void;
  config: SofiaConfig | null;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, nodeType: string, label: string) => void;
  onAgentConfigChange: (name: string, persona: string) => void;
}

export default function Sidebar({ 
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
  
  // Update local state when config changes
  useEffect(() => {
    if (config) {
      setAgentName(config.name || '');
      setAgentPersona(config.persona || '');
    }
  }, [config]);
  
  const handleImportClick = useCallback(() => {
    document.getElementById('yaml-import')?.click();
  }, []);
  
  const handleConfigClick = useCallback(() => {
    if (config) {
      setShowConfigForm(true);
    }
  }, [config]);
  
  const handleConfigSave = useCallback(() => {
    onAgentConfigChange(agentName, agentPersona);
    setShowConfigForm(false);
  }, [agentName, agentPersona, onAgentConfigChange]);
  
  const handleConfigCancel = useCallback(() => {
    // Reset to original values
    if (config) {
      setAgentName(config.name);
      setAgentPersona(config.persona);
    }
    setShowConfigForm(false);
  }, [config]);

  return (
    <div className="sidebar">
      <div className="sidebar-header">Sofia Agent Builder</div>
      
      {showConfigForm ? (
        <div className="sidebar-content">
          <h3>Agent Configuration</h3>
          <div className="form-group">
            <label className="form-label">Agent Name</label>
            <input 
              type="text" 
              className="form-control"
              value={agentName} 
              onChange={(e) => setAgentName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Agent Persona</label>
            <textarea 
              className="form-control"
              value={agentPersona} 
              rows={5}
              onChange={(e) => setAgentPersona(e.target.value)}
            />
          </div>
          <div className="form-group">
            <button className="btn btn-primary" onClick={handleConfigSave}>Save</button>
            <button className="btn btn-secondary" style={{ marginLeft: '10px' }} onClick={handleConfigCancel}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="sidebar-content">
          <h3>Components</h3>
          <div 
            className="dragable-item"
            draggable
            onDragStart={(event) => onDragStart(event, 'step', 'New Step')}
          >
            + Add Step
          </div>
          
          <div 
            className="dragable-item"
            draggable
            onDragStart={(event) => onDragStart(event, 'tool', 'New Tool')}
          >
            + Add Tool
          </div>
          
          <h3>Current Config</h3>
          {config && (
            <div className="config-info">
              <div><strong>Name:</strong> {config.name}</div>
              <div><strong>Start Step:</strong> {config.start_step_id}</div>
              <div><strong>Steps:</strong> {config.steps.length}</div>
              <div style={{ marginTop: '10px' }}>
                <button className="btn btn-secondary btn-block" onClick={handleConfigClick}>
                  Edit Agent Config
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="sidebar-footer">
        <button className="btn btn-secondary btn-block" onClick={onNewConfig}>
          New Config
        </button>
        <button className="btn btn-secondary btn-block" onClick={handleImportClick}>
          Import YAML
        </button>
        <input
          id="yaml-import"
          type="file"
          accept=".yaml,.yml"
          onChange={onImportYaml}
          style={{ display: 'none' }}
        />
        <button 
          className="btn btn-primary btn-block" 
          onClick={onExportYaml}
          disabled={!config || config.steps.length === 0}
        >
          Export YAML
        </button>
      </div>
    </div>
  );
}