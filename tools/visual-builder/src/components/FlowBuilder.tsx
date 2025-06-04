import { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type OnConnect,
  type Node,
  type Edge,
} from '@xyflow/react';
import { Toolbar } from './Toolbar';
import { StepNode } from './nodes/StepNode';
import { ToolNode } from './nodes/ToolNode';
import { RouteEdge } from './edges/RouteEdge';
import { ToolEdge } from './edges/ToolEdge';
import { ContextMenu } from './context-menu/ContextMenu';
import { FlowProvider } from '../context/FlowContext';
import { NodeEditDialogs } from './dialogs/NodeEditDialogs';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { autoArrangeNodes } from '../utils/autoArrange';
import { 
  copyNodeToClipboard, 
  getClipboardData, 
  hasClipboardData, 
  cloneNodeWithNewId 
} from '../utils/clipboard';
import type { StepNodeData, ToolNodeData } from '../types';

// Define custom node types
const nodeTypes = {
  step: StepNode,
  tool: ToolNode,
};

// Define custom edge types
const edgeTypes = {
  route: RouteEdge,
  tool: ToolEdge,
};

const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'step',
    position: { x: 100, y: 100 },
    data: { 
      step_id: 'start',
      description: 'Greet the customer and ask how can I help them.',
      available_tools: ['get_available_coffee_options'],
      routes: [
        {
          target: 'take_coffee_order',
          condition: 'Customer is ready to place a new order'
        }
      ]
    },
  },
  {
    id: 'take_coffee_order',
    type: 'step',
    position: { x: 350, y: 200 },
    data: { 
      step_id: 'take_coffee_order',
      description: 'Ask the customer for their coffee preference and size.',
      available_tools: ['get_available_coffee_options', 'add_to_cart', 'remove_item', 'clear_cart'],
      routes: [
        {
          target: 'finalize_order',
          condition: 'User wants to finalize the order'
        },
        {
          target: 'end',
          condition: 'Customer wants to cancel the order'
        }
      ]
    },
  },
  {
    id: 'get_available_coffee_options',
    type: 'tool',
    position: { x: 50, y: 300 },
    data: {
      name: 'get_available_coffee_options',
      description: 'Gets the available coffee options',
      parameters: {},
    },
  },
  {
    id: 'add_to_cart',
    type: 'tool', 
    position: { x: 250, y: 300 },
    data: {
      name: 'add_to_cart',
      description: 'Adds an item to the cart',
      parameters: { 
        coffee_type: { type: 'string', description: 'Coffee type (e.g., Espresso, Latte)' },
        size: { type: 'string', description: 'Size of the coffee (Small, Medium, Large)' },
        price: { type: 'number', description: 'Price of the coffee' }
      },
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'start-take_coffee_order',
    source: 'start',
    target: 'take_coffee_order',
    sourceHandle: 'step-output',
    targetHandle: 'step-input',
    type: 'route',
    data: { condition: 'Customer is ready to place a new order' },
  },
  {
    id: 'start-get_available_coffee_options',
    source: 'start',
    target: 'get_available_coffee_options',
    sourceHandle: 'tool-output',
    targetHandle: 'tool-input',
    type: 'tool',
  },
  {
    id: 'take_coffee_order-add_to_cart',
    source: 'take_coffee_order',
    target: 'add_to_cart',
    sourceHandle: 'tool-output',
    targetHandle: 'tool-input',
    type: 'tool',
  },
];

