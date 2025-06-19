// Temporary type declarations for @xyflow/react to fix build issues
declare module '@xyflow/react' {
  export interface Node<T = any, U = string> {
    id: string;
    type?: U;
    position: { x: number; y: number };
    data?: T;
    selected?: boolean;
    parentId?: string;
    [key: string]: any;
  }

  export interface Edge {
    id: string;
    source: string;
    target: string;
    type?: string;
    data?: any;
    [key: string]: any;
  }

  export interface NodeProps<T = any> {
    id: string;
    data: T;
    selected?: boolean;
    [key: string]: any;
  }

  export interface EdgeProps {
    id: string;
    source: string;
    target: string;
    data?: any;
    [key: string]: any;
  }

  export interface NodeTypes {
    [key: string]: any;
  }

  export interface EdgeTypes {
    [key: string]: any;
  }

  export interface BuiltInNode extends Node {}

  export interface OnConnect {
    (params: any): void;
  }

  export const ReactFlow: any;
  export const Background: any;
  export const Controls: any;
  export const Handle: any;
  export const Position: any;
  export const ReactFlowProvider: any;
  export const BaseEdge: any;
  export const EdgeLabelRenderer: any;
  export const getSmoothStepPath: any;
  export const useReactFlow: any;
  export const useNodesState: any;
  export const useEdgesState: any;
  export const addEdge: any;
  export const applyNodeChanges: any;
  export const applyEdgeChanges: any;
  export default ReactFlow;
}
