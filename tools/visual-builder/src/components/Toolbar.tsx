import { Button } from './ui/button';
import {
  Download,
  Upload,
  Save,
  FileText,
  RotateCcw,
  RotateCw,
  Layers,
  Play,
  Group,
  Ungroup,
  Copy,
  Trash2
} from 'lucide-react';

interface ToolbarProps {
  onAutoArrange?: () => void;
  onCreateFlowGroup?: () => void;
  onUngroupFlow?: () => void;
  selectedNodesCount?: number;
  // Undo/Redo functionality
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  // Bulk operations
  onBulkDelete?: () => void;
  onBulkDuplicate?: () => void;
  onBulkGroup?: () => void;
}

export function Toolbar({
  onAutoArrange,
  onCreateFlowGroup,
  onUngroupFlow,
  selectedNodesCount = 0,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onBulkDelete,
  onBulkDuplicate,
  onBulkGroup,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
      {/* File Operations */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <FileText className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Upload className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Download className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Save className="w-4 h-4" />
        </Button>
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <RotateCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Selection Operations */}
      {selectedNodesCount > 0 && (
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onBulkDuplicate}
            title={`Duplicate ${selectedNodesCount} selected nodes`}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onBulkDelete}
            title={`Delete ${selectedNodesCount} selected nodes`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Layout */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onAutoArrange}
          title="Auto-arrange nodes"
        >
          <Layers className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onBulkGroup || onCreateFlowGroup}
          disabled={selectedNodesCount < 2}
          title={selectedNodesCount < 2 ? "Select 2+ step nodes to group" : "Group selected step nodes into flow"}
        >
          <Group className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onUngroupFlow}
          title="Ungroup flow"
        >
          <Ungroup className="w-4 h-4" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button variant="default" size="sm" className="h-8 px-3">
          <Play className="w-3 h-3 mr-1" />
          Preview
        </Button>
      </div>
    </div>
  );
}
