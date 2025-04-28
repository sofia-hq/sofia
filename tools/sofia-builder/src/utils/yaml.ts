import * as yaml from 'js-yaml';
import { Edge, Node, XYPosition } from '@xyflow/react';
import { SofiaConfig, Step, Tool, Route, SofiaNodeType, SofiaEdgeType } from '../models/sofia';
import { StepNodeData } from '../nodes/StepNode';
import { ToolNodeData } from '../nodes/ToolNode';
import { RouteEdgeData } from '../edges/RouteEdge';
import { ToolUsageEdgeData } from '../edges/ToolUsageEdge';
import { MarkerType } from '@xyflow/react';

// Calculate node positions in a circular layout
function calculateNodePositions(steps: Step[], centerX = 0, centerY = 0, radius = 300): Record<string, XYPosition> {
  const positions: Record<string, XYPosition> = {};
  const angleStep = (2 * Math.PI) / steps.length;
  
  steps.forEach((step, index) => {
    const angle = index * angleStep;
    positions[step.step_id] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });
  
  return positions;
}

// Convert Sofia config to React Flow nodes and edges
export function configToFlow(
  config: SofiaConfig
): { nodes: Node[], edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Map to track node IDs by step_id
  const nodeIdMap: Record<string, string> = {};
  
  // Collect all tool names
  const allToolNames: Set<string> = new Set();
  config.steps.forEach(step => {
    step.available_tools.forEach(tool => {
      allToolNames.add(tool);
    });
  });
  
  // Calculate positions for steps
  const stepPositions = calculateNodePositions(config.steps);
  
  // Create step nodes
  config.steps.forEach((step, index) => {
    // Create node for each step
    const isStartNode = step.step_id === config.start_step_id;
    const nodeId = `step_${Date.now()}_${index}`;
    nodeIdMap[step.step_id] = nodeId;
    
    nodes.push({
      id: nodeId,
      type: SofiaNodeType.STEP,
      position: stepPositions[step.step_id] || { x: index * 200, y: 100 },
      data: {
        label: `${isStartNode ? '🚀 ' : ''}${step.step_id}`,
        description: step.description,
        step_id: step.step_id,
        available_tools: step.available_tools,
      } as StepNodeData,
      style: isStartNode ? { borderColor: '#00ff00', borderWidth: 2 } : undefined,
    });
  });
  
  // Create tool nodes
  let toolIndex = 0;
  const toolPositions: Record<string, XYPosition> = {};
  const toolNodeIdMap: Record<string, string> = {};
  
  allToolNames.forEach(toolName => {
    const nodeId = `tool_${Date.now()}_${toolIndex}`;
    toolNodeIdMap[toolName] = nodeId;
    
    // Position tools to the right of steps
    toolPositions[toolName] = { x: 500, y: 100 + toolIndex * 150 };
    
    nodes.push({
      id: nodeId,
      type: SofiaNodeType.TOOL,
      position: toolPositions[toolName],
      data: {
        name: toolName,
        description: `Tool: ${toolName}`,
        parameters: {},
      } as ToolNodeData,
    });
    
    toolIndex++;
  });
  
  // Create edges for routes between steps
  config.steps.forEach((step, stepIndex) => {
    const sourceNodeId = nodeIdMap[step.step_id];
    
    // Create step-to-step route edges
    step.routes.forEach((route, routeIndex) => {
      const targetNodeId = nodeIdMap[route.target];
      
      if (sourceNodeId && targetNodeId) {
        edges.push({
          id: `${sourceNodeId}-${targetNodeId}-${routeIndex}`,
          source: sourceNodeId,
          target: targetNodeId,
          sourceHandle: 'step-source',
          targetHandle: 'step-target',
          type: SofiaEdgeType.ROUTE,
          data: {
            condition: route.condition,
          } as RouteEdgeData,
          animated: true,
          className: 'step-connection',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#1a73e8',
          },
        });
      }
    });
    
    // Create step-to-tool usage edges
    step.available_tools.forEach((toolName, toolIndex) => {
      const targetNodeId = toolNodeIdMap[toolName];
      
      if (sourceNodeId && targetNodeId) {
        edges.push({
          id: `${sourceNodeId}-${targetNodeId}-tool-${toolIndex}`,
          source: sourceNodeId,
          target: targetNodeId,
          sourceHandle: 'tool-source',
          targetHandle: 'tool-target',
          type: SofiaEdgeType.TOOL_USAGE,
          data: {
            toolName,
          } as ToolUsageEdgeData,
          animated: true,
          className: 'tool-connection',
        });
      }
    });
  });
  
  return { nodes, edges };
}

