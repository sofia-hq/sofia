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
  // Separate step nodes and tool nodes
  const stepNodes = nodes.filter(node => node.type === 'step');
  const toolNodes = nodes.filter(node => node.type === 'tool');

  // Create the main graph for step nodes
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

  // Add step nodes to the graph
  stepNodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: STEP_NODE_WIDTH,
      height: STEP_NODE_HEIGHT
    });
  });

  // Add route edges to the graph (step-to-step connections)
  edges.forEach((edge) => {
    if (edge.type === 'route') {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  // Run the layout algorithm
  dagre.layout(dagreGraph);

  // Apply the new positions to step nodes
  const arrangedStepNodes = stepNodes.map((node) => {
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

  // Position tool nodes intelligently with better spacing
  let toolNodeOffsetIndex = 0;
  const arrangedToolNodes = toolNodes.map((toolNode) => {
    // Find all step nodes that connect to this tool
    const connectedStepEdges = edges.filter(
      (edge) => edge.type === 'tool' && edge.target === toolNode.id
    );

    if (connectedStepEdges.length === 0) {
      // If no connections, place in a grid pattern to the right
      const col = Math.floor(toolNodeOffsetIndex / 3);
      const row = toolNodeOffsetIndex % 3;
      toolNodeOffsetIndex++;

      const position = {
        x: 50 + (col * (TOOL_NODE_WIDTH + 100)),
        y: 50 + (row * (TOOL_NODE_HEIGHT + 50))
      };

      return {
        ...toolNode,
        position: snapToGrid(position),
      };
    }

    // Find the primary connected step node (use the first one)
    const primaryStepEdge = connectedStepEdges[0];
    const primaryStepNode = arrangedStepNodes.find(n => n.id === primaryStepEdge.source);

    if (!primaryStepNode) {
      toolNodeOffsetIndex++;
      const position = { x: 50, y: 50 + (toolNodeOffsetIndex * 100) };
      return {
        ...toolNode,
        position: snapToGrid(position),
      };
    }

    // Position tool to the right of the step node with good spacing
    const position = {
      x: primaryStepNode.position.x + STEP_NODE_WIDTH + 120, // More space to the right
      y: primaryStepNode.position.y + (toolNodeOffsetIndex * (TOOL_NODE_HEIGHT + 40)), // Stagger vertically
    };

    return {
      ...toolNode,
      position: snapToGrid(position),
    };
  });

  // Final pass: ensure no tool nodes overlap with each other
  const finalToolNodes = arrangedToolNodes.map((toolNode, index) => {
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

  // Combine all arranged nodes
  return [...arrangedStepNodes, ...finalToolNodes];
}
