import { useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Settings, Wrench, Plus } from 'lucide-react';

interface FlowContextMenuProps {
  position: { x: number; y: number };
  visible: boolean;
  onClose: () => void;
  onAddNode: (type: 'step' | 'tool', position: { x: number; y: number }) => void;
}

export function FlowContextMenu({ 
  position, 
  visible, 
  onClose, 
  onAddNode 
}: FlowContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  const handleAddStep = () => {
    onAddNode('step', { x: position.x - 100, y: position.y - 50 });
  };

  const handleAddTool = () => {
    onAddNode('tool', { x: position.x - 90, y: position.y - 50 });
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[160px]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="text-xs text-gray-500 px-2 py-1 border-b border-gray-100">
        Add Node
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start h-8 px-2"
        onClick={handleAddStep}
      >
        <Settings className="w-4 h-4 mr-2" />
        Step Node
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start h-8 px-2"
        onClick={handleAddTool}
      >
        <Wrench className="w-4 h-4 mr-2" />
        Tool Node
      </Button>
      
      <div className="border-t border-gray-100 mt-1 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 px-2 text-gray-500"
          disabled
        >
          <Plus className="w-4 h-4 mr-2" />
          Flow Group
        </Button>
      </div>
    </div>
  );
}
