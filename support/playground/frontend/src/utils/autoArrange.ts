import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

// Extended Node type that includes style property
type NodeWithStyle = Node & {
  style?: {
    width?: number;
    height?: number;
    [key: string]: any;
  };
};

// Fixed node dimensions
const STEP_NODE_WIDTH = 280;
const STEP_NODE_HEIGHT = 140;
const TOOL_NODE_WIDTH = 200;
const TOOL_NODE_HEIGHT = 100;

// Grid settings
const GRID_SIZE = 20;

// Utility function to snap position to grid
function snapToGrid(position: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Math.round(position.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(position.y / GRID_SIZE) * GRID_SIZE,
  };
}

// Arrange step nodes inside a group using a simple dagre layout
function arrangeStepsInGroup(
  groupNode: Node,
  childSteps: Node[],
  edges: Edge[]
): Node[] {
  if (childSteps.length === 0) {
    return [];
  }

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    nodesep: 120,
    ranksep: 150,
    marginx: 40,
    marginy: 40,
  });

  childSteps.forEach(step => {
    g.setNode(step.id, { width: STEP_NODE_WIDTH, height: STEP_NODE_HEIGHT });
  });

  edges.forEach(edge => {
    if (
      edge.type === 'route' &&
      childSteps.some(n => n.id === edge.source) &&
      childSteps.some(n => n.id === edge.target)
    ) {
      g.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(g);

  return childSteps.map(step => {
    const pos = g.node(step.id);
    const relativePos = {
      x: pos.x - STEP_NODE_WIDTH / 2,
      y: pos.y - STEP_NODE_HEIGHT / 2,
    };
    return {
      ...step,
      position: snapToGrid(relativePos),
    };
  });
}

export function autoArrangeNodes(nodes: Node[], edges: Edge[]): Node[] {
  // Separate different node types
  const ungroupedStepNodes = nodes.filter(node => node.type === 'step' && !node.parentId);
  const toolNodes = nodes.filter(node => node.type === 'tool');
  const groupNodes = nodes.filter(node => node.type === 'group');
  const groupedStepNodes = nodes.filter(node => node.type === 'step' && node.parentId);

  // Create the main graph for ungrouped step nodes only
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure the layout with generous spacing for clear visibility
  dagreGraph.setGraph({
    rankdir: 'TB',  // Top to bottom
    align: 'UL',    // Upper left alignment
    nodesep: 200,   // Much larger horizontal spacing between nodes
    ranksep: 250,   // Much larger vertical spacing between ranks
    marginx: 100,   // Larger margins
    marginy: 100,
  });

  // Add ungrouped step nodes to the graph
  ungroupedStepNodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: STEP_NODE_WIDTH,
      height: STEP_NODE_HEIGHT
    });
  });

  // Add group nodes as "super nodes" to the layout graph
  // This allows dagre to consider groups in the overall flow layout
  groupNodes.forEach((groupNode) => {
    const groupWidth = groupNode.style?.width as number || 400;
    const groupHeight = groupNode.style?.height as number || 300;

    dagreGraph.setNode(groupNode.id, {
      width: groupWidth,
      height: groupHeight
    });
  });

  // Add route edges to the graph including mixed scenarios
  edges.forEach((edge) => {
    if (edge.type === 'route') {
      // Find if source/target are grouped nodes
      const sourceGroupedNode = groupedStepNodes.find(n => n.id === edge.source);
      const targetGroupedNode = groupedStepNodes.find(n => n.id === edge.target);

      let sourceId = edge.source;
      let targetId = edge.target;

      // If source is grouped, use the parent group as the source
      if (sourceGroupedNode && sourceGroupedNode.parentId) {
        sourceId = sourceGroupedNode.parentId;
      }

      // If target is grouped, use the parent group as the target
      if (targetGroupedNode && targetGroupedNode.parentId) {
        targetId = targetGroupedNode.parentId;
      }

      // Add edge to layout graph if both endpoints exist in our graph
      const sourceExists = dagreGraph.hasNode(sourceId);
      const targetExists = dagreGraph.hasNode(targetId);

      if (sourceExists && targetExists && sourceId !== targetId) {
        dagreGraph.setEdge(sourceId, targetId);
      }
    }
  });

  // Run the layout algorithm
  dagre.layout(dagreGraph);

  // Apply the new positions to ungrouped step nodes from dagre layout
  const arrangedUngroupedStepNodes = ungroupedStepNodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    // Dagre centers the nodes, so we need to adjust for top-left positioning
    const position = {
      x: nodeWithPosition.x - STEP_NODE_WIDTH / 2,
      y: nodeWithPosition.y - STEP_NODE_HEIGHT / 2,
    };

    return {
      ...node,
      position: snapToGrid(position),
    };
  });

  // Apply the new positions to group nodes from dagre layout
  const arrangedGroupNodes = groupNodes.map((groupNode) => {
    if (dagreGraph.hasNode(groupNode.id)) {
      const nodeWithPosition = dagreGraph.node(groupNode.id);
      const groupWidth = groupNode.style?.width as number || 400;
      const groupHeight = groupNode.style?.height as number || 300;

      // Dagre centers the nodes, so we need to adjust for top-left positioning
      const position = {
        x: nodeWithPosition.x - groupWidth / 2,
        y: nodeWithPosition.y - groupHeight / 2,
      };

      return {
        ...groupNode,
        position: snapToGrid(position),
      };
    }
    return groupNode;
  });

  // Arrange step nodes inside each group using their internal connections
  const arrangedGroupedStepNodes = groupNodes.flatMap(group => {
    const children = groupedStepNodes.filter(n => n.parentId === group.id);
    return arrangeStepsInGroup(group, children, edges);
  });

  // Now optimize group bounds based on child nodes using the NEW positions from dagre
  const groupOptimizations = arrangedGroupNodes.map(groupNode => {
    const childNodes = arrangedGroupedStepNodes.filter(child => child.parentId === groupNode.id);
    if (childNodes.length > 0) {
      const bounds = calculateOptimalGroupBounds(groupNode, childNodes);
      return {
        optimizedGroup: {
          ...groupNode,
          position: bounds.position,
          style: {
            ...groupNode.style,
            width: bounds.size.width,
            height: bounds.size.height,
          },
        },
        childAdjustments: bounds.childAdjustments
      };
    }
    return {
      optimizedGroup: groupNode,
      childAdjustments: []
    };
  });

  const optimizedGroupNodes = groupOptimizations.map(opt => opt.optimizedGroup);

  // ----- Handle multiple disconnected flows by separating components -----
  const rootNodeIds = new Set<string>();
  ungroupedStepNodes.forEach(n => rootNodeIds.add(n.id));
  groupNodes.forEach(n => rootNodeIds.add(n.id));

  const getRootId = (nodeId: string): string => {
    const grouped = groupedStepNodes.find(g => g.id === nodeId);
    return grouped && grouped.parentId ? grouped.parentId : nodeId;
  };

  const adjacency: Record<string, Set<string>> = {};
  edges.forEach(edge => {
    if (edge.type === 'route') {
      const source = getRootId(edge.source);
      const target = getRootId(edge.target);
      if (rootNodeIds.has(source) && rootNodeIds.has(target)) {
        adjacency[source] = adjacency[source] || new Set();
        adjacency[target] = adjacency[target] || new Set();
        adjacency[source].add(target);
        adjacency[target].add(source);
      }
    }
  });

  const visited = new Set<string>();
  const components: string[][] = [];
  rootNodeIds.forEach(id => {
    if (!visited.has(id)) {
      const queue = [id];
      visited.add(id);
      const comp: string[] = [];
      while (queue.length) {
        const curr = queue.shift()!;
        comp.push(curr);
        const neighbors = adjacency[curr];
        if (neighbors) {
          neighbors.forEach(n => {
            if (!visited.has(n)) {
              visited.add(n);
              queue.push(n);
            }
          });
        }
      }
      components.push(comp);
    }
  });

  const COMPONENT_SPACING = 200;
  let currentOffsetX = 0;

  components.forEach((comp) => {
    let minX = Infinity;
    let maxX = -Infinity;
    comp.forEach(id => {
      let node = arrangedUngroupedStepNodes.find(n => n.id === id);
      let width = STEP_NODE_WIDTH;
      let height = STEP_NODE_HEIGHT;
      if (!node) {
        node = optimizedGroupNodes.find(n => n.id === id);
        if (node) {
          width = ((node as NodeWithStyle).style?.width as number) || 400;
          height = ((node as NodeWithStyle).style?.height as number) || 300;
        }
      }
      if (node) {
        minX = Math.min(minX, node.position.x);
        maxX = Math.max(maxX, node.position.x + width);
      }
    });

    const offsetX = currentOffsetX - minX;

    comp.forEach(id => {
      const stepIdx = arrangedUngroupedStepNodes.findIndex(n => n.id === id);
      if (stepIdx !== -1) {
        const node = arrangedUngroupedStepNodes[stepIdx];
        arrangedUngroupedStepNodes[stepIdx] = {
          ...node,
          position: snapToGrid({
            x: node.position.x + offsetX,
            y: node.position.y,
          }),
        };
      } else {
        const groupIdx = optimizedGroupNodes.findIndex(n => n.id === id);
        if (groupIdx !== -1) {
          const node = optimizedGroupNodes[groupIdx];
          optimizedGroupNodes[groupIdx] = {
            ...node,
            position: snapToGrid({
              x: node.position.x + offsetX,
              y: node.position.y,
            }),
          };
        }
      }
    });

    currentOffsetX += maxX - minX + COMPONENT_SPACING;
  });

  // Recalculate group boundaries after component offsets

  // Calculate optimized group boundaries for collision detection using the new positions
  const groupBoundaries = optimizedGroupNodes.map(group => ({
    minX: group.position.x,
    minY: group.position.y,
    maxX: group.position.x + (group.style?.width as number || 400),
    maxY: group.position.y + (group.style?.height as number || 300),
  }));

  // Utility function to check if a position overlaps with any group
  const isPositionInsideGroup = (x: number, y: number, width: number, height: number): boolean => {
    return groupBoundaries.some(boundary => {
      const nodeRight = x + width;
      const nodeBottom = y + height;

      return !(x >= boundary.maxX || nodeRight <= boundary.minX || y >= boundary.maxY || nodeBottom <= boundary.minY);
    });
  };

  // Apply child position adjustments based on group optimizations BEFORE tool positioning
  const adjustedGroupedStepNodes = arrangedGroupedStepNodes.map(child => {
    const parentOptimization = groupOptimizations.find(opt =>
      opt.childAdjustments.some(adj => adj.id === child.id)
    );

    if (parentOptimization) {
      const adjustment = parentOptimization.childAdjustments.find(adj => adj.id === child.id);
      if (adjustment) {
        return {
          ...child,
          position: adjustment.newRelativePosition,
        };
      }
    }

    return child;
  });

  const toolsByStep: Record<string, Node[]> = {};
  edges.forEach(edge => {
    if (edge.type === 'tool') {
      const tool = toolNodes.find(t => t.id === edge.target);
      if (tool) {
        if (!toolsByStep[edge.source]) toolsByStep[edge.source] = [];
        toolsByStep[edge.source].push(tool);
      }
    }
  });
  const positionedToolNodes: Node[] = [];
  const usedToolIds = new Set<string>();

  // Calculate bounds for tool positioning
  const allStepNodesWithPositions = [...arrangedUngroupedStepNodes, ...adjustedGroupedStepNodes];

  const stepBounds = {
    minX: Math.min(...allStepNodesWithPositions.map(n => n.position.x)),
    maxX: Math.max(...allStepNodesWithPositions.map(n => n.position.x + STEP_NODE_WIDTH)),
    minY: Math.min(...allStepNodesWithPositions.map(n => n.position.y)),
    maxY: Math.max(...allStepNodesWithPositions.map(n => n.position.y + STEP_NODE_HEIGHT)),
  };

  const fallbackToolAreaX = stepBounds.maxX + 100;
  const fallbackToolAreaY = stepBounds.minY;

  // Utility function to check if a position overlaps with any step node
  const overlapsStep = (x: number, y: number, width: number, height: number): boolean => {
    return allStepNodesWithPositions.some(step => {
      let stepX = step.position.x;
      let stepY = step.position.y;

      // If step is in a group, calculate absolute position
      if (step.parentId) {
        const parent = optimizedGroupNodes.find(g => g.id === step.parentId);
        if (parent) {
          stepX += parent.position.x;
          stepY += parent.position.y;
        }
      }

      const stepRight = stepX + STEP_NODE_WIDTH;
      const stepBottom = stepY + STEP_NODE_HEIGHT;
      const nodeRight = x + width;
      const nodeBottom = y + height;

      return !(x >= stepRight || nodeRight <= stepX || y >= stepBottom || nodeBottom <= stepY);
    });
  };

  const tryPlace = (desired: { x: number; y: number }): { x: number; y: number } => {
    let pos = { ...desired };
    while (
      isPositionInsideGroup(pos.x, pos.y, TOOL_NODE_WIDTH, TOOL_NODE_HEIGHT) ||
      overlapsStep(pos.x, pos.y, TOOL_NODE_WIDTH, TOOL_NODE_HEIGHT) ||
      positionedToolNodes.some(n =>
        Math.abs(n.position.x - pos.x) < TOOL_NODE_WIDTH + 20 &&
        Math.abs(n.position.y - pos.y) < TOOL_NODE_HEIGHT + 20
      )
    ) {
      pos.x += TOOL_NODE_WIDTH + 40;
    }
    return pos;
  };

  // Position tools next to their connected steps
  allStepNodesWithPositions.forEach(step => {
    const tools = toolsByStep[step.id];
    if (!tools || tools.length === 0) return;

    let absX = step.position.x;
    let absY = step.position.y;

    // If step is in a group, calculate absolute position
    if (step.parentId) {
      const parent = optimizedGroupNodes.find(g => g.id === step.parentId);
      if (parent) {
        absX += parent.position.x;
        absY += parent.position.y;
      }
    }

    const spacing = TOOL_NODE_HEIGHT + 30;
    const startY = absY - ((tools.length - 1) * spacing) / 2;

    tools.forEach((tool, idx) => {
      const desired = {
        x: absX + STEP_NODE_WIDTH + 60,
        y: startY + idx * spacing,
      };
      const pos = tryPlace(desired);
      positionedToolNodes.push({ ...tool, position: snapToGrid(pos) });
      usedToolIds.add(tool.id);
    });
  });

  // Position any unconnected tools
  let unconnectedOffset = 0;
  toolNodes.forEach(tool => {
    if (usedToolIds.has(tool.id)) return;

    const desired = {
      x: fallbackToolAreaX,
      y: fallbackToolAreaY + unconnectedOffset * (TOOL_NODE_HEIGHT + 40),
    };
    const pos = tryPlace(desired);
    positionedToolNodes.push({ ...tool, position: snapToGrid(pos) });
    unconnectedOffset++;
  });

  // Final pass: resolve any remaining tool node overlaps
  const finalToolNodes = positionedToolNodes.map((toolNode, index) => {
    // Check for overlaps with previously positioned tool nodes
    const overlappingNodes = positionedToolNodes.slice(0, index).filter((otherNode: Node) => {
      const xOverlap = Math.abs(toolNode.position.x - otherNode.position.x) < TOOL_NODE_WIDTH + 20;
      const yOverlap = Math.abs(toolNode.position.y - otherNode.position.y) < TOOL_NODE_HEIGHT + 20;
      return xOverlap && yOverlap;
    });

    if (overlappingNodes.length > 0) {
      // Instead of just moving down, try to find a nearby open spot
      let adjustedPosition = { ...toolNode.position };

      // Try small adjustments first (right, down, diagonal)
      const adjustmentAttempts = [
        { x: adjustedPosition.x + TOOL_NODE_WIDTH + 30, y: adjustedPosition.y },
        { x: adjustedPosition.x, y: adjustedPosition.y + TOOL_NODE_HEIGHT + 30 },
        { x: adjustedPosition.x + TOOL_NODE_WIDTH + 30, y: adjustedPosition.y + TOOL_NODE_HEIGHT + 30 },
        { x: adjustedPosition.x, y: adjustedPosition.y + (overlappingNodes.length * (TOOL_NODE_HEIGHT + 40)) },
      ];

      // Find first position that doesn't overlap with groups, steps and other tools
      for (const attempt of adjustmentAttempts) {
        const wouldOverlapGroup = isPositionInsideGroup(attempt.x, attempt.y, TOOL_NODE_WIDTH, TOOL_NODE_HEIGHT);
        const wouldOverlapTool = positionedToolNodes.slice(0, index).some((otherNode: Node) => {
          const xOverlap = Math.abs(attempt.x - otherNode.position.x) < TOOL_NODE_WIDTH + 20;
          const yOverlap = Math.abs(attempt.y - otherNode.position.y) < TOOL_NODE_HEIGHT + 20;
          return xOverlap && yOverlap;
        });
        const wouldOverlapStep = overlapsStep(attempt.x, attempt.y, TOOL_NODE_WIDTH, TOOL_NODE_HEIGHT);

        if (!wouldOverlapGroup && !wouldOverlapTool && !wouldOverlapStep) {
          adjustedPosition = attempt;
          break;
        }
      }

      return {
        ...toolNode,
        position: snapToGrid(adjustedPosition),
      };
    }

    return toolNode;
  });

  // Combine all nodes: arranged ungrouped steps, final tools, optimized groups and adjusted grouped steps
  return [...arrangedUngroupedStepNodes, ...finalToolNodes, ...optimizedGroupNodes, ...adjustedGroupedStepNodes];
}

