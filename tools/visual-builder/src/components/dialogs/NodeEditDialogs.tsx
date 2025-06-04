import { useFlowContext } from '../../context/FlowContext';
import { StepEditDialog } from './StepEditDialog';
import { ToolEditDialog } from './ToolEditDialog';
import { FlowEditDialog } from './FlowEditDialog';
import type { StepNodeData, ToolNodeData, FlowGroupData } from '../../types';

export function NodeEditDialogs() {
  const {
    editingNode,
    editingNodeType,
    editingNodeData,
    editingFlow,
    editingFlowData,
    nodes,
    edges,
    setEditingNode,
    setEditingFlow,
    updateNodeData,
    updateFlowData
  } = useFlowContext();

  const handleNodeClose = () => {
    setEditingNode(null, null, null);
  };

  const handleFlowClose = () => {
    setEditingFlow(null, null);
  };

  const handleStepSave = (data: StepNodeData) => {
    if (editingNode) {
      updateNodeData(editingNode, data);
    }
  };

  const handleToolSave = (data: ToolNodeData) => {
    if (editingNode) {
      updateNodeData(editingNode, data);
    }
  };

  const handleFlowSave = (data: FlowGroupData) => {
    if (editingFlow) {
      updateFlowData(editingFlow, data);
    }
  };

  // TODO: Get available step IDs from the flow builder context
  const availableStepIds: string[] = [];

  return (
    <>
      {editingNodeType === 'step' && editingNodeData && (
        <StepEditDialog
          open={!!editingNode}
          onClose={handleNodeClose}
          stepData={editingNodeData as StepNodeData}
          onSave={handleStepSave}
          nodeId={editingNode || ''}
          nodes={nodes}
          edges={edges}
        />
      )}

      {editingNodeType === 'tool' && editingNodeData && (
        <ToolEditDialog
          open={!!editingNode}
          onClose={handleNodeClose}
          toolData={editingNodeData as ToolNodeData}
          onSave={handleToolSave}
        />
      )}

      {editingFlow && editingFlowData && (
        <FlowEditDialog
          open={!!editingFlow}
          onClose={handleFlowClose}
          flowData={editingFlowData}
          onSave={handleFlowSave}
          availableStepIds={availableStepIds}
        />
      )}
    </>
  );
}
