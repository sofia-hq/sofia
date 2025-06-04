import type { Node, Edge } from '@xyflow/react';
import type { StepNodeData, ToolNodeData, FlowGroupData } from '../types';

export interface BulkOperationResult {
  nodes: Node[];
  edges: Edge[];
  message: string;
}

export interface BulkEditOptions {
  selectedNodeIds: string[];
  nodes: Node[];
  edges: Edge[];
}

export interface BulkMoveOptions extends BulkEditOptions {
  deltaX: number;
  deltaY: number;
}

export interface BulkEditFieldOptions extends BulkEditOptions {
  field: string;
  value: any;
}

/**
 * Delete multiple selected nodes and their connected edges
 */
export function bulkDeleteNodes(options: BulkEditOptions): BulkOperationResult {
  const { selectedNodeIds, nodes, edges } = options;

  if (selectedNodeIds.length === 0) {
    return {
      nodes,
      edges,
      message: 'No nodes selected for deletion'
    };
  }

  // Remove selected nodes
  const newNodes = nodes.filter(node => !selectedNodeIds.includes(node.id));

  // Remove edges connected to deleted nodes
  const newEdges = edges.filter(edge =>
    !selectedNodeIds.includes(edge.source) && !selectedNodeIds.includes(edge.target)
  );

  // Handle group nodes: if a group is deleted, ungroup its children
  const ungroupedNodes = newNodes.map(node => {
    if (node.parentId && selectedNodeIds.includes(node.parentId)) {
      // Find the parent group to get its position for converting relative to absolute
      const parentGroup = nodes.find(n => n.id === node.parentId);
      if (parentGroup) {
        return {
          ...node,
          parentId: undefined,
          extent: undefined,
          position: {
            x: parentGroup.position.x + node.position.x,
            y: parentGroup.position.y + node.position.y,
          },
        };
      }
    }
    return node;
  });

  return {
    nodes: ungroupedNodes,
    edges: newEdges,
    message: `Deleted ${selectedNodeIds.length} node(s)`
  };
}

/**
 * Move multiple selected nodes by a delta amount
 */
export function bulkMoveNodes(options: BulkMoveOptions): BulkOperationResult {
  const { selectedNodeIds, nodes, edges, deltaX, deltaY } = options;

  if (selectedNodeIds.length === 0) {
    return {
      nodes,
      edges,
      message: 'No nodes selected for moving'
    };
  }

  const newNodes = nodes.map(node => {
    if (selectedNodeIds.includes(node.id)) {
      return {
        ...node,
        position: {
          x: node.position.x + deltaX,
          y: node.position.y + deltaY,
        },
      };
    }
    return node;
  });

  return {
    nodes: newNodes,
    edges,
    message: `Moved ${selectedNodeIds.length} node(s)`
  };
}

/**
 * Edit a field on multiple selected step nodes
 */
export function bulkEditStepNodes(options: BulkEditFieldOptions): BulkOperationResult {
  const { selectedNodeIds, nodes, edges, field, value } = options;

  const stepNodeIds = selectedNodeIds.filter(id => {
    const node = nodes.find(n => n.id === id);
    return node?.type === 'step';
  });

  if (stepNodeIds.length === 0) {
    return {
      nodes,
      edges,
      message: 'No step nodes selected for editing'
    };
  }

  const newNodes = nodes.map(node => {
    if (stepNodeIds.includes(node.id) && node.type === 'step') {
      const data = node.data as StepNodeData;
      return {
        ...node,
        data: {
          ...data,
          [field]: value,
        },
      };
    }
    return node;
  });

  return {
    nodes: newNodes,
    edges,
    message: `Updated ${field} for ${stepNodeIds.length} step node(s)`
  };
}

/**
 * Edit a field on multiple selected tool nodes
 */
export function bulkEditToolNodes(options: BulkEditFieldOptions): BulkOperationResult {
  const { selectedNodeIds, nodes, edges, field, value } = options;

  const toolNodeIds = selectedNodeIds.filter(id => {
    const node = nodes.find(n => n.id === id);
    return node?.type === 'tool';
  });

  if (toolNodeIds.length === 0) {
    return {
      nodes,
      edges,
      message: 'No tool nodes selected for editing'
    };
  }

  const newNodes = nodes.map(node => {
    if (toolNodeIds.includes(node.id) && node.type === 'tool') {
      const data = node.data as ToolNodeData;
      return {
        ...node,
        data: {
          ...data,
          [field]: value,
        },
      };
    }
    return node;
  });

  return {
    nodes: newNodes,
    edges,
    message: `Updated ${field} for ${toolNodeIds.length} tool node(s)`
  };
}

/**
 * Duplicate multiple selected nodes
 */
