import { memo, useEffect, useRef } from 'react';
import { Play, Wrench, Trash2, Copy, Edit, Clipboard, Unlink } from 'lucide-react';

interface CustomContextMenuProps {
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

export const CustomContextMenu = memo(({
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
}: CustomContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [visible, onClose]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  // Determine the edit label based on node type
  const getEditLabel = () => {
    if (nodeType === 'group') {
      return 'Edit Configuration';
    }
    return 'Edit Node';
  };

  const handleItemClick = (callback?: () => void) => {
    if (callback) {
      callback();
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 z-[9999] min-w-[14rem]"
      style={{
        left: x,
        top: y,
      }}
    >
      {!isOnNode && !isOnEdge ? (
        // Menu for empty canvas
        <>
          <button
            onClick={() => handleItemClick(onAddStepNode)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Add Step Node
          </button>
          <button
            onClick={() => handleItemClick(onAddToolNode)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            Add Tool Node
          </button>
          {onPaste && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
              <button
                onClick={() => handleItemClick(onPaste)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Clipboard className="w-4 h-4" />
                Paste Node
              </button>
            </>
          )}
        </>
      ) : isOnEdge ? (
        // Menu for edge
        <>
          {onDelete && (
            <button
              onClick={() => handleItemClick(onDelete)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Edge
            </button>
          )}
          <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
          <button
            onClick={() => handleItemClick(onAddStepNode)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Add Step Node
          </button>
          <button
            onClick={() => handleItemClick(onAddToolNode)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            Add Tool Node
          </button>
        </>
      ) : (
        // Menu for existing node
        <>
          {onEdit && (
            <button
              onClick={() => handleItemClick(onEdit)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              {getEditLabel()}
            </button>
          )}
          {onCopy && (
            <button
              onClick={() => handleItemClick(onCopy)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Node
            </button>
          )}
          {onPaste && (
            <button
              onClick={() => handleItemClick(onPaste)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Clipboard className="w-4 h-4" />
              Paste Node
            </button>
          )}
          <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
          <button
            onClick={() => handleItemClick(onAddStepNode)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Add Step Node
          </button>
          <button
            onClick={() => handleItemClick(onAddToolNode)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            Add Tool Node
          </button>
          {onDetach && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
              <div className="relative group">
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Unlink className="w-4 h-4" />
                    Detach Connections
                  </div>
                  <span className="text-xs">▶</span>
                </button>
                <div className="absolute left-full top-0 ml-1 hidden group-hover:block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[10rem] z-[10000]">
                  <button
                    onClick={() => handleItemClick(() => onDetach('tools'))}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center gap-2"
                  >
                    <Unlink className="w-4 h-4" />
                    Detach Tools
                  </button>
                  <button
                    onClick={() => handleItemClick(() => onDetach('steps'))}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center gap-2"
                  >
                    <Unlink className="w-4 h-4" />
                    Detach Steps
                  </button>
                  <button
                    onClick={() => handleItemClick(() => onDetach('all'))}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center gap-2"
                  >
                    <Unlink className="w-4 h-4" />
                    Detach All
                  </button>
                </div>
              </div>
            </>
          )}
          {onDelete && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
              <button
                onClick={() => handleItemClick(onDelete)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Node
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
});

CustomContextMenu.displayName = 'CustomContextMenu';
