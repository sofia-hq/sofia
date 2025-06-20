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
 * Calculate paths for bidirectional edges to avoid overlap
 */
export function calculateBidirectionalEdgePaths(
  bidirectionalInfo: BidirectionalEdgeInfo,
  isFirstEdge: boolean = true
): EdgePathInfo {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = bidirectionalInfo;

  // Calculate offset to separate the two edges
  const offset = isFirstEdge ? -10 : 10;

  // Determine the direction of the main flow
  const isHorizontalFlow = Math.abs(targetX - sourceX) > Math.abs(targetY - sourceY);

  let adjustedSourceX = sourceX;
  let adjustedSourceY = sourceY;
  let adjustedTargetX = targetX;
  let adjustedTargetY = targetY;

  if (isHorizontalFlow) {
    // For horizontal flow, offset vertically to separate the edges
    adjustedSourceY += offset;
    adjustedTargetY += offset;
  } else {
    // For vertical flow, offset horizontally to separate the edges
    adjustedSourceX += offset;
    adjustedTargetX += offset;
  }

  // Use smooth step path for both edges with the offset
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: adjustedSourceX,
    sourceY: adjustedSourceY,
    sourcePosition,
    targetX: adjustedTargetX,
    targetY: adjustedTargetY,
    targetPosition,
    borderRadius: 20,
  });

  return { edgePath, labelX, labelY };
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
 * Determine if this edge should use offset path (second edge in bidirectional pair)
 */
export function shouldUseOffsetPath(edgeId: string, edges: any[]): boolean {
  const edge = edges.find(e => e.id === edgeId);
  if (!edge || edge.type !== 'route') return false;

  const partnerEdgeId = getBidirectionalPartner(edgeId, edges);
  if (!partnerEdgeId) return false;

  // Use offset path for the lexicographically larger edge ID to ensure consistency
  return edgeId > partnerEdgeId;
}
