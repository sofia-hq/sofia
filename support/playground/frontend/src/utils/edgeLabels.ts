// Utility functions for managing edge label positioning to avoid overlaps

interface EdgeLabelPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EdgeInfo {
  id: string;
  labelX: number;
  labelY: number;
  condition: string;
}

// Check if two rectangles overlap
function rectanglesOverlap(rect1: EdgeLabelPosition, rect2: EdgeLabelPosition): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

// Estimate label dimensions based on text content
function estimateLabelDimensions(text: string): { width: number; height: number } {
  const baseWidth = 80; // Minimum width
  const charWidth = 7; // Approximate character width
  const padding = 16; // Total horizontal padding

  const width = Math.max(baseWidth, text.length * charWidth + padding);
  const height = 28; // Standard label height

  return { width, height };
}

// Calculate optimal offsets for edge labels to avoid overlaps
export function calculateEdgeLabelOffsets(edges: EdgeInfo[]): Map<string, { x: number; y: number }> {
  const offsets = new Map<string, { x: number; y: number }>();
  const labelPositions: (EdgeLabelPosition & { edgeId: string })[] = [];

  // Process edges in order of their position (top to bottom, left to right)
  const sortedEdges = [...edges].sort((a, b) => {
    if (Math.abs(a.labelY - b.labelY) < 20) {
      return a.labelX - b.labelX; // Same row, sort by x
    }
    return a.labelY - b.labelY; // Sort by y
  });

  for (const edge of sortedEdges) {
    const dimensions = estimateLabelDimensions(edge.condition || 'Add condition...');
    let bestOffset = { x: 0, y: -10 }; // Default offset (slightly up)

    let currentPosition: EdgeLabelPosition = {
      x: edge.labelX + bestOffset.x - dimensions.width / 2,
      y: edge.labelY + bestOffset.y - dimensions.height / 2,
      width: dimensions.width,
      height: dimensions.height,
    };

    // Check for overlaps and adjust position
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      let hasOverlap = false;

      for (const existingLabel of labelPositions) {
        if (rectanglesOverlap(currentPosition, existingLabel)) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) {
        break; // Found a good position
      }

      // Try different offset strategies
      const offsetStrategies = [
        { x: 0, y: -30 },   // Higher up
        { x: 0, y: 20 },    // Lower down
        { x: -30, y: -10 }, // Left offset
        { x: 30, y: -10 },  // Right offset
        { x: -20, y: -25 }, // Upper left
        { x: 20, y: -25 },  // Upper right
        { x: -20, y: 15 },  // Lower left
        { x: 20, y: 15 },   // Lower right
        { x: 0, y: -50 },   // Much higher
        { x: 0, y: 40 },    // Much lower
      ];

      if (attempts < offsetStrategies.length) {
        bestOffset = offsetStrategies[attempts];
      } else {
        // Random positioning as last resort
        bestOffset = {
          x: (Math.random() - 0.5) * 60,
          y: (Math.random() - 0.5) * 60 - 10,
        };
      }

      currentPosition = {
        x: edge.labelX + bestOffset.x - dimensions.width / 2,
        y: edge.labelY + bestOffset.y - dimensions.height / 2,
        width: dimensions.width,
        height: dimensions.height,
      };

      attempts++;
    }

    // Store the final position
    offsets.set(edge.id, bestOffset);
    labelPositions.push({
      ...currentPosition,
      edgeId: edge.id,
    });
  }

  return offsets;
}

// Hook for managing edge label positions
export function useEdgeLabelPositioning(edges: any[]) {
  const edgeInfos: EdgeInfo[] = edges
    .filter(edge => edge.type === 'route' && edge.data?.condition)
    .map(edge => ({
      id: edge.id,
      labelX: 0, // These will be calculated by ReactFlow
      labelY: 0,
      condition: edge.data.condition || '',
    }));

  return { edgeInfos };
}
