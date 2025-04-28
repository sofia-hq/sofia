import React, { useState, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { StepNodeData } from '../nodes/StepNode';
import { ToolNodeData } from '../nodes/ToolNode';
import { RouteEdgeData } from '../edges/RouteEdge';
import { ToolUsageEdgeData } from '../edges/ToolUsageEdge';
import { SofiaConfig, SofiaEdgeType, SofiaNodeType } from '../models/sofia';

interface PropertyPanelProps {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onNodeChange: (id: string, data: StepNodeData | ToolNodeData) => void;
  onEdgeChange: (id: string, data: RouteEdgeData | ToolUsageEdgeData) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onSetStartStep: (id: string) => void;
  isStartStep: (id: string) => boolean;
  stepNodes: Node[];
  config: SofiaConfig;
  onAgentConfigChange: (name: string, persona: string) => void;
}

export default function PropertyPanel({
  selectedNode,
  selectedEdge,
  onNodeChange,
  onEdgeChange,
  onDeleteNode,
  onDeleteEdge,
  onSetStartStep,
  isStartStep,
  stepNodes,
  config,
  onAgentConfigChange
}: PropertyPanelProps) {
  // State for controlled form inputs
  const [stepId, setStepId] = useState('');
  const [stepDescription, setStepDescription] = useState('');
  const [stepTools, setStepTools] = useState('');
  const [toolName, setToolName] = useState('');
  const [toolDescription, setToolDescription] = useState('');
  const [routeCondition, setRouteCondition] = useState('');
  const [toolUsageName, setToolUsageName] = useState('');
  
  // Update local state when selection changes
  useEffect(() => {
    if (selectedNode && selectedNode.type === SofiaNodeType.STEP) {
      const data = selectedNode.data as StepNodeData;
      setStepId(data.step_id || '');
      setStepDescription(data.description || '');
      setStepTools(data.available_tools?.join(', ') || '');
    } else if (selectedNode && selectedNode.type === SofiaNodeType.TOOL) {
      const data = selectedNode.data as ToolNodeData;
      setToolName(data.name || '');
      setToolDescription(data.description || '');
    } else if (selectedEdge && selectedEdge.type === SofiaEdgeType.ROUTE) {
      const data = selectedEdge.data as RouteEdgeData;
      setRouteCondition(data?.condition || '');
    } else if (selectedEdge && selectedEdge.type === SofiaEdgeType.TOOL_USAGE) {
      const data = selectedEdge.data as ToolUsageEdgeData;
      setToolUsageName(data?.toolName || '');
    }
  }, [selectedNode, selectedEdge]);
  
  // If nothing is selected, show agent config
  if (!selectedNode && !selectedEdge) {
    return (
      <div className="right-panel">
        <h3>Agent Settings</h3>
        
        {/* Start step selector */}
        <div className="form-group">
          <label className="form-label">Start Step</label>
          <select
            className="form-control"
            value={config.start_step_id}
            onChange={(e) => onSetStartStep(e.target.value)}
          >
            <option value="">-- Select Start Step --</option>
            {stepNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.data.step_id}
              </option>
            ))}
          </select>
        </div>
        
        <p className="panel-message">
          Select a step, tool, or route to edit its properties.
        </p>
      </div>
    );
  }

  // Handle Step Node editing
  if (selectedNode && selectedNode.type === SofiaNodeType.STEP) {
    const handleStepIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setStepId(newValue);
      
      // Update the node data
      const data = {...selectedNode.data as StepNodeData};
      data.step_id = newValue;
      onNodeChange(selectedNode.id, data);
    };
    
    const handleStepDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setStepDescription(newValue);
      
      // Update the node data
      const data = {...selectedNode.data as StepNodeData};
      data.description = newValue;
      onNodeChange(selectedNode.id, data);
    };
    
    const handleStepToolsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setStepTools(newValue);
      
      // Update the node data
      const toolsList = newValue
        .split(',')
        .map(tool => tool.trim())
        .filter(Boolean);
      
      const data = {...selectedNode.data as StepNodeData};
      data.available_tools = toolsList;
      onNodeChange(selectedNode.id, data);
    };
    
    return (
      <div className="right-panel">
        <h3>Step Properties</h3>
        
        <div className="form-group">
          <label className="form-label">Step ID</label>
          <input 
            type="text" 
            className="form-control"
            value={stepId}
            onChange={handleStepIdChange}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea 
            className="form-control"
            value={stepDescription}
            onChange={handleStepDescriptionChange}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Available Tools (comma separated)</label>
          <input 
            type="text" 
            className="form-control"
            value={stepTools}
            onChange={handleStepToolsChange}
          />
        </div>
        
        <div className="form-group">
          <button 
            className={`btn ${isStartStep(selectedNode.id) ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => onSetStartStep(selectedNode.id)}
            disabled={isStartStep(selectedNode.id)}
          >
            {isStartStep(selectedNode.id) ? 'Start Step' : 'Set as Start Step'}
          </button>
        </div>
        
        <div className="form-group">
          <button 
            className="btn btn-danger"
            onClick={() => onDeleteNode(selectedNode.id)}
          >
            Delete Step
          </button>
        </div>
      </div>
    );
  }
  
  // Handle Tool Node editing
  if (selectedNode && selectedNode.type === SofiaNodeType.TOOL) {
    const handleToolNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setToolName(newValue);
      
      // Update the node data
      const data = {...selectedNode.data as ToolNodeData};
      data.name = newValue;
      onNodeChange(selectedNode.id, data);
    };
    
    const handleToolDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setToolDescription(newValue);
      
      // Update the node data
      const data = {...selectedNode.data as ToolNodeData};
      data.description = newValue;
      onNodeChange(selectedNode.id, data);
    };
    
    return (
      <div className="right-panel">
        <h3>Tool Properties</h3>
        
        <div className="form-group">
          <label className="form-label">Name</label>
          <input 
            type="text" 
            className="form-control"
            value={toolName}
            onChange={handleToolNameChange}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea 
            className="form-control"
            value={toolDescription}
            onChange={handleToolDescriptionChange}
          />
        </div>
        
        <div className="form-group">
          <button 
            className="btn btn-danger"
            onClick={() => onDeleteNode(selectedNode.id)}
          >
            Delete Tool
          </button>
        </div>
      </div>
    );
  }
  
  // Handle Edge (Route) editing
  if (selectedEdge) {
    if (selectedEdge.type === SofiaEdgeType.ROUTE) {
      const handleConditionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setRouteCondition(newValue);
        
        // Update the edge data
        onEdgeChange(selectedEdge.id, {
          condition: newValue
        } as RouteEdgeData);
      };
      
      return (
        <div className="right-panel">
          <h3>Route Properties</h3>
          
          <div className="form-group">
            <label className="form-label">Condition</label>
            <textarea 
              className="form-control"
              value={routeCondition}
              onChange={handleConditionChange}
            />
          </div>
          
          <div className="form-group">
            <button 
              className="btn btn-danger"
              onClick={() => onDeleteEdge(selectedEdge.id)}
            >
              Delete Route
            </button>
          </div>
        </div>
      );
    } else if (selectedEdge.type === SofiaEdgeType.TOOL_USAGE) {
      const handleToolUsageNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setToolUsageName(newValue);
        
        // Update the edge data
        onEdgeChange(selectedEdge.id, {
          toolName: newValue
        } as ToolUsageEdgeData);
      };
      
      return (
        <div className="right-panel">
          <h3>Tool Usage</h3>
          
          <div className="form-group">
            <label className="form-label">Tool Name</label>
            <input 
              type="text" 
              className="form-control"
              value={toolUsageName}
              onChange={handleToolUsageNameChange}
            />
          </div>
          
          <div className="form-group">
            <button 
              className="btn btn-danger"
              onClick={() => onDeleteEdge(selectedEdge.id)}
            >
              Delete Tool Usage
            </button>
          </div>
        </div>
      );
    }
  }
  
  return null;
}