import { memo, useState } from 'react';
import { Button } from './ui/button';
import { HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

interface KeyboardShortcut {
  keys: string[];
  description: string;
}

const shortcuts: KeyboardShortcut[] = [
  {
    keys: ['Cmd/Ctrl', 'Z'],
    description: 'Undo last action'
  },
  {
    keys: ['Cmd/Ctrl', 'Shift', 'Z'],
    description: 'Redo last action'
  },
  {
    keys: ['Cmd/Ctrl', 'C'],
    description: 'Copy selected node(s)'
  },
  {
    keys: ['Cmd/Ctrl', 'V'],
    description: 'Paste copied node(s)'
  },
  {
    keys: ['Cmd/Ctrl', 'A'],
    description: 'Select all nodes'
  },
  {
    keys: ['Del/Backspace'],
    description: 'Delete selected node(s)'
  },
  {
    keys: ['Escape'],
    description: 'Deselect all nodes'
  },
  {
    keys: ['Right Click'],
    description: 'Open context menu'
  },
  {
    keys: ['Mouse Wheel'],
    description: 'Zoom in/out'
  }
];

export const KeyboardShortcuts = memo(() => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="fixed bottom-4 right-4 bg-white border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md z-50"
        style={{ backgroundColor: 'var(--background)' }}
        onClick={() => setOpen(true)}
        title="Keyboard Shortcuts"
      >
        <HelpCircle className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Use these shortcuts to work more efficiently with the visual builder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                <span className="text-sm text-gray-600 dark:text-gray-300">{shortcut.description}</span>
                <div className="flex gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <kbd
                      key={keyIndex}
                      className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            Tip: Right-click on nodes or empty canvas for more options.
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

KeyboardShortcuts.displayName = 'KeyboardShortcuts';
