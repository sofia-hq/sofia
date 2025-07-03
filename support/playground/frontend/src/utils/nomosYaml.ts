/**
 * YAML Import/Export utilities for Nomos Visual Builder
 * Converts between React Flow nodes/edges and Nomos config.agent.yaml format
 */

import * as yaml from 'js-yaml';
import { Node, Edge } from '@xyflow/react';
import type {
  StepNodeData,
  ToolNodeData,
  FlowGroupData,
  AgentConfig,
  StepConfig,
  FlowConfig,
  ToolType
} from '../types';

// Validation error interface
export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  path?: string;
  node?: string;
}

// Export result interface
export interface ExportResult {
  yaml: string;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Import result interface
export interface ImportResult {
  nodes: Node[];
  edges: Edge[];
  config: AgentConfig;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Merge import result interface for additive imports
export interface MergeImportResult {
  nodes: Node[];
  edges: Edge[];
  config: AgentConfig;
  errors: ValidationError[];
  warnings: ValidationError[];
  conflicts: {
    stepIds: string[];
    toolNames: string[];
  };
}

/**
 * Convert React Flow nodes and edges to Nomos YAML configuration
 */
export function exportToYaml(
  nodes: Node[],
  edges: Edge[],
  agentName = 'my-agent',
  persona = 'A helpful assistant'
): ExportResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  try {
    // Separate nodes by type
    const stepNodes = nodes.filter(node => node.type === 'step');
    const toolNodes = nodes.filter(node => node.type === 'tool');
    const groupNodes = nodes.filter(node => node.type === 'group');

    // Validate that we have at least one step
    if (stepNodes.length === 0) {
      errors.push({
        type: 'error',
        message: 'At least one step node is required'
      });
    }

    // Build steps array
    const steps: StepConfig[] = [];
    const stepIdMap = new Map<string, string>(); // nodeId -> stepId

    stepNodes.forEach(node => {
      const data = node.data as StepNodeData;
      if (!data.step_id) {
        errors.push({
          type: 'error',
          message: 'Step ID is required',
          node: node.id
        });
        return;
      }

      stepIdMap.set(node.id, data.step_id);

      // Build routes from outgoing edges
      const routes: Array<{ target: string; condition: string }> = [];
      const outgoingEdges = edges.filter(
        edge => edge.source === node.id && edge.type === 'route'
      );

      outgoingEdges.forEach(edge => {
        const targetNode = stepNodes.find(n => n.id === edge.target);
        if (targetNode) {
          const targetData = targetNode.data as StepNodeData;
          const condition = (edge.data?.condition && typeof edge.data.condition === 'string')
            ? edge.data.condition
            : 'Always';
          routes.push({
            target: targetData.step_id,
            condition
          });
        }
      });

      // Get available tools from tool connections
      const availableTools: string[] = [];
      const toolEdges = edges.filter(
        edge => edge.source === node.id && edge.type === 'tool'
      );

      toolEdges.forEach(edge => {
        const toolNode = toolNodes.find(n => n.id === edge.target);
        if (toolNode) {
          const toolData = toolNode.data as ToolNodeData;
          availableTools.push(toolData.name);
        }
      });

      const stepConfig: StepConfig = {
        step_id: data.step_id,
        description: data.description || `Step ${data.step_id}`,
        ...(routes.length > 0 && { routes }),
        ...(availableTools.length > 0 && { available_tools: availableTools }),
        ...(data.auto_flow && { auto_flow: data.auto_flow }),
        ...(data.quick_suggestions && { quick_suggestions: data.quick_suggestions }),
        ...(data.examples && data.examples.length > 0 && { examples: data.examples })
      };

      steps.push(stepConfig);
    });

    // Build flows from group nodes
    const flows: FlowConfig[] = [];
    groupNodes.forEach(node => {
      const data = node.data as unknown as FlowGroupData;

      const flowConfig: FlowConfig = {
        flow_id: data.flow_id,
        description: data.description || `Flow ${data.flow_id}`,
        enters: data.enters || [],
        exits: data.exits || [],
        ...(data.components && { components: data.components }),
        ...(data.metadata && { metadata: data.metadata })
      };

      flows.push(flowConfig);
    });

    // Determine start step
    let startStepId = '';
    if (steps.length > 0) {
      // Find a step that has no incoming routes (potential start step)
      const stepsWithIncoming = new Set<string>();
      steps.forEach(step => {
        step.routes?.forEach(route => {
          stepsWithIncoming.add(route.target);
        });
      });

      const potentialStartSteps = steps.filter(
        step => !stepsWithIncoming.has(step.step_id)
      );

      if (potentialStartSteps.length > 0) {
        startStepId = potentialStartSteps[0].step_id;
      } else {
        startStepId = steps[0].step_id;
        warnings.push({
          type: 'warning',
          message: 'No clear start step found, using first step'
        });
      }
    }

    // Build tool definitions using the new tool_defs structure
    const toolDefs: Record<string, any> = {};
    toolNodes.forEach(node => {
      const data = node.data as ToolNodeData;
      if (
        data.parameters &&
        (data.tool_type === 'custom' || data.tool_type === 'pkg' || !data.tool_type)
      ) {
        const args: Array<{key: string; desc?: string; type?: string}> = [];
        Object.entries(data.parameters).forEach(([key, param]) => {
          const arg: any = { key };
          if (param.description) {
            arg.desc = param.description;
          }
          if (param.type) {
            arg.type = param.type;
          }
          args.push(arg);
        });

        if (args.length > 0 || data.description) {
          const toolDef: any = {};
          if (data.description) {
            toolDef.desc = data.description;
          }
          if (args.length > 0) {
            toolDef.args = args;
          }
          toolDefs[data.name] = toolDef;
        }
      }
    });

    // Build external tools
    const externalTools = toolNodes
      .filter(node => {
        const type = (node.data as ToolNodeData).tool_type;
        return type && type !== 'custom';
      })
      .map(node => {
        const data = node.data as ToolNodeData;
        const tag = `@${data.tool_type}/${data.tool_identifier}`;
        const item: any = { tag, name: data.name };
        if (data.kwargs && Object.keys(data.kwargs).length > 0) {
          item.kwargs = data.kwargs;
        }
        return item;
      });

    const toolsSection: any = {};
    if (externalTools.length > 0) {
      toolsSection.external_tools = externalTools;
    }
    if (Object.keys(toolDefs).length > 0) {
      toolsSection.tool_defs = toolDefs;
    }

    // Build final config
    const config: AgentConfig = {
      name: agentName,
      persona,
      start_step_id: startStepId,
      steps,
      ...(flows.length > 0 && { flows }),
      ...(Object.keys(toolsSection).length > 0 && { tools: toolsSection })
    };

    // Validate config
    validateConfig(config, errors, warnings);

    // Generate YAML with pretty formatting
    const yamlString = yaml.dump(config, {
      indent: 2,
      lineWidth: 100,
      noRefs: true,
      sortKeys: false,
      styles: {
        '!!str': 'literal' // Use literal style for multi-line strings
      }
    });

    // Add header comment
    const header = `# Nomos Agent Configuration
# Generated by Visual Builder on ${new Date().toISOString()}
# Agent: ${agentName}

`;

    return {
      yaml: header + yamlString,
      errors,
      warnings
    };

  } catch (error) {
    errors.push({
      type: 'error',
      message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });

    return {
      yaml: '',
      errors,
      warnings
    };
  }
}

/**
 * Parse YAML configuration and convert to React Flow nodes and edges
 */
export function importFromYaml(yamlContent: string): ImportResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let nodes: Node[] = [];
  let edges: Edge[] = [];
  let config: AgentConfig | null = null;

