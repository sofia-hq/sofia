import { useFlowContext } from '../../context/FlowContext';
import { StepEditDialog } from './StepEditDialog';
import { ToolEditDialog } from './ToolEditDialog';
import type { StepNodeData, ToolNodeData } from '../../types';

export function NodeEditDialogs() {
  const { editingNode, editingNodeType, editingNodeData, setEditingNode, updateNodeData } = useFlowContext();

  const handleClose = () => {
    setEditingNode(null, null, null);
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

  return (
    <>
      {editingNodeType === 'step' && editingNodeData && (
        <StepEditDialog
          open={!!editingNode}
          onClose={handleClose}
          stepData={editingNodeData as StepNodeData}
          onSave={handleStepSave}
        />
      )}
      
      {editingNodeType === 'tool' && editingNodeData && (
        <ToolEditDialog
          open={!!editingNode}
          onClose={handleClose}
          toolData={editingNodeData as ToolNodeData}
          onSave={handleToolSave}
        />
      )}
    </>
  );
}
