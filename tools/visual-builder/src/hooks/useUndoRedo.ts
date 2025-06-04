import { useState, useCallback, useRef } from 'react';
import type { Node, Edge } from '@xyflow/react';

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
  timestamp: number;
  description?: string;
}

interface UseUndoRedoOptions {
  maxHistorySize?: number;
  saveDescription?: boolean;
}

export interface UndoRedoOperations {
  undo: (currentNodes: Node[], currentEdges: Edge[]) => { nodes: Node[], edges: Edge[] } | null;
  redo: (currentNodes: Node[], currentEdges: Edge[]) => { nodes: Node[], edges: Edge[] } | null;
  canUndo: boolean;
  canRedo: boolean;
  saveState: (nodes: Node[], edges: Edge[], description?: string) => void;
  clearHistory: () => void;
  getHistoryLength: () => number;
}

export function useUndoRedo(
  _initialNodes: Node[] = [],
  _initialEdges: Edge[] = [],
  options: UseUndoRedoOptions = {}
): UndoRedoOperations {
  const { maxHistorySize = 50, saveDescription = false } = options;

  // History stacks
  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);

  // Ref to track if we should ignore the next state change (to prevent undo/redo from triggering saves)
  const isApplyingHistoryRef = useRef(false);

  // Save current state to undo stack
  const saveState = useCallback((nodes: Node[], edges: Edge[], description?: string) => {
    // Don't save if we're currently applying history
    if (isApplyingHistoryRef.current) {
      return;
    }

    const newState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes)), // Deep clone
      edges: JSON.parse(JSON.stringify(edges)), // Deep clone
      timestamp: Date.now(),
      ...(saveDescription && description && { description })
    };

    setUndoStack(prev => {
      const newStack = [...prev, newState];
      // Limit history size
      if (newStack.length > maxHistorySize) {
        return newStack.slice(-maxHistorySize);
      }
      return newStack;
    });

    // Clear redo stack when new action is performed
    setRedoStack([]);
  }, [maxHistorySize, saveDescription]);

  // Undo operation
  const undo = useCallback((currentNodes: Node[], currentEdges: Edge[]): { nodes: Node[], edges: Edge[] } | null => {
    if (undoStack.length === 0) {
      return null;
    }

    const stateToRestore = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    // Save current state to redo stack
    const currentState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(currentNodes)),
      edges: JSON.parse(JSON.stringify(currentEdges)),
      timestamp: Date.now(),
    };

    setUndoStack(newUndoStack);
    setRedoStack(prev => [...prev, currentState]);

    // Set flag to prevent saving this state change
    isApplyingHistoryRef.current = true;

    // Schedule flag reset for next tick
    setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 0);

    return {
      nodes: stateToRestore.nodes,
      edges: stateToRestore.edges
    };
  }, [undoStack]);

  // Redo operation
  const redo = useCallback((currentNodes: Node[], currentEdges: Edge[]): { nodes: Node[], edges: Edge[] } | null => {
    if (redoStack.length === 0) {
      return null;
    }

    const stateToRestore = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    // Save current state to undo stack
    const currentState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(currentNodes)),
      edges: JSON.parse(JSON.stringify(currentEdges)),
      timestamp: Date.now(),
    };

    setRedoStack(newRedoStack);
    setUndoStack(prev => [...prev, currentState]);

    // Set flag to prevent saving this state change
    isApplyingHistoryRef.current = true;

    // Schedule flag reset for next tick
    setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 0);

    return {
      nodes: stateToRestore.nodes,
      edges: stateToRestore.edges
    };
  }, [redoStack]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  // Get total history length
  const getHistoryLength = useCallback(() => {
    return undoStack.length + redoStack.length;
  }, [undoStack.length, redoStack.length]);

  return {
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    saveState,
    clearHistory,
    getHistoryLength
  };
}
