// Utility functions for detaching nodes from their connections

export interface DetachOptions {
  nodeId: string;
  nodes: any[];
  edges: any[];
  detachType: 'all' | 'tools' | 'steps';
}

export interface DetachResult {
  nodes: any[];
  edges: any[];
  detachedConnections: string[];
}

/**
 * Detach a node from its connections
 */
export function detachNode(options: DetachOptions): DetachResult {
  const { nodeId, nodes, edges, detachType } = options;

  const detachedConnections: string[] = [];

  // Filter edges based on detach type
  const filteredEdges = edges.filter(edge => {
    const isConnectedToNode = edge.source === nodeId || edge.target === nodeId;

    if (!isConnectedToNode) {
      return true; // Keep edges not connected to this node
    }

    let shouldRemove = false;

    switch (detachType) {
      case 'all':
        shouldRemove = true;
        break;
      case 'tools':
        shouldRemove = edge.type === 'tool';
        break;
      case 'steps':
        shouldRemove = edge.type === 'route';
        break;
    }

    if (shouldRemove) {
      detachedConnections.push(edge.id);
      return false;
    }

    return true;
  });

  return {
    nodes,
    edges: filteredEdges,
    detachedConnections,
  };
}

/**
 * Detach multiple nodes from their connections
 */
export function detachMultipleNodes(nodeIds: string[], nodes: any[], edges: any[], detachType: 'all' | 'tools' | 'steps' = 'all'): DetachResult {
  let currentEdges = [...edges];
  const allDetachedConnections: string[] = [];

  for (const nodeId of nodeIds) {
    const result = detachNode({
      nodeId,
      nodes,
      edges: currentEdges,
      detachType,
    });

    currentEdges = result.edges;
    allDetachedConnections.push(...result.detachedConnections);
  }

  return {
    nodes,
    edges: currentEdges,
    detachedConnections: allDetachedConnections,
  };
}

/**
 * Smart detach - removes only redundant or conflicting connections
 */
export function smartDetach(nodeId: string, nodes: any[], edges: any[]): DetachResult {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) {
    return { nodes, edges, detachedConnections: [] };
  }

  const detachedConnections: string[] = [];

  // For now, implement basic smart detach logic
  // This can be extended based on specific business rules
  const filteredEdges = edges.filter(edge => {
    const isConnectedToNode = edge.source === nodeId || edge.target === nodeId;

    if (!isConnectedToNode) {
      return true;
    }

    // Example smart logic: Remove duplicate tool connections
    if (edge.type === 'tool') {
      const duplicates = edges.filter(e =>
        e.type === 'tool' &&
        e.source === edge.source &&
        e.target === edge.target &&
        e.id !== edge.id
      );

      if (duplicates.length > 0) {
        detachedConnections.push(edge.id);
        return false;
      }
    }

    return true;
  });

  return {
    nodes,
    edges: filteredEdges,
    detachedConnections,
  };
}
