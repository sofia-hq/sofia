import { memo } from 'react';
import { Button } from '../ui/button';
import { Play, Wrench, Trash2, Copy, Edit, Clipboard, Unlink } from 'lucide-react';

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
  onPaste?: () => void;
  onDetach?: (type: 'all' | 'tools' | 'steps') => void;
  isOnNode?: boolean;
  isOnEdge?: boolean;
  nodeType?: string;
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
  onPaste,
  onDetach,
  isOnNode = false,
  isOnEdge = false,
  nodeType,
}: ContextMenuProps) => {
  if (!visible) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  // Determine the edit label based on node type
  const getEditLabel = () => {
    if (nodeType === 'group') {
      return 'Edit Configuration';
    }
    return 'Edit Node';
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
        {!isOnNode && !isOnEdge ? (
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
            {onPaste && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start px-3 py-2 h-auto"
                  onClick={() => handleAction(onPaste)}
                >
                  <Clipboard className="w-4 h-4 mr-2" />
                  Paste Node
                </Button>
              </>
            )}
          </>
        ) : isOnEdge ? (
          // Menu for edge
          <>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start px-3 py-2 h-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleAction(onDelete)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Edge
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
                {getEditLabel()}
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
            {onPaste && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start px-3 py-2 h-auto"
                onClick={() => handleAction(onPaste)}
              >
                <Clipboard className="w-4 h-4 mr-2" />
                Paste Node
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
            {onDetach && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start px-3 py-2 h-auto text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  onClick={() => handleAction(() => onDetach('tools'))}
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Detach Tools
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start px-3 py-2 h-auto text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  onClick={() => handleAction(() => onDetach('steps'))}
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Detach Steps
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start px-3 py-2 h-auto text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  onClick={() => handleAction(() => onDetach('all'))}
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Detach All
                </Button>
              </>
            )}
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
