// Clipboard utilities for copy/paste functionality
import type { Node } from '@xyflow/react';

interface ClipboardData {
  type: 'node' | 'nodes';
  data: Node | Node[];
  timestamp: number;
}

const CLIPBOARD_KEY = 'nomos-visual-builder-clipboard';

export function copyNodeToClipboard(node: Node): void {
  const clipboardData: ClipboardData = {
    type: 'node',
    data: node,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(clipboardData));
  } catch (error) {
    console.error('Failed to copy node to clipboard:', error);
  }
}

export function copyNodesToClipboard(nodes: Node[]): void {
  const clipboardData: ClipboardData = {
    type: 'nodes',
    data: nodes,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(clipboardData));
  } catch (error) {
    console.error('Failed to copy nodes to clipboard:', error);
  }
}

export function getClipboardData(): ClipboardData | null {
  try {
    const data = localStorage.getItem(CLIPBOARD_KEY);
    if (!data) return null;

    const clipboardData = JSON.parse(data) as ClipboardData;

    // Check if data is not too old (24 hours)
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (Date.now() - clipboardData.timestamp > twentyFourHours) {
      localStorage.removeItem(CLIPBOARD_KEY);
      return null;
    }

    return clipboardData;
  } catch (error) {
    console.error('Failed to get clipboard data:', error);
    return null;
  }
}

export function hasClipboardData(): boolean {
  return getClipboardData() !== null;
}

export function clearClipboard(): void {
  try {
    localStorage.removeItem(CLIPBOARD_KEY);
  } catch (error) {
    console.error('Failed to clear clipboard:', error);
  }
}

export function generateUniqueId(prefix: string = 'node'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function cloneNodeWithNewId(node: Node, offsetX: number = 50, offsetY: number = 50): Node {
  const newId = generateUniqueId(node.type || 'node');

  return {
    ...node,
    id: newId,
    position: {
      x: node.position.x + offsetX,
      y: node.position.y + offsetY
    },
    selected: false
  };
}

export function cloneNodesWithNewIds(nodes: Node[], offsetX: number = 50, offsetY: number = 50): Node[] {
  return nodes.map(node => cloneNodeWithNewId(node, offsetX, offsetY));
}