export default function FlowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
    nodeId?: string;
  }>({
    x: 0,
    y: 0,
    visible: false,
  });

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const isValidConnection = useCallback((connection: any) => {
    const { source, target, sourceHandle, targetHandle } = connection;
    
    // Prevent self-connections
    if (source === target) return false;
    
    // Prevent duplicate connections
    const existingConnection = edges.find(
      (edge) => edge.source === source && edge.target === target && 
                edge.sourceHandle === sourceHandle && edge.targetHandle === targetHandle
    );
    if (existingConnection) return false;
    
    // Validate connection types
    if (sourceHandle === 'step-output' && targetHandle === 'step-input') {
      return true; // Step to step connection
    }
    if (sourceHandle === 'tool-output' && targetHandle === 'tool-input') {
      return true; // Step to tool connection
    }
    
    // Invalid connection type
    return false;
  }, [edges]);

  const onConnect: OnConnect = useCallback(
    (params) => {
      // Validate connection before creating edge
      if (!isValidConnection(params)) {
        return;
      }

      let edgeType: string;
      let edgeData: any = {};

      // Determine edge type based on source and target handles
      if (params.sourceHandle === 'step-output' && params.targetHandle === 'step-input') {
        edgeType = 'route';
        edgeData = { condition: 'Add condition...' };
      } else if (params.sourceHandle === 'tool-output' && params.targetHandle === 'tool-input') {
        edgeType = 'tool';
      } else {
        // Default fallback
        edgeType = 'route';
      }

      setEdges((eds) => addEdge({
        ...params,
        type: edgeType,
        data: edgeData,
      }, eds));
    },
    [setEdges, isValidConnection]
  );

  const handleUpdateNode = useCallback((nodeId: string, data: Partial<StepNodeData | ToolNodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    );
  }, [setNodes]);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    
    const target = event.target as HTMLElement;
    const nodeElement = target.closest('[data-id]');
    const nodeId = nodeElement?.getAttribute('data-id');

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      visible: true,
      nodeId: nodeId || undefined,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  const handleAutoArrange = useCallback(() => {
    const arrangedNodes = autoArrangeNodes(nodes, edges);
    setNodes(arrangedNodes);
  }, [nodes, edges, setNodes]);

  // Auto-arrange nodes when the component mounts
  useEffect(() => {
    // Only auto-arrange if we have nodes (to avoid running on empty state)
    if (nodes.length > 0) {
      const arrangedNodes = autoArrangeNodes(nodes, edges);
      setNodes(arrangedNodes);
    }
  }, []); // Empty dependency array means this runs only once on mount

  // Keyboard shortcuts for copy/paste
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.metaKey || event.ctrlKey) {
        if (event.key === 'c') {
          // Copy selected nodes
          const selectedNodes = nodes.filter(node => node.selected);
          if (selectedNodes.length === 1) {
            copyNodeToClipboard(selectedNodes[0]);
            event.preventDefault();
          }
        } else if (event.key === 'v') {
          // Paste node
          const clipboardData = getClipboardData();
          if (clipboardData && clipboardData.type === 'node') {
            const originalNode = clipboardData.data as Node;
            const newNode = cloneNodeWithNewId(originalNode, 50, 50);
            setNodes((nds) => [...nds, newNode]);
            event.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [nodes, setNodes]);

  const addStepNode = useCallback(() => {
    const id = `step-${Date.now()}`;
    const position = screenToFlowPosition({
      x: contextMenu.x - 100,
      y: contextMenu.y - 50,
    });

    const newNode: Node = {
      id,
      type: 'step',
      position,
      data: {
        step_id: `step_${nodes.length + 1}`,
        description: 'New step description',
        available_tools: [],
        routes: [],
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [contextMenu.x, contextMenu.y, screenToFlowPosition, nodes.length, setNodes]);

  const addToolNode = useCallback(() => {
    const id = `tool-${Date.now()}`;
    const position = screenToFlowPosition({
      x: contextMenu.x - 90,
      y: contextMenu.y - 50,
    });

    const newNode: Node = {
      id,
      type: 'tool',
      position,
      data: {
        name: `tool_${nodes.length + 1}`,
        description: 'New tool description',
        parameters: {},
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [contextMenu.x, contextMenu.y, screenToFlowPosition, nodes.length, setNodes]);

  const deleteNode = useCallback(() => {
    if (contextMenu.nodeId) {
      setNodes((nds) => nds.filter((node) => node.id !== contextMenu.nodeId));
      setEdges((eds) => eds.filter((edge) => 
        edge.source !== contextMenu.nodeId && edge.target !== contextMenu.nodeId
      ));
    }
  }, [contextMenu.nodeId, setNodes, setEdges]);

  const copyNode = useCallback(() => {
    if (contextMenu.nodeId) {
      const node = nodes.find(n => n.id === contextMenu.nodeId);
      if (node) {
        copyNodeToClipboard(node);
      }
    }
  }, [contextMenu.nodeId, nodes]);

  const pasteNode = useCallback(() => {
    const clipboardData = getClipboardData();
    if (clipboardData && clipboardData.type === 'node') {
      const originalNode = clipboardData.data as Node;
      const position = screenToFlowPosition({
        x: contextMenu.x - 100,
        y: contextMenu.y - 50,
      });
      
      const newNode = cloneNodeWithNewId(originalNode);
      newNode.position = position;
      
      setNodes((nds) => [...nds, newNode]);
    }
  }, [contextMenu.x, contextMenu.y, screenToFlowPosition, setNodes]);

  return (
    <FlowProvider onUpdateNode={handleUpdateNode}>
      <div className="h-full w-full relative" ref={reactFlowWrapper}>
        <Toolbar onAutoArrange={handleAutoArrange} />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onContextMenu={handleContextMenu}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          minZoom={0.3}
          maxZoom={1.0}
          defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
          snapToGrid={true}
          snapGrid={[20, 20]}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 0.8 }}
        >
          <Background gap={20}/>
          <Controls />
          
          {/* Arrow marker definition */}
          <svg style={{ position: 'absolute', top: 0, left: 0 }}>
            <defs>
              <marker
                id="arrow-marker"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path
                  d="M0,0 L0,6 L9,3 z"
                  fill="#374151"
                />
              </marker>
            </defs>
          </svg>
        </ReactFlow>
        
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          visible={contextMenu.visible}
          onClose={closeContextMenu}
          onAddStepNode={addStepNode}
          onAddToolNode={addToolNode}
          onCopy={contextMenu.nodeId ? copyNode : undefined}
          onPaste={hasClipboardData() ? pasteNode : undefined}
          onDelete={contextMenu.nodeId ? deleteNode : undefined}
          isOnNode={!!contextMenu.nodeId}
        />
        
        <NodeEditDialogs />
        <KeyboardShortcuts />
      </div>
    </FlowProvider>
  );
}