  try {
    // Parse YAML
    const parsedConfig = yaml.load(yamlContent) as AgentConfig;
    config = parsedConfig;

    // Validate basic structure
    if (!parsedConfig.name) {
      errors.push({
        type: 'error',
        message: 'Agent name is required',
        path: 'name'
      });
    }

    if (!parsedConfig.steps || !Array.isArray(parsedConfig.steps)) {
      errors.push({
        type: 'error',
        message: 'Steps array is required',
        path: 'steps'
      });
      return { nodes: [], edges: [], config: parsedConfig, errors, warnings };
    }

    if (!parsedConfig.start_step_id) {
      errors.push({
        type: 'error',
        message: 'Start step ID is required',
        path: 'start_step_id'
      });
    }

    // Create step nodes
    const stepIdToNodeId = new Map<string, string>();
    const toolNameToNodeId = new Map<string, string>();
    const allToolNames = new Set<string>();
    const externalToolMap: Record<string, { type: ToolType; identifier: string; kwargs?: Record<string, any> }> = {};

    // First pass: collect all tool names
    parsedConfig.steps.forEach(step => {
      if (step.available_tools) {
        step.available_tools.forEach(tool => allToolNames.add(tool));
      }
    });
    if (parsedConfig.tools && parsedConfig.tools.external_tools) {
      parsedConfig.tools.external_tools.forEach(ext => {
        const [typePart, identifier] = ext.tag.split('/', 2);
        const type = typePart.replace('@', '') as ToolType;
        allToolNames.add(ext.name);
        externalToolMap[ext.name] = { type, identifier, kwargs: ext.kwargs };
      });
    }

    // Create tool nodes
    let toolIndex = 0;
    allToolNames.forEach(toolName => {
      const nodeId = `tool-${Date.now()}-${toolIndex++}`;
      toolNameToNodeId.set(toolName, nodeId);

      const toolInfo = externalToolMap[toolName];
      const toolNode: Node = {
        id: nodeId,
        type: 'tool',
        position: calculateToolPosition(toolIndex - 1, allToolNames.size),
        data: {
          name: toolName,
          description: `Tool: ${toolName}`,
          parameters: getToolParameters(
            toolName,
            (parsedConfig.tools?.tool_defs || (parsedConfig as any).tool_defs)
          ),
          tool_type: toolInfo ? toolInfo.type : 'custom',
          tool_identifier: toolInfo?.identifier,
          kwargs: toolInfo?.kwargs
        } as ToolNodeData
      };

      nodes.push(toolNode);
    });

    // Create step nodes with proper positioning
    parsedConfig.steps.forEach((step, index) => {
      const nodeId = `step-${Date.now()}-${index}`;
      stepIdToNodeId.set(step.step_id, nodeId);

      const stepNode: Node = {
        id: nodeId,
        type: 'step',
        position: calculateStepPosition(index, parsedConfig.steps.length),
        data: {
          step_id: step.step_id,
          description: step.description,
          available_tools: step.available_tools || [],
          auto_flow: step.auto_flow || false,
          quick_suggestions: step.quick_suggestions || false,
          examples: step.examples || [],
          routes: step.routes?.map(route => ({
            target: route.target,
            condition: route.condition
          })) || []
        } as StepNodeData
      };

      nodes.push(stepNode);
    });

    // Create group nodes from flows
    if (parsedConfig.flows) {
      parsedConfig.flows.forEach((flow, index) => {
        const groupId = `group-${Date.now()}-${index}`;

        // Find nodes that belong to this flow
        const flowNodeIds: string[] = [];
        [...flow.enters, ...flow.exits].forEach(stepId => {
          const nodeId = stepIdToNodeId.get(stepId);
          if (nodeId && !flowNodeIds.includes(nodeId)) {
            flowNodeIds.push(nodeId);
          }
        });

        const groupNode: Node = {
          id: groupId,
          type: 'group',
          position: calculateGroupPosition(index, parsedConfig.flows!.length),
          style: {
            width: 400,
            height: 300,
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            border: '2px dashed rgba(59, 130, 246, 0.3)',
            borderRadius: 8,
          },
          data: {
            flow_id: flow.flow_id,
            description: flow.description,
            enters: flow.enters,
            exits: flow.exits,
            nodeIds: flowNodeIds,
            components: flow.components,
            metadata: flow.metadata,
            color: '#3B82F6'
          } as unknown as Record<string, unknown>
        };

        nodes.push(groupNode);
      });
    }

    // Create edges
    const edgeIndex = { value: 0 };

    // Step-to-step route edges
    parsedConfig.steps.forEach(step => {
      const sourceNodeId = stepIdToNodeId.get(step.step_id);
      if (!sourceNodeId) return;

      step.routes?.forEach(route => {
        const targetNodeId = stepIdToNodeId.get(route.target);
        if (targetNodeId) {
          const edge: Edge = {
            id: `route-${Date.now()}-${edgeIndex.value++}`,
            source: sourceNodeId,
            target: targetNodeId,
            sourceHandle: 'step-output',
            targetHandle: 'step-input',
            type: 'route',
            data: { condition: route.condition }
          };
          edges.push(edge);
        } else {
          warnings.push({
            type: 'warning',
            message: `Route target '${route.target}' not found`,
            path: `steps[${step.step_id}].routes`
          });
        }
      });

      // Step-to-tool edges
      step.available_tools?.forEach(toolName => {
        const toolNodeId = toolNameToNodeId.get(toolName);
        if (toolNodeId) {
          const edge: Edge = {
            id: `tool-${Date.now()}-${edgeIndex.value++}`,
            source: sourceNodeId,
            target: toolNodeId,
            sourceHandle: 'tool-output',
            targetHandle: 'tool-input',
            type: 'tool'
          };
          edges.push(edge);
        }
      });
    });

    // Validate imported data
    validateImportedData(nodes, edges, parsedConfig, errors, warnings);

  } catch (error) {
    errors.push({
      type: 'error',
      message: `YAML parsing failed: ${error instanceof Error ? error.message : 'Invalid YAML'}`
    });
  }

