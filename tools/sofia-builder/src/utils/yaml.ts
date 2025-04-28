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
  const nodeIdMap: Record<string, string> = {};
  const allToolNames: Set<string> = new Set();
  const steps = config.steps || [];
  // Collect all tool names
  steps.forEach(step => {
    (step.available_tools || []).forEach(tool => {
      allToolNames.add(tool);
    });
  });
  // Calculate positions for steps
  const stepPositions = calculateNodePositions(steps);
  // Create step nodes
  steps.forEach((step, index) => {
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
        available_tools: step.available_tools || [],
      },
    });
  });
  // Create tool nodes
  let toolIndex = 0;
  const toolPositions: Record<string, XYPosition> = {};
  const toolNodeIdMap: Record<string, string> = {};
  // Map tool_arg_descriptions to tool nodes if present
  const toolArgDescriptions = config.tool_arg_descriptions || {};
  allToolNames.forEach(toolName => {
    const nodeId = `tool_${Date.now()}_${toolIndex}`;
    toolNodeIdMap[toolName] = nodeId;
    toolPositions[toolName] = { x: 500, y: 100 + toolIndex * 150 };
    // Convert tool_arg_descriptions to arguments array
    const argDescObj = toolArgDescriptions[toolName] || {};
    const argumentsArr = Object.entries(argDescObj).map(([name, description]) => ({ name, description }));
    nodes.push({
      id: nodeId,
      type: SofiaNodeType.TOOL,
      position: toolPositions[toolName],
      data: {
        name: toolName,
        arguments: argumentsArr,
      },
    });
    toolIndex++;
  });
  
  // Create edges for routes between steps
  config.steps.forEach((step, stepIndex) => {
    const sourceNodeId = nodeIdMap[step.step_id];
    
    // Create step-to-step route edges
    (step.routes || []).forEach((route, routeIndex) => {
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
  const stepNodes = nodes.filter(node => node.type === SofiaNodeType.STEP);
  const toolNodes = nodes.filter(node => node.type === SofiaNodeType.TOOL);
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
    const stepData = node.data as any;
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
    const stepObj: any = {
      step_id: stepData.step_id,
      description: stepData.description,
    };
    if (routes.length > 0) stepObj.routes = routes;
    if (availableTools.length > 0) stepObj.available_tools = availableTools;
    steps.push(stepObj);
  });
  
  // Collect tool_arg_descriptions if any tool node has arguments
  const toolArgDescriptions: Record<string, any> = {};
  toolNodes.forEach(node => {
    const toolData = node.data as any;
    if (toolData.arguments && toolData.arguments.length > 0) {
      const argObj: Record<string, string> = {};
      toolData.arguments.forEach((arg: { name: string; description: string }) => {
        argObj[arg.name] = arg.description;
      });
      toolArgDescriptions[toolData.name] = argObj;
    }
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
  
  const config: any = {
    name,
    persona,
    start_step_id: actualStartStepId,
    steps,
  };
  if (Object.keys(toolArgDescriptions).length > 0) {
    config.tool_arg_descriptions = toolArgDescriptions;
  }
  return config;
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