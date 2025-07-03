import { Button } from './ui/button';
import { ThemeToggle } from './ThemeToggle';
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
  // Import/Export functionality
  onExportYaml?: () => void;
  onImportYaml?: () => void;
  onNewConfig?: () => void;
  onSaveConfig?: () => void;
  onPreview?: () => void;
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
  onExportYaml,
  onImportYaml,
  onNewConfig,
  onSaveConfig,
  onPreview,
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between w-full max-w-6xl bg-white border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-sm" style={{ backgroundColor: 'var(--background)' }}>
      {/* Left Section */}
      <div className="flex items-center gap-2">
        {/* File Operations */}
        <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-600 pr-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onNewConfig}
            title="New configuration"
          >
            <FileText className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onImportYaml}
            title="Import YAML"
          >
            <Upload className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onExportYaml}
            title="Export YAML"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onSaveConfig}>
            <Save className="w-4 h-4" />
          </Button>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-600 pr-2">
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
          <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-600 pr-2">
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
        <div className="flex items-center gap-1">
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
      </div>

      {/* Center Logo */}
      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
        <a
          href="https://github.com/dowhiledev/nomos"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
          title="Visit Nomos on GitHub"
        >
          <img
            src="/light.png"
            alt="Nomos Logo"
            className="h-8 w-auto dark:hidden"
          />
          <img
            src="/dark.png"
            alt="Nomos Logo"
            className="h-8 w-auto hidden dark:block"
          />
        </a>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Actions */}
        <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-600 pr-2">
          <Button variant="default" size="sm" className="h-8 px-3" onClick={onPreview}>
            <Play className="w-3 h-3 mr-1" />
            Preview
          </Button>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
