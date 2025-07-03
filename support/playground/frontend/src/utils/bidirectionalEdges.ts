// Utility functions for handling bidirectional edge routing to avoid overlaps

import { getSmoothStepPath } from '@xyflow/react';

export interface EdgePathInfo {
  edgePath: string;
  labelX: number;
  labelY: number;
}

export interface BidirectionalEdgeInfo {
  forwardEdge: any;
  reverseEdge: any;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
}

/**
 * Helper function to create smooth rounded corners for path segments
 */
function createSmoothPath(points: { x: number; y: number }[], radius: number = 20): string {
  if (points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const current = points[i];
    const prev = points[i - 1];
    const next = points[i + 1];

    if (!next) {
      // Last point - just draw line to it
      path += ` L ${current.x} ${current.y}`;
    } else {
      // Calculate the direction vectors
      const prevDir = {
        x: current.x - prev.x,
        y: current.y - prev.y
      };
      const nextDir = {
        x: next.x - current.x,
        y: next.y - current.y
      };

      // Normalize and calculate curve points
      const prevLength = Math.sqrt(prevDir.x * prevDir.x + prevDir.y * prevDir.y);
      const nextLength = Math.sqrt(nextDir.x * nextDir.x + nextDir.y * nextDir.y);

      const adjustedRadius = Math.min(radius, prevLength / 2, nextLength / 2);

      if (prevLength > 0 && nextLength > 0) {
        const prevUnit = { x: prevDir.x / prevLength, y: prevDir.y / prevLength };
        const nextUnit = { x: nextDir.x / nextLength, y: nextDir.y / nextLength };

        // Calculate curve start and end points
        const curveStart = {
          x: current.x - prevUnit.x * adjustedRadius,
          y: current.y - prevUnit.y * adjustedRadius
        };
        const curveEnd = {
          x: current.x + nextUnit.x * adjustedRadius,
          y: current.y + nextUnit.y * adjustedRadius
        };

        // Draw line to curve start, then smooth curve, then continue
        path += ` L ${curveStart.x} ${curveStart.y}`;
        path += ` Q ${current.x} ${current.y} ${curveEnd.x} ${curveEnd.y}`;
      } else {
        path += ` L ${current.x} ${current.y}`;
      }
    }
  }

  return path;
}

/**
 * Detect bidirectional edges (X->Y and Y->X)
 */
export function detectBidirectionalEdges(edges: any[]): Map<string, BidirectionalEdgeInfo> {
  const bidirectionalMap = new Map<string, BidirectionalEdgeInfo>();
  const processed = new Set<string>();

  for (const edge of edges) {
    if (processed.has(edge.id) || edge.type !== 'route') continue;

    // Look for reverse edge
    const reverseEdge = edges.find(e =>
      e.type === 'route' &&
      e.source === edge.target &&
      e.target === edge.source &&
      e.id !== edge.id
    );

    if (reverseEdge) {
      // Found bidirectional pair
      const pairKey = [edge.source, edge.target].sort().join('-');

      if (!bidirectionalMap.has(pairKey)) {
        bidirectionalMap.set(pairKey, {
          forwardEdge: edge,
          reverseEdge: reverseEdge,
          sourceX: 0, // Will be set when rendering
          sourceY: 0,
          targetX: 0,
          targetY: 0,
          sourcePosition: null,
          targetPosition: null,
        });
      }

      processed.add(edge.id);
      processed.add(reverseEdge.id);
    }
  }

  return bidirectionalMap;
}

/**
 * Calculate paths for bidirectional edges to avoid overlap with C-shaped routing
 */