  return {
    nodes,
    edges,
    config: config || {
      name: 'unknown',
      persona: '',
      start_step_id: '',
      steps: []
    },
    errors,
    warnings
  };
}

/**
 * Parse YAML configuration and merge with existing React Flow nodes and edges
 * This function adds imported nodes alongside existing ones and handles conflicts
 */
export function mergeImportFromYaml(
  yamlContent: string,
  existingNodes: Node[],
  existingEdges: Edge[]
): MergeImportResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const conflicts = { stepIds: [] as string[], toolNames: [] as string[] };

  // First, import the YAML normally
  const importResult = importFromYaml(yamlContent);

  if (importResult.errors.length > 0) {
    return {
      nodes: existingNodes,
      edges: existingEdges,
      config: importResult.config,
      errors: importResult.errors,
      warnings: importResult.warnings,
      conflicts
    };
  }

  // Collect existing step IDs and tool names
  const existingStepIds = new Set<string>();
  const existingToolNames = new Set<string>();

  existingNodes.forEach(node => {
    if (node.type === 'step') {
      const stepData = node.data as StepNodeData;
      if (stepData.step_id) {
        existingStepIds.add(stepData.step_id);
      }
    } else if (node.type === 'tool') {
      const toolData = node.data as ToolNodeData;
      if (toolData.name) {
        existingToolNames.add(toolData.name);
      }
    }
  });

  // Process imported nodes to handle conflicts
  const processedNodes: Node[] = [...existingNodes];
  const nodeIdMapping = new Map<string, string>(); // old nodeId -> new nodeId
  const stepIdMapping = new Map<string, string>(); // old stepId -> new stepId
  const toolNameMapping = new Map<string, string>(); // old toolName -> new toolName

  importResult.nodes.forEach(importedNode => {
    let processedNode = { ...importedNode };

    if (importedNode.type === 'step') {
      const stepData = importedNode.data as StepNodeData;
      if (stepData.step_id && existingStepIds.has(stepData.step_id)) {
        // Step ID conflict - rename with suffix
        const originalStepId = stepData.step_id;
        let counter = 1;
        let newStepId = `${originalStepId}_imported_${counter}`;

        while (existingStepIds.has(newStepId) || stepIdMapping.has(newStepId)) {
          counter++;
          newStepId = `${originalStepId}_imported_${counter}`;
        }

        stepIdMapping.set(originalStepId, newStepId);
        conflicts.stepIds.push(originalStepId);

        processedNode.data = {
          ...stepData,
          step_id: newStepId
        };

        warnings.push({
          type: 'warning',
          message: `Step ID '${originalStepId}' already exists, renamed to '${newStepId}'`
        });
      }
    } else if (importedNode.type === 'tool') {
      const toolData = importedNode.data as ToolNodeData;
      if (toolData.name && existingToolNames.has(toolData.name)) {
        // Tool name conflict - rename with suffix
        const originalToolName = toolData.name;
        let counter = 1;
        let newToolName = `${originalToolName}_imported_${counter}`;

        while (existingToolNames.has(newToolName) || toolNameMapping.has(newToolName)) {
          counter++;
          newToolName = `${originalToolName}_imported_${counter}`;
        }

        toolNameMapping.set(originalToolName, newToolName);
        conflicts.toolNames.push(originalToolName);

        processedNode.data = {
          ...toolData,
          name: newToolName
        };

        warnings.push({
          type: 'warning',
          message: `Tool name '${originalToolName}' already exists, renamed to '${newToolName}'`
        });
      }
    }

    // Generate new unique node ID
    const originalNodeId = importedNode.id;
    let newNodeId = `${importedNode.type}_imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Ensure uniqueness
    while (processedNodes.some(n => n.id === newNodeId)) {
      newNodeId = `${importedNode.type}_imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    nodeIdMapping.set(originalNodeId, newNodeId);
    processedNode.id = newNodeId;

    // Adjust position to avoid overlap with existing nodes
    const offset = calculateImportOffset(existingNodes);
    processedNode.position = {
      x: processedNode.position.x + offset.x,
      y: processedNode.position.y + offset.y
    };

    processedNodes.push(processedNode);

    // Update tracking sets
    if (importedNode.type === 'step') {
      const stepData = processedNode.data as StepNodeData;
      if (stepData.step_id) {
        existingStepIds.add(stepData.step_id);
      }
    } else if (importedNode.type === 'tool') {
      const toolData = processedNode.data as ToolNodeData;
      if (toolData.name) {
        existingToolNames.add(toolData.name);
      }
    }
  });

  // Update step node routes to use new step IDs if they were renamed
  processedNodes.forEach(node => {
    if (node.type === 'step' && node.id.includes('_imported_')) {
      const stepData = node.data as StepNodeData;
      if (stepData.routes) {
        stepData.routes = stepData.routes.map(route => ({
          ...route,
          target: stepIdMapping.get(route.target) || route.target
        }));
      }

      // Update available tools to use new tool names if they were renamed
      if (stepData.available_tools) {
        stepData.available_tools = stepData.available_tools.map(toolName =>
          toolNameMapping.get(toolName) || toolName
        );
      }
    }
  });

  // Process imported edges with updated node IDs and step IDs
  const processedEdges: Edge[] = [...existingEdges];

  importResult.edges.forEach(importedEdge => {
    const newSourceId = nodeIdMapping.get(importedEdge.source);
    const newTargetId = nodeIdMapping.get(importedEdge.target);

    if (newSourceId && newTargetId) {
      const newEdge: Edge = {
        ...importedEdge,
        id: `edge_imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        source: newSourceId,
        target: newTargetId
      };

      processedEdges.push(newEdge);
    }
  });

  return {
    nodes: processedNodes,
    edges: processedEdges,
    config: importResult.config,
    errors: [...errors, ...importResult.errors],
    warnings: [...warnings, ...importResult.warnings],
    conflicts
  };
}

/**
 * Validate the agent configuration
 */
function validateConfig(config: AgentConfig, errors: ValidationError[], warnings: ValidationError[]): void {
  // Check if start step exists
  const stepIds = config.steps.map(step => step.step_id);
  if (config.start_step_id && !stepIds.includes(config.start_step_id)) {
    errors.push({
      type: 'error',
      message: `Start step '${config.start_step_id}' not found in steps`
    });
  }

  // Check route targets
  config.steps.forEach(step => {
    step.routes?.forEach(route => {
      if (!stepIds.includes(route.target)) {
        errors.push({
          type: 'error',
          message: `Route target '${route.target}' not found in steps`,
          path: `steps[${step.step_id}].routes`
        });
      }
    });
  });

  // Check for duplicate step IDs
  const duplicateSteps = stepIds.filter((id, index) => stepIds.indexOf(id) !== index);
  if (duplicateSteps.length > 0) {
    errors.push({
      type: 'error',
      message: `Duplicate step IDs found: ${duplicateSteps.join(', ')}`
    });
  }

  // Warn about steps with no routes (potential dead ends)
  const stepsWithNoRoutes = config.steps.filter(step => !step.routes || step.routes.length === 0);
  if (stepsWithNoRoutes.length > 1) { // Allow one end step
    warnings.push({
      type: 'warning',
      message: `Multiple steps have no routes: ${stepsWithNoRoutes.map(s => s.step_id).join(', ')}`
    });
  }

  // Validate auto_flow steps
  config.steps.forEach(step => {
    if (step.auto_flow) {
      if (!step.routes || step.routes.length === 0) {
        if (!step.available_tools || step.available_tools.length === 0) {
          errors.push({
            type: 'error',
            message: `Auto-flow step '${step.step_id}' must have at least one route or tool`,
            path: `steps[${step.step_id}]`
          });
        }
      }
      if (step.quick_suggestions) {
        errors.push({
          type: 'error',
          message: `Auto-flow step '${step.step_id}' cannot have quick suggestions enabled`,
          path: `steps[${step.step_id}]`
        });
      }
    }
  });
}

/**
 * Validate imported data consistency
 */
function validateImportedData(
  nodes: Node[],
  _edges: Edge[],
  _config: AgentConfig,
  _errors: ValidationError[],
  _warnings: ValidationError[]
): void {
  const stepNodes = nodes.filter(n => n.type === 'step');
  const toolNodes = nodes.filter(n => n.type === 'tool');

  // Check if we have the expected number of nodes
  if (stepNodes.length !== _config.steps.length) {
    _warnings.push({
      type: 'warning',
      message: `Step count mismatch: expected ${_config.steps.length}, got ${stepNodes.length}`
    });
  }

  // Check for missing tools
  const configTools = new Set<string>();
  _config.steps.forEach((step: any) => {
    step.available_tools?.forEach((tool: string) => configTools.add(tool));
  });

  if (toolNodes.length !== configTools.size) {
    _warnings.push({
      type: 'warning',
      message: `Tool count mismatch: expected ${configTools.size}, got ${toolNodes.length}`
    });
  }
}

/**
 * Calculate position for step nodes in a circular layout
 */
function calculateStepPosition(index: number, total: number): { x: number; y: number } {
  const radius = Math.max(300, total * 50);
  const angle = (index / total) * 2 * Math.PI;
  const centerX = 500;
  const centerY = 300;

  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle)
  };
}

/**
 * Calculate position for tool nodes
 */
function calculateToolPosition(index: number, total: number): { x: number; y: number } {
  const columns = Math.ceil(Math.sqrt(total));
  const row = Math.floor(index / columns);
  const col = index % columns;

  return {
    x: 100 + col * 220,
    y: 700 + row * 120
  };
}

/**
 * Calculate position for group nodes
 */
function calculateGroupPosition(index: number, _total: number): { x: number; y: number } {
  return {
    x: 200 + (index % 2) * 600,
    y: 50 + Math.floor(index / 2) * 400
  };
}

/**
 * Get tool parameters from tool_defs
 */
function getToolParameters(
  toolName: string,
  toolDefs?: Record<string, any>
): Record<string, { type: string; description?: string }> {
  if (!toolDefs || !toolDefs[toolName]) {
    return {};
  }

  const parameters: Record<string, { type: string; description?: string }> = {};
  const toolDef = toolDefs[toolName];

  if (toolDef.args && Array.isArray(toolDef.args)) {
    toolDef.args.forEach((arg: any) => {
      if (arg.key) {
        parameters[arg.key] = {
          type: arg.type || 'string', // Default type
          description: arg.desc
        };
      }
    });
  }

  return parameters;
}

/**
 * Validate YAML content without full parsing
 */
export function validateYamlSyntax(yamlContent: string): ValidationError[] {
  const errors: ValidationError[] = [];

  try {
    yaml.load(yamlContent);
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      errors.push({
        type: 'error',
        message: `YAML syntax error: ${error.message}`,
        path: error.mark ? `Line ${error.mark.line + 1}, Column ${error.mark.column + 1}` : undefined
      });
    } else {
      errors.push({
        type: 'error',
        message: `YAML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  return errors;
}

/**
 * Calculate position offset for imported nodes to avoid overlap
 */
function calculateImportOffset(existingNodes: Node[]): { x: number; y: number } {
  if (existingNodes.length === 0) {
    return { x: 0, y: 0 };
  }

  // Find the rightmost position of existing nodes
  const maxX = Math.max(...existingNodes.map(node => node.position.x + (node.type === 'step' ? 280 : 200)));

  // Place imported nodes with some spacing
  return {
    x: maxX + 100, // 100px spacing from rightmost node
    y: 50 // Start from top with some margin
  };
}