// Utility function to calculate optimal group bounds based on child nodes
export function calculateOptimalGroupBounds(groupNode: Node, childNodes: Node[]) {
  if (childNodes.length === 0) {
    return {
      position: groupNode.position,
      size: { width: 400, height: 300 }, // Default minimum size
      childAdjustments: []
    };
  }

  // Calculate absolute positions of child nodes
  const childAbsolutePositions = childNodes.map(child => ({
    id: child.id,
    x: groupNode.position.x + child.position.x,
    y: groupNode.position.y + child.position.y,
    width: child.type === 'step' ? STEP_NODE_WIDTH : TOOL_NODE_WIDTH,
    height: child.type === 'step' ? STEP_NODE_HEIGHT : TOOL_NODE_HEIGHT,
    originalRelativePosition: child.position,
  }));

  const padding = 60; // Consistent padding around child nodes
  const minX = Math.min(...childAbsolutePositions.map(pos => pos.x));
  const minY = Math.min(...childAbsolutePositions.map(pos => pos.y));
  const maxX = Math.max(...childAbsolutePositions.map(pos => pos.x + pos.width));
  const maxY = Math.max(...childAbsolutePositions.map(pos => pos.y + pos.height));

  // Calculate optimal bounds with padding
  const optimalPosition = {
    x: minX - padding,
    y: minY - padding
  };

  const optimalSize = {
    width: Math.max(400, (maxX - minX) + (padding * 2)), // Minimum width of 400
    height: Math.max(300, (maxY - minY) + (padding * 2)) // Minimum height of 300
  };

  // Calculate position delta for child node adjustments
  const deltaX = optimalPosition.x - groupNode.position.x;
  const deltaY = optimalPosition.y - groupNode.position.y;

  // Calculate child position adjustments if group position changes
  const childAdjustments = childAbsolutePositions.map(child => ({
    id: child.id,
    newRelativePosition: {
      x: child.originalRelativePosition.x - deltaX,
      y: child.originalRelativePosition.y - deltaY,
    }
  }));

  return {
    position: optimalPosition,
    size: optimalSize,
    childAdjustments
  };
}
