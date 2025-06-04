import { Button } from './ui/button';
import { 
  Download, 
  Upload, 
  Save, 
  FileText, 
  RotateCcw, 
  RotateCw,
  Layers,
  Play
} from 'lucide-react';

interface ToolbarProps {
  onAutoArrange?: () => void;
}

export function Toolbar({ onAutoArrange }: ToolbarProps) {
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
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <RotateCw className="w-4 h-4" />
        </Button>
      </div>

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