// Convert React Flow nodes and edges back to Sofia config
export function flowToConfig(
  nodes: Node[],
  edges: Edge[],
  name = 'My Sofia Agent',
  persona = 'A helpful assistant',
  start_step_id?: string
): SofiaConfig {
  const steps: Step[] = [];
  
  // Process all step nodes
  const stepNodes = nodes.filter(node => node.type === SofiaNodeType.STEP);
  
  // Map to track tool usage
  const toolUsageMap: Record<string, string[]> = {};
  
  // Find all tool usage edges and build the mapping
  edges.forEach(edge => {
    if (edge.type === SofiaEdgeType.TOOL_USAGE) {
      const sourceId = edge.source;
      const targetId = edge.target;
      const targetNode = nodes.find(n => n.id === targetId);
      
      if (targetNode && targetNode.type === SofiaNodeType.TOOL) {
        const toolName = targetNode.data.name;
        
        if (!toolUsageMap[sourceId]) {
          toolUsageMap[sourceId] = [];
        }
        
        if (toolName && !toolUsageMap[sourceId].includes(toolName)) {
          toolUsageMap[sourceId].push(toolName);
        }
      }
    }
  });
  
  stepNodes.forEach(node => {
    const stepData = node.data as StepNodeData;
    const routes: Route[] = [];
    
    // Find all step-to-step edges that have this node as a source
    const outgoingRouteEdges = edges.filter(
      edge => edge.source === node.id && 
             edge.type === SofiaEdgeType.ROUTE
    );
    
    outgoingRouteEdges.forEach(edge => {
      const routeData = edge.data as RouteEdgeData;
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (targetNode && targetNode.type === SofiaNodeType.STEP) {
        const targetStepData = targetNode.data as StepNodeData;
        
        routes.push({
          target: targetStepData.step_id,
          condition: routeData?.condition || 'True',
        });
      }
    });
    
    // Get available tools for this step
    const availableTools = toolUsageMap[node.id] || stepData.available_tools || [];
    
    steps.push({
      step_id: stepData.step_id,
      description: stepData.description,
      routes: routes,
      available_tools: availableTools,
    });
  });
  
  // Find the start step ID
  let actualStartStepId = start_step_id || '';
  
  if (!actualStartStepId && steps.length > 0) {
    // If no start step is specified, use the first step
    actualStartStepId = steps[0].step_id;
  } else if (actualStartStepId) {
    // Make sure the start step still exists
    const startStep = stepNodes.find(node => node.id === actualStartStepId);
    if (startStep) {
      const startStepData = startStep.data as StepNodeData;
      actualStartStepId = startStepData.step_id;
    } else {
      // If the start step no longer exists, use the first step
      actualStartStepId = steps.length > 0 ? steps[0].step_id : '';
    }
  }
  
  return {
    name,
    persona,
    start_step_id: actualStartStepId,
    steps,
  };
}

// Parse YAML string to Sofia config
export function parseYaml(yamlString: string): SofiaConfig {
  try {
    return yaml.load(yamlString) as SofiaConfig;
  } catch (error) {
    console.error('Error parsing YAML:', error);
    throw error;
  }
}

// Generate YAML string from Sofia config
export function generateYaml(config: SofiaConfig): string {
  try {
    return yaml.dump(config, { indent: 2 });
  } catch (error) {
    console.error('Error generating YAML:', error);
    throw error;
  }
}