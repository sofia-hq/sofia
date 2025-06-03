import { useCallback, useState } from 'react';
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

const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'default',
    position: { x: 100, y: 100 },
    data: { label: 'Start Step' },
  },
];

const initialEdges: Edge[] = [];

export default function FlowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

// Define node types for React Flow
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
      persona: 'You are a helpful assistant.',
      tools: [],
      routes: {},
    },
  },
];

const initialEdges: Edge[] = [];

export default function FlowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
  }>({ x: 0, y: 0, visible: false });

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((edges) => addEdge(connection, edges)),
    [setEdges]
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        visible: true,
      });
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNodes([node.id]);
    },
    []
  );

  const onNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setEditingNode(node.id);
    },
    []
  );

  return (
    <div className="h-full w-full relative">
      <Toolbar />
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={onPaneClick}
        className="bg-gray-50"
        connectionLineType="straight"
        snapToGrid
        snapGrid={[20, 20]}
        fitView
      >
        <Background color="#e5e5e5" variant="dots" />
        <Controls />
      </ReactFlow>

      <FlowContextMenu
        position={{ x: contextMenu.x, y: contextMenu.y }}
        visible={contextMenu.visible}
        onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
        onAddNode={(type, position) => {
          const newNode: Node = {
            id: `${type}-${Date.now()}`,
            type,
            position,
            data: type === 'step' 
              ? { step_id: `step-${Date.now()}`, tools: [], routes: {} }
              : { tool_id: `tool-${Date.now()}`, description: '' },
          };
          setNodes((nodes) => [...nodes, newNode]);
          setContextMenu((prev) => ({ ...prev, visible: false }));
        }}
      />

      {editingNode && (
        <NodeEditPanel
          nodeId={editingNode}
          node={nodes.find(n => n.id === editingNode) || null}
          onClose={() => setEditingNode(null)}
          onSave={(nodeData) => {
            setNodes((nodes) =>
              nodes.map((node) =>
                node.id === editingNode
                  ? { ...node, data: { ...node.data, ...nodeData } }
                  : node
              )
            );
            setEditingNode(null);
          }}
        />
      )}
    </div>
  );
}
