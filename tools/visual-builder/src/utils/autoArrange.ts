import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

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

  // Add route edges to the graph (only between ungrouped step nodes)
  edges.forEach((edge) => {
    if (edge.type === 'route') {
      const sourceNode = ungroupedStepNodes.find(n => n.id === edge.source);
      const targetNode = ungroupedStepNodes.find(n => n.id === edge.target);
      if (sourceNode && targetNode) {
        dagreGraph.setEdge(edge.source, edge.target);
      }
    }
  });

  // Run the layout algorithm
  dagre.layout(dagreGraph);

  // Calculate group boundaries first (before arranging step nodes)
  const groupBoundaries = groupNodes.map(group => ({
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

  // Apply the new positions to ungrouped step nodes, avoiding group overlaps
  const arrangedUngroupedStepNodes = ungroupedStepNodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    // Dagre centers the nodes, so we need to adjust for top-left positioning
    let position = {
      x: nodeWithPosition.x - STEP_NODE_WIDTH / 2,
      y: nodeWithPosition.y - STEP_NODE_HEIGHT / 2,
    };

    // If the position overlaps with a group, move it to avoid the overlap
    if (isPositionInsideGroup(position.x, position.y, STEP_NODE_WIDTH, STEP_NODE_HEIGHT)) {
      // Find the rightmost group boundary and place the node to the right of all groups
      const rightmostGroupX = groupBoundaries.length > 0 
        ? Math.max(...groupBoundaries.map(b => b.maxX))
        : 0;
      
      position = {
        x: rightmostGroupX + 100, // Add some spacing
        y: position.y,
      };
    }

    return {
      ...node,
      position: snapToGrid(position),
    };
  });

  // Position tool nodes intelligently, but keep them separate from groups
  let toolNodeOffsetIndex = 0;
  
  // Find a safe area for tools (to the right of all step nodes and groups)
  const allStepAndGroupNodes = [...arrangedUngroupedStepNodes, ...groupNodes];
  const rightmostX = allStepAndGroupNodes.length > 0 
    ? Math.max(...allStepAndGroupNodes.map(n => n.position.x + (n.type === 'group' ? (n.style?.width as number || 400) : STEP_NODE_WIDTH)))
    : 100;
  
  const arrangedToolNodes = toolNodes.map((toolNode) => {
    // Find all step nodes that connect to this tool
    const connectedStepEdges = edges.filter(
      (edge) => edge.type === 'tool' && edge.target === toolNode.id
    );

    if (connectedStepEdges.length === 0) {
      // If no connections, place in a grid pattern in the safe area
      let col = Math.floor(toolNodeOffsetIndex / 3);
      let row = toolNodeOffsetIndex % 3;
      let position: { x: number; y: number };
      
      // Keep trying positions until we find one not inside a group
      do {
        position = {
          x: rightmostX + 150 + (col * (TOOL_NODE_WIDTH + 100)),
          y: 50 + (row * (TOOL_NODE_HEIGHT + 50))
        };
        
        if (isPositionInsideGroup(position.x, position.y, TOOL_NODE_WIDTH, TOOL_NODE_HEIGHT)) {
          // Move to next position in grid
          toolNodeOffsetIndex++;
          col = Math.floor(toolNodeOffsetIndex / 3);
          row = toolNodeOffsetIndex % 3;
        } else {
          break;
        }
      } while (true);
      
      toolNodeOffsetIndex++;

      return {
        ...toolNode,
        position: snapToGrid(position),
      };
    }

    // Find the primary connected step node (use the first one)
    const primaryStepEdge = connectedStepEdges[0];
    const primaryStepNode = arrangedUngroupedStepNodes.find((n: Node) => n.id === primaryStepEdge.source);

    if (!primaryStepNode) {
      let position: { x: number; y: number };
      
      // Keep trying positions until we find one not inside a group
      do {
        position = { 
          x: rightmostX + 150, 
          y: 50 + (toolNodeOffsetIndex * 100) 
        };
        
        if (isPositionInsideGroup(position.x, position.y, TOOL_NODE_WIDTH, TOOL_NODE_HEIGHT)) {
          toolNodeOffsetIndex++;
        } else {
          break;
        }
      } while (toolNodeOffsetIndex < 50); // Safety limit
      
      toolNodeOffsetIndex++;
      
      return {
        ...toolNode,
        position: snapToGrid(position),
      };
    }

    // Position tool to the right of the step node, but in the safe area and not inside groups
    let position: { x: number; y: number };
    let attempts = 0;
    
    do {
      position = {
        x: Math.max(rightmostX + 150, primaryStepNode.position.x + STEP_NODE_WIDTH + 120),
        y: primaryStepNode.position.y + (attempts * (TOOL_NODE_HEIGHT + 40)),
      };
      attempts++;
    } while (isPositionInsideGroup(position.x, position.y, TOOL_NODE_WIDTH, TOOL_NODE_HEIGHT) && attempts < 10);

    toolNodeOffsetIndex++;

    return {
      ...toolNode,
      position: snapToGrid(position),
    };
  });

  // Keep group nodes but optimize their bounds based on child nodes
  const groupOptimizations = groupNodes.map(groupNode => {
    const childNodes = groupedStepNodes.filter(child => child.parentId === groupNode.id);
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

  // Calculate group boundaries after optimization for collision detection
  const optimizedGroupBoundaries = optimizedGroupNodes.map(group => ({
    minX: group.position.x,
    minY: group.position.y,
    maxX: group.position.x + (group.style?.width as number || 400),
    maxY: group.position.y + (group.style?.height as number || 300),
  }));

  // Update the boundary checking function to use optimized boundaries
  const isPositionInsideOptimizedGroup = (x: number, y: number, width: number, height: number): boolean => {
    return optimizedGroupBoundaries.some(boundary => {
      const nodeRight = x + width;
      const nodeBottom = y + height;
      
      return !(x >= boundary.maxX || nodeRight <= boundary.minX || y >= boundary.maxY || nodeBottom <= boundary.minY);
    });
  };

  // Final pass: ensure no tool nodes overlap with each other and avoid optimized groups
  const finalToolNodes = arrangedToolNodes.map((toolNode, index) => {
    // First check if tool overlaps with optimized groups
    if (isPositionInsideOptimizedGroup(toolNode.position.x, toolNode.position.y, TOOL_NODE_WIDTH, TOOL_NODE_HEIGHT)) {
      // If tool overlaps with optimized group, move it to safe area
      const rightmostOptimizedX = optimizedGroupBoundaries.length > 0 
        ? Math.max(...optimizedGroupBoundaries.map(b => b.maxX))
        : toolNode.position.x;
      
      const newPosition = {
        x: rightmostOptimizedX + 100,
        y: toolNode.position.y,
      };

      return {
        ...toolNode,
        position: snapToGrid(newPosition),
      };
    }

    // Check for overlaps with previously positioned tool nodes
    const overlappingNodes = arrangedToolNodes.slice(0, index).filter((otherNode) => {
      const xOverlap = Math.abs(toolNode.position.x - otherNode.position.x) < TOOL_NODE_WIDTH + 40;
      const yOverlap = Math.abs(toolNode.position.y - otherNode.position.y) < TOOL_NODE_HEIGHT + 40;

      return xOverlap && yOverlap;
    });

    if (overlappingNodes.length > 0) {
      // Move down by a significant amount to avoid overlap
      const position = {
        x: toolNode.position.x,
        y: toolNode.position.y + (overlappingNodes.length * (TOOL_NODE_HEIGHT + 60)),
      };

      return {
        ...toolNode,
        position: snapToGrid(position),
      };
    }

    return toolNode;
  });

  // Apply child position adjustments based on group optimizations
  const adjustedGroupedStepNodes = groupedStepNodes.map(child => {
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

  // Combine all nodes: arranged ungrouped steps, arranged tools, optimized groups and adjusted grouped steps
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