export function bulkDuplicateNodes(options: BulkEditOptions): BulkOperationResult {
  const { selectedNodeIds, nodes, edges } = options;

  if (selectedNodeIds.length === 0) {
    return {
      nodes,
      edges,
      message: 'No nodes selected for duplication'
    };
  }

  const selectedNodes = nodes.filter(node => selectedNodeIds.includes(node.id));
  const duplicatedNodes: Node[] = [];
  const idMapping: Record<string, string> = {};

  // Create duplicated nodes with new IDs
  selectedNodes.forEach(node => {
    const newId = `${node.id}_copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    idMapping[node.id] = newId;

    const duplicatedNode: Node = {
      ...node,
      id: newId,
      position: {
        x: node.position.x + 50, // Offset duplicates slightly
        y: node.position.y + 50,
      },
      selected: false, // Don't select the duplicates initially
    };

    // Update data based on node type
    if (node.type === 'step') {
      const data = node.data as StepNodeData;
      duplicatedNode.data = {
        ...data,
        step_id: `${data.step_id}_copy`,
      };
    } else if (node.type === 'tool') {
      const data = node.data as ToolNodeData;
      duplicatedNode.data = {
        ...data,
        name: `${data.name}_copy`,
      };
    } else if (node.type === 'group') {
      const data = node.data as unknown as FlowGroupData;
      duplicatedNode.data = {
        ...data,
        flow_id: `${data.flow_id}_copy`,
        nodeIds: [], // Will be updated if child nodes are also duplicated
      };
    }

    duplicatedNodes.push(duplicatedNode);
  });

  // Create duplicated edges between duplicated nodes
  const duplicatedEdges: Edge[] = [];
  edges.forEach(edge => {
    const sourceInSelection = idMapping[edge.source];
    const targetInSelection = idMapping[edge.target];

    // Only duplicate edges if both source and target are in the selection
    if (sourceInSelection && targetInSelection) {
      const newEdgeId = `${edge.id}_copy_${Date.now()}`;
      duplicatedEdges.push({
        ...edge,
        id: newEdgeId,
        source: sourceInSelection,
        target: targetInSelection,
      });
    }
  });

  return {
    nodes: [...nodes, ...duplicatedNodes],
    edges: [...edges, ...duplicatedEdges],
    message: `Duplicated ${selectedNodeIds.length} node(s)`
  };
}

/**
 * Group multiple selected step nodes into a flow group
 */
export function bulkGroupNodes(options: BulkEditOptions): BulkOperationResult {
  const { selectedNodeIds, nodes, edges } = options;

  // Filter for only step nodes
  const stepNodeIds = selectedNodeIds.filter(id => {
    const node = nodes.find(n => n.id === id);
    return node?.type === 'step' && !node.parentId; // Don't group already grouped nodes
  });

  if (stepNodeIds.length < 2) {
    return {
      nodes,
      edges,
      message: 'At least 2 ungrouped step nodes are required for grouping'
    };
  }

  const selectedStepNodes = nodes.filter(node => stepNodeIds.includes(node.id));

  // Calculate bounding box for the group
  const padding = 60;
  const minX = Math.min(...selectedStepNodes.map(n => n.position.x));
  const minY = Math.min(...selectedStepNodes.map(n => n.position.y));
  const maxX = Math.max(...selectedStepNodes.map(n => n.position.x + 280)); // step node width
  const maxY = Math.max(...selectedStepNodes.map(n => n.position.y + 140)); // step node height

  const groupPosition = { x: minX - padding, y: minY - padding };
  const groupSize = {
    width: (maxX - minX) + (padding * 2),
    height: (maxY - minY) + (padding * 2)
  };

  // Create group node
  const flowId = `flow_group_${Date.now()}`;
  const groupNode: Node = {
    id: flowId,
    type: 'group',
    position: groupPosition,
    style: {
      width: groupSize.width,
      height: groupSize.height,
      backgroundColor: 'rgba(59, 130, 246, 0.05)',
      border: '2px dashed rgba(59, 130, 246, 0.3)',
      borderRadius: 8,
    },
    data: {
      label: `Flow Group (${selectedStepNodes.length} steps)`,
      flow_id: flowId,
      description: '',
      enters: [],
      exits: [],
      nodeIds: stepNodeIds,
      components: {},
      metadata: {},
      color: '#3B82F6',
    } as unknown as Record<string, unknown>,
    zIndex: -1,
    selectable: true,
    draggable: true,
  };

  // Update child nodes to be relative to parent
  const newNodes = nodes.map(node => {
    if (stepNodeIds.includes(node.id)) {
      return {
        ...node,
        parentId: flowId,
        extent: 'parent' as const,
        position: {
          x: node.position.x - groupPosition.x,
          y: node.position.y - groupPosition.y,
        },
        selected: false,
      };
    }
    return node;
  });

  // Add group node
  newNodes.push(groupNode);

  return {
    nodes: newNodes,
    edges,
    message: `Grouped ${stepNodeIds.length} step nodes into flow group`
  };
}

/**
 * Copy selected nodes to clipboard data
 */
export function bulkCopyNodes(options: BulkEditOptions): { clipboardData: any, message: string } {
  const { selectedNodeIds, nodes, edges } = options;

  if (selectedNodeIds.length === 0) {
    return {
      clipboardData: null,
      message: 'No nodes selected for copying'
    };
  }

  const selectedNodes = nodes.filter(node => selectedNodeIds.includes(node.id));
  const selectedEdges = edges.filter(edge =>
    selectedNodeIds.includes(edge.source) && selectedNodeIds.includes(edge.target)
  );

  const clipboardData = {
    type: 'bulk_nodes',
    data: {
      nodes: selectedNodes,
      edges: selectedEdges,
      timestamp: Date.now(),
    }
  };

  return {
    clipboardData,
    message: `Copied ${selectedNodeIds.length} node(s) to clipboard`
  };
}

/**
 * Get selected nodes grouped by type
 */
export function getSelectedNodesByType(selectedNodeIds: string[], nodes: Node[]) {
  const selectedNodes = nodes.filter(node => selectedNodeIds.includes(node.id));

  return {
    stepNodes: selectedNodes.filter(node => node.type === 'step'),
    toolNodes: selectedNodes.filter(node => node.type === 'tool'),
    groupNodes: selectedNodes.filter(node => node.type === 'group'),
    total: selectedNodes.length,
  };
}
