import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
  Node as FlowNode,
  Edge as FlowEdge,
  Connection,
  useReactFlow,
  Panel,
  MarkerType,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { StepNodeData } from './nodes/StepNode';
import { ToolNodeData } from './nodes/ToolNode';
import { RouteEdgeData } from './edges/RouteEdge';
import { ToolUsageEdgeData } from './edges/ToolUsageEdge';
import { SofiaConfig, SofiaNodeType, SofiaEdgeType, SofiaConnectionType } from './models/sofia';
import { configToFlow, flowToConfig, parseYaml, generateYaml } from './utils/yaml';
import Sidebar from './components/Sidebar';
import PropertyPanel from './components/PropertyPanel';

type SofiaNode = FlowNode<StepNodeData | ToolNodeData>;
type SofiaEdge = FlowEdge<RouteEdgeData | ToolUsageEdgeData>;

const defaultConfig: SofiaConfig = {
  name: 'New Sofia Agent',
  persona: 'A helpful assistant',
  start_step_id: '',
  steps: [],
};

export default function App() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();

  const [nodes, setNodes] = useState<SofiaNode[]>([]);
  const [edges, setEdges] = useState<SofiaEdge[]>([]);
  const [config, setConfig] = useState<SofiaConfig>(defaultConfig);

  const [selectedNode, setSelectedNode] = useState<SofiaNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<SofiaEdge | null>(null);

  // Handle node selection
  const onNodeClick = useCallback((_event: React.MouseEvent, node: SofiaNode) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  // Handle edge selection
  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: SofiaEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  // Handle pane click (deselect everything)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // Handle edge double click (for editing route condition)
  const onEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: SofiaEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  // Determine connection type based on source and target
  const getConnectionType = (connection: Connection): SofiaConnectionType | null => {
    const sourceNode = nodes.find(node => node.id === connection.source);
    const targetNode = nodes.find(node => node.id === connection.target);

    if (!sourceNode || !targetNode) return null;

    if (sourceNode.type === SofiaNodeType.STEP && targetNode.type === SofiaNodeType.STEP) {
      // Check if connecting from source to target handles (both on left now)
      if (connection.sourceHandle === 'step-source' && connection.targetHandle === 'step-target') {
        return SofiaConnectionType.STEP_TO_STEP;
      }
    } else if (sourceNode.type === SofiaNodeType.STEP && targetNode.type === SofiaNodeType.TOOL) {
      // Check if connecting from tool-source to tool-target
      if (connection.sourceHandle === 'tool-source' && connection.targetHandle === 'tool-target') {
        return SofiaConnectionType.STEP_TO_TOOL;
      }
    }

    return null;
  };

  // Handle node changes
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes as NodeChange[], nds) as SofiaNode[]);
  }, []);

  // Handle edge changes
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes as EdgeChange[], eds) as SofiaEdge[]);
  }, []);

  // Handle connection between nodes
  const createNewEdge = (connection: Connection, type: SofiaEdgeType, data: RouteEdgeData | ToolUsageEdgeData): SofiaEdge => ({
    ...connection,
    id: `${type}_${Date.now()}`,
    type,
    data,
  });

  const onConnect = useCallback(
    (connection: Connection) => {
      const connectionType = getConnectionType(connection);
      if (!connectionType) {
        console.warn('Invalid connection type');
        return;
      }

      if (connectionType === SofiaConnectionType.STEP_TO_STEP) {
        const newEdge = createNewEdge(
          connection,
          SofiaEdgeType.ROUTE,
          { condition: 'True' } as RouteEdgeData
        );
        newEdge.animated = true;
        newEdge.className = 'step-connection';
        newEdge.markerEnd = {
          type: MarkerType.ArrowClosed,
          color: '#1a73e8',
        };
        setEdges((eds) => addEdge(newEdge, eds));
      } else if (connectionType === SofiaConnectionType.STEP_TO_TOOL) {
        const toolNodeId = connection.target;
        const newEdge = createNewEdge(
          connection,
          SofiaEdgeType.TOOL_USAGE,
          { toolName: toolNodeId } as ToolUsageEdgeData
        );
        newEdge.animated = true;
        newEdge.className = 'tool-connection';
        setEdges((eds) => addEdge(newEdge, eds));

        // Add toolNodeId to the step's available_tools
        setNodes((nds) => nds.map((node) => {
          if (node.id === connection.source && node.type === SofiaNodeType.STEP) {
            const data = node.data as StepNodeData;
            const available_tools = Array.isArray(data.available_tools) ? data.available_tools : [];
            if (!available_tools.includes(toolNodeId)) {
              return {
                ...node,
                data: {
                  ...data,
                  available_tools: [...available_tools, toolNodeId]
                }
              };
            }
          }
          return node;
        }));
      }
    },
    [nodes]
  );

  // Handle edge deletion: remove tool from step's available_tools if TOOL_USAGE edge is deleted
  const handleDeleteEdge = useCallback(
    (id: string) => {
      const edgeToDelete = edges.find((edge) => edge.id === id);
      if (edgeToDelete && edgeToDelete.type === SofiaEdgeType.TOOL_USAGE) {
        const stepId = edgeToDelete.source;
        const toolNodeId = edgeToDelete.target;
        setNodes((nds) => nds.map((node) => {
          if (node.id === stepId && node.type === SofiaNodeType.STEP) {
            const nodeData = node.data as StepNodeData;
            return {
              ...node,
              data: {
                ...nodeData,
                available_tools: nodeData.available_tools.filter(tid => tid !== toolNodeId)
              }
            };
          }
          return node;
        }));
      }
      setEdges((eds) => eds.filter((edge) => edge.id !== id));
    },
    [setEdges, setNodes, edges]
  );

  // Update node data from property panel
  const handleNodeDataChange = useCallback(
    (id: string, newData: StepNodeData | ToolNodeData) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            // Also update the node label for step nodes
            if (node.type === SofiaNodeType.STEP) {
              const stepData = newData as StepNodeData;
              const isStartStep = config.start_step_id === id;
              return {
                ...node,
                data: {
                  ...newData,
                  label: `${isStartStep ? '🚀 ' : ''}${stepData.step_id}`,
                }
              };
            }
            return { ...node, data: { ...newData } };
          }
          return node;
        })
      );
    },
    [setNodes, config]
  );

  // Update edge data from property panel
  const handleEdgeDataChange = useCallback(
    (id: string, newData: RouteEdgeData | ToolUsageEdgeData) => {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === id) {
            return { ...edge, data: { ...newData } };
          }
          return edge;
        })
      );
    },
    [setEdges]
  );

  // Update agent configuration
  const handleAgentConfigChange = useCallback(
    (name: string, persona: string) => {
      setConfig((cfg) => ({
        ...cfg,
        name,
        persona,
      }));
    },
    [setConfig]
  );

  // Delete a node and associated tool references
  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== id));
      // Also remove any connected edges
      setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
      // If deleting a tool node, remove it from any steps that use it
      setNodes((nds) => nds.map((node) => {
        if (node.type === SofiaNodeType.STEP) {
          const data = node.data as StepNodeData;
          const available_tools = Array.isArray(data.available_tools) ? data.available_tools : [];
          if (available_tools.includes(id)) {
            return {
              ...node,
              data: {
                ...data,
                available_tools: available_tools.filter((tid) => tid !== id)
              }
            };
          }
        }
        return node;
      }));
    },
    [setNodes, setEdges]
  );

  // Set a step as the start step
  const handleSetStartStep = useCallback(
    (id: string) => {
      // Update config
      setConfig((cfg) => ({
        ...cfg,
        start_step_id: id,
      }));

      // Update node labels to show which is the start step
      setNodes((nds) =>
        nds.map((node) => {
          if (node.type === SofiaNodeType.STEP) {
            const stepData = node.data as StepNodeData;
            const isStartStep = node.id === id;
            return {
              ...node,
              data: {
                ...stepData,
                label: `${isStartStep ? '🚀 ' : ''}${stepData.step_id}`,
              },
              style: isStartStep ? { borderColor: '#00ff00', borderWidth: 2 } : undefined,
            };
          }
          return node;
        })
      );
    },
    [setConfig, setNodes]
  );

  // Check if a step is the start step
  const isStartStep = useCallback(
    (id: string) => {
      return config.start_step_id === id;
    },
    [config]
  );

  // Handle drag and drop
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow/type');

      if (typeof type === 'undefined' || !type || !reactFlowBounds) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Create a unique ID
      const id = `${type}_${Date.now()}`;

      let newNode: SofiaNode = { id, position } as SofiaNode;

      if (type === SofiaNodeType.STEP) {
        const isFirst = nodes.filter(n => n.type === SofiaNodeType.STEP).length === 0;
        const stepId = `step_${nodes.filter(n => n.type === SofiaNodeType.STEP).length + 1}`;

        newNode = {
          id,
          type: SofiaNodeType.STEP,
          position,
          data: {
            label: `${isFirst ? '🚀 ' : ''}${stepId}`,
            step_id: stepId,
            description: 'New step description',
            available_tools: [],
          } as StepNodeData,
          style: isFirst ? { borderColor: '#00ff00', borderWidth: 2 } : undefined,
        };

        // If this is the first step, set it as start step
        if (isFirst) {
          setConfig((cfg) => ({
            ...cfg,
            start_step_id: id,
          }));
        }
      } else if (type === SofiaNodeType.TOOL) {
        const toolName = `tool_${nodes.filter(n => n.type === SofiaNodeType.TOOL).length + 1}`;

        newNode = {
          id,
          type: SofiaNodeType.TOOL,
          position,
          data: {
            name: toolName,
            description: 'New tool description',
            arguments: []
          } as ToolNodeData,
        };
      }

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, nodes, setNodes, setConfig]
  );

  // Handle drag start from sidebar
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string, name: string) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/name', name);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Create a new empty config
  const handleNewConfig = useCallback(() => {
    setConfig(defaultConfig);
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setNodes, setEdges]);

  // Import config from YAML file
  const handleImportYaml = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const yamlString = e.target?.result as string;
          const importedConfig = parseYaml(yamlString);
          setConfig(importedConfig);

          // Convert config to nodes and edges and cast to correct types
          const { nodes: importedNodes, edges: importedEdges } = configToFlow(importedConfig);
          setNodes(importedNodes as SofiaNode[]);
          setEdges(importedEdges as SofiaEdge[]);

          // Reset selection
          setSelectedNode(null);
          setSelectedEdge(null);
        } catch (error) {
          console.error('Error importing YAML:', error);
          alert('Error importing YAML file. Please check the console for details.');
        }
      };
      reader.readAsText(file);

      // Reset the input to allow re-importing the same file
      event.target.value = '';
    },
    [setConfig, setNodes, setEdges]
  );

  // Export config to YAML file
  const handleExportYaml = useCallback(() => {
    try {
      // Convert current nodes and edges to config
      const currentConfig = flowToConfig(nodes, edges, config.name, config.persona, config.start_step_id);

      // Generate YAML
      const yamlString = generateYaml(currentConfig);

      // Create a download link
      const blob = new Blob([yamlString], { type: 'text/yaml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentConfig.name.toLowerCase().replace(/\s+/g, '_')}.yaml`;
      document.body.appendChild(link);
      link.click();

      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting YAML:', error);
      alert('Error exporting YAML. Please check the console for details.');
    }
  }, [nodes, edges, config]);

  return (
    <div className="flex w-screen h-screen">
      {/* Sidebar */}
      <Sidebar
        onImportYaml={handleImportYaml}
        onExportYaml={handleExportYaml}
        onNewConfig={handleNewConfig}
        config={config}
        onDragStart={onDragStart}
        onAgentConfigChange={handleAgentConfigChange}
      />
      {/* React Flow */}
      <div className="flex-grow h-full min-w-0" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes as FlowNode[]}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          edges={edges as FlowEdge[]}
          edgeTypes={edgeTypes}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick as any}
          onEdgeClick={onEdgeClick as any}
          onEdgeDoubleClick={onEdgeDoubleClick as any}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          fitView
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          colorMode="system"
        >
          <MiniMap />
          <Background/>
          <Controls />
          <Panel position="top-center">
            <h3>{config.name}</h3>
          </Panel>
        </ReactFlow>
      </div>
      {/* Property Panel */}
      <PropertyPanel
        nodes={nodes}
        edges={edges}
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        onNodeChange={handleNodeDataChange}
        onEdgeChange={handleEdgeDataChange}
        onDeleteNode={handleDeleteNode}
        onDeleteEdge={handleDeleteEdge}
        onSetStartStep={handleSetStartStep}
        isStartStep={isStartStep}
        config={config}
        onAgentConfigChange={handleAgentConfigChange}
      />
    </div>
  );
}
