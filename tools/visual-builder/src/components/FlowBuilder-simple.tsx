import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type OnConnect,
  type Node,
  type Edge,
} from '@xyflow/react';
import { Toolbar } from './Toolbar';
import { StepNode } from './nodes/StepNode-v2';
import { ToolNode } from './nodes/ToolNode-simple';
import { FlowProvider } from '../context/FlowContext';
import { NodeEditDialogs } from './dialogs/NodeEditDialogs';
import type { StepNodeData, ToolNodeData } from '../types';

// Define custom node types
const nodeTypes = {
  step: StepNode,
  tool: ToolNode,
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
    type: 'smoothstep',
    style: { stroke: '#374151', strokeWidth: 2 },
  },
  {
    id: 'start-get_available_coffee_options',
    source: 'start',
    target: 'get_available_coffee_options',
    type: 'smoothstep',
    style: { stroke: '#3b82f6', strokeWidth: 1 },
    animated: true,
  },
  {
    id: 'take_coffee_order-add_to_cart',
    source: 'take_coffee_order',
    target: 'add_to_cart',
    type: 'smoothstep',
    style: { stroke: '#3b82f6', strokeWidth: 1 },
    animated: true,
  },
];

export default function FlowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      style: { stroke: '#374151', strokeWidth: 2 },
    }, eds)),
    [setEdges]
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

  return (
    <FlowProvider onUpdateNode={handleUpdateNode}>
      <div className="h-full w-full relative">
        <Toolbar />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          minZoom={0.3}
          maxZoom={1.0}
          defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 0.8 }}
        >
          <Background />
          <Controls />
        </ReactFlow>
        <NodeEditDialogs />
      </div>
    </FlowProvider>
  );
}
