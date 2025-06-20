import { memo } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { Play, Wrench, Trash2, Copy, Edit, Clipboard, Unlink } from 'lucide-react';

interface ShadcnContextMenuProps {
  children: React.ReactNode;
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

export const ShadcnContextMenu = memo(({
  children,
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
}: ShadcnContextMenuProps) => {
  // Determine the edit label based on node type
  const getEditLabel = () => {
    if (nodeType === 'group') {
      return 'Edit Configuration';
    }
    return 'Edit Node';
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56 z-[9999]">
        {!isOnNode && !isOnEdge ? (
          // Menu for empty canvas
          <>
            <ContextMenuItem onClick={onAddStepNode}>
              <Play className="mr-2 h-4 w-4" />
              Add Step Node
            </ContextMenuItem>
            <ContextMenuItem onClick={onAddToolNode}>
              <Wrench className="mr-2 h-4 w-4" />
              Add Tool Node
            </ContextMenuItem>
            {onPaste && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={onPaste}>
                  <Clipboard className="mr-2 h-4 w-4" />
                  Paste Node
                </ContextMenuItem>
              </>
            )}
          </>
        ) : isOnEdge ? (
          // Menu for edge
          <>
            {onDelete && (
              <ContextMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Edge
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onAddStepNode}>
              <Play className="mr-2 h-4 w-4" />
              Add Step Node
            </ContextMenuItem>
            <ContextMenuItem onClick={onAddToolNode}>
              <Wrench className="mr-2 h-4 w-4" />
              Add Tool Node
            </ContextMenuItem>
          </>
        ) : (
          // Menu for existing node
          <>
            {onEdit && (
              <ContextMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                {getEditLabel()}
              </ContextMenuItem>
            )}
            {onCopy && (
              <ContextMenuItem onClick={onCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Node
              </ContextMenuItem>
            )}
            {onPaste && (
              <ContextMenuItem onClick={onPaste}>
                <Clipboard className="mr-2 h-4 w-4" />
                Paste Node
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onAddStepNode}>
              <Play className="mr-2 h-4 w-4" />
              Add Step Node
            </ContextMenuItem>
            <ContextMenuItem onClick={onAddToolNode}>
              <Wrench className="mr-2 h-4 w-4" />
              Add Tool Node
            </ContextMenuItem>
            {onDetach && (
              <>
                <ContextMenuSeparator />
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Unlink className="mr-2 h-4 w-4" />
                    Detach Connections
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    <ContextMenuItem onClick={() => onDetach('tools')} className="text-orange-600 focus:text-orange-600">
                      <Unlink className="mr-2 h-4 w-4" />
                      Detach Tools
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => onDetach('steps')} className="text-orange-600 focus:text-orange-600">
                      <Unlink className="mr-2 h-4 w-4" />
                      Detach Steps
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => onDetach('all')} className="text-orange-600 focus:text-orange-600">
                      <Unlink className="mr-2 h-4 w-4" />
                      Detach All
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
              </>
            )}
            {onDelete && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Node
                </ContextMenuItem>
              </>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
});

ShadcnContextMenu.displayName = 'ShadcnContextMenu';
