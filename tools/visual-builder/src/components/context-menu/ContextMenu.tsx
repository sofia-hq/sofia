import { memo } from 'react';
import { Button } from '../ui/button';
import { Play, Wrench, Trash2, Copy, Edit } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  onClose: () => void;
  onAddStepNode: () => void;
  onAddToolNode: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  isOnNode?: boolean;
}

export const ContextMenu = memo(({
  x,
  y,
  visible,
  onClose,
  onAddStepNode,
  onAddToolNode,
  onEdit,
  onDelete,
  onCopy,
  isOnNode = false,
}: ContextMenuProps) => {
  if (!visible) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <>
      {/* Backdrop to close menu */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Context menu */}
      <div
        className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[160px]"
        style={{
          left: x,
          top: y,
        }}
      >
        {!isOnNode ? (
          // Menu for empty canvas
          <>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start px-3 py-2 h-auto"
              onClick={() => handleAction(onAddStepNode)}
            >
              <Play className="w-4 h-4 mr-2" />
              Add Step Node
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start px-3 py-2 h-auto"
              onClick={() => handleAction(onAddToolNode)}
            >
              <Wrench className="w-4 h-4 mr-2" />
              Add Tool Node
            </Button>
          </>
        ) : (
          // Menu for existing node
          <>
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start px-3 py-2 h-auto"
                onClick={() => handleAction(onEdit)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Node
              </Button>
            )}
            {onCopy && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start px-3 py-2 h-auto"
                onClick={() => handleAction(onCopy)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Node
              </Button>
            )}
            <div className="border-t border-gray-100 my-1" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start px-3 py-2 h-auto"
              onClick={() => handleAction(onAddStepNode)}
            >
              <Play className="w-4 h-4 mr-2" />
              Add Step Node
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start px-3 py-2 h-auto"
              onClick={() => handleAction(onAddToolNode)}
            >
              <Wrench className="w-4 h-4 mr-2" />
              Add Tool Node
            </Button>
            {onDelete && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start px-3 py-2 h-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleAction(onDelete)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Node
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
});

ContextMenu.displayName = 'ContextMenu';