export function calculateBidirectionalEdgePaths(
  bidirectionalInfo: BidirectionalEdgeInfo,
  isFirstEdge: boolean = true
): EdgePathInfo {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = bidirectionalInfo;

  if (isFirstEdge) {
    // First edge uses the normal smooth step path
    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 20,
    });

    return { edgePath, labelX, labelY };
  } else {
    // Second edge takes a C-shaped path with 4 bends for cleaner separation
    // Only use C-shaped path when going backwards (source below target)
    const isGoingUp = targetY < sourceY;
    const isGoingDown = targetY > sourceY;
    const isHorizontal = Math.abs(targetY - sourceY) < 50; // Nearly horizontal

    // Calculate distances and offsets for C-shaped path
    const horizontalDistance = Math.abs(targetX - sourceX);
    const verticalDistance = Math.abs(targetY - sourceY);

    // Fixed value for how far the bend should be from the node
    const k = 200;

    let pathData: string;
    let labelX: number;
    let labelY: number;

    if (isHorizontal) {
      // For horizontal flow, create vertical C-shapes
      const verticalOffset = Math.max(80, verticalDistance * 1.2);
      const direction = isGoingUp ? -1 : 1; // Go opposite direction first
      const midY = sourceY + (direction * verticalOffset);

      pathData = `M ${sourceX} ${sourceY} ` +
                 `L ${sourceX} ${midY} ` +                      // 1. Go up/down
                 `L ${targetX} ${midY} ` +                      // 2. Go horizontally
                 `L ${targetX} ${targetY}`;                     // 3. Go to target

      labelX = (sourceX + targetX) / 2;
      labelY = midY;
    } else {
      // Create C-shaped paths with smooth rounded corners for vertical flows
      const radius = 20; // Radius for smooth corners (matching regular edges)

      if (isGoingUp) {
        // Going up: Create a C-path going left-down-up-right with smooth corners
        const bendOffset = 60; // Initial bend distance from nodes

        // Calculate x position of 2nd and 3rd bend using the specified logic
        let bendX: number;
        if (horizontalDistance >= 2 * k) {
          bendX = (sourceX + targetX) / 2;
        } else if (targetX >= sourceX) {
          bendX = sourceX - k;
        } else {
          bendX = targetX - k;
        }

        const downY = sourceY + bendOffset; // Go down first (opposite of final direction)
        const upY = targetY - bendOffset;   // Approach target from below

        // Define the path points for smooth curves
        const pathPoints = [
          { x: sourceX, y: sourceY },
          { x: sourceX, y: downY },
          { x: bendX, y: downY },
          { x: bendX, y: upY },
          { x: targetX, y: upY },
          { x: targetX, y: targetY }
        ];

        pathData = createSmoothPath(pathPoints, radius);
        labelX = bendX;
        labelY = (downY + upY) / 2 - 20; // Move label above center
      } else if (isGoingDown) {
        // Going down: Create a C-path going left-up-down-right with smooth corners
        const bendOffset = 60; // Initial bend distance from nodes

        // Calculate x position of 2nd and 3rd bend using the specified logic
        let bendX: number;
        if (horizontalDistance >= 2 * k) {
          bendX = (sourceX + targetX) / 2;
        } else if (targetX >= sourceX) {
          bendX = sourceX - k;
        } else {
          bendX = targetX - k;
        }

        const upY = sourceY - bendOffset;   // Go up first (opposite of final direction)
        const downY = targetY + bendOffset; // Approach target from above

        // Define the path points for smooth curves
        const pathPoints = [
          { x: sourceX, y: sourceY },
          { x: sourceX, y: upY },
          { x: bendX, y: upY },
          { x: bendX, y: downY },
          { x: targetX, y: downY },
          { x: targetX, y: targetY }
        ];

        pathData = createSmoothPath(pathPoints, radius);
        labelX = bendX;
        labelY = (upY + downY) / 2 - 20; // Move label above center
      } else {
        // Fallback: nearly horizontal, use side routing with smooth corners
        // Calculate x position of 2nd and 3rd bend using the specified logic
        let bendX: number;
        if (horizontalDistance >= 2 * k) {
          bendX = (sourceX + targetX) / 2;
        } else if (targetX >= sourceX) {
          bendX = sourceX - k;
        } else {
          bendX = targetX - k;
        }

        // Define the path points for smooth curves
        const pathPoints = [
          { x: sourceX, y: sourceY },
          { x: bendX, y: sourceY },
          { x: bendX, y: targetY },
          { x: targetX, y: targetY }
        ];

        pathData = createSmoothPath(pathPoints, radius);
        labelX = bendX;
        labelY = (sourceY + targetY) / 2 - 15; // Move label above center
      }
    }

    return { edgePath: pathData, labelX, labelY };
  }
}

/**
 * Check if an edge is part of a bidirectional pair
 */
export function isBidirectionalEdge(edgeId: string, edges: any[]): boolean {
  const edge = edges.find(e => e.id === edgeId);
  if (!edge || edge.type !== 'route') return false;

  const reverseEdge = edges.find(e =>
    e.type === 'route' &&
    e.source === edge.target &&
    e.target === edge.source &&
    e.id !== edge.id
  );

  return !!reverseEdge;
}

/**
 * Get the partner edge ID for a bidirectional edge
 */
export function getBidirectionalPartner(edgeId: string, edges: any[]): string | null {
  const edge = edges.find(e => e.id === edgeId);
  if (!edge || edge.type !== 'route') return null;

  const reverseEdge = edges.find(e =>
    e.type === 'route' &&
    e.source === edge.target &&
    e.target === edge.source &&
    e.id !== edge.id
  );

  return reverseEdge?.id || null;
}

/**
 * Determine if this edge should use offset path (C-shaped path) based on node positions
 * C-shaped path should be used when source node is below destination node (going backwards)
 */
export function shouldUseOffsetPath(
  edgeId: string,
  edges: any[],
  sourceY: number,
  targetY: number
): boolean {
  const edge = edges.find(e => e.id === edgeId);
  if (!edge || edge.type !== 'route') return false;

  const partnerEdgeId = getBidirectionalPartner(edgeId, edges);
  if (!partnerEdgeId) return false;

  // Use C-shaped path only when source node is below destination node (sourceY > targetY)
  // This means we're going "backwards" in the typical top-to-bottom flow
  return sourceY > targetY;
}
