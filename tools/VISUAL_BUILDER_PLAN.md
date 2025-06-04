# Nomos Visual Builder Implementation Plan

## 🎯 Project Overview

Create a no-code + low-code visual builder for Nomos agents using React Flow, featuring drag-and-drop nodes, directional connections, and YAML export/import capabilities.

## 📚 Technology Stack
- **Frontend**: Vite + React + TypeScript
- **Flow Library**: React Flow (@xyflow/react)
- **UI Components**: Shadcn/ui
- **Styling**: Tailwind CSS
- **Color Palette**: Black & white shades only

## 🏗️ Architecture Overview

### Core Components Structure
```
src/
├── components/
│   ├── ui/                     # Shadcn components
│   ├── nodes/                  # Custom React Flow nodes
│   │   ├── StepNode.tsx
│   │   └── ToolNode.tsx
│   ├── edges/                  # Custom edges (if needed)
│   ├── panels/                 # Side panels and dialogs
│   │   ├── NodeEditPanel.tsx
│   │   ├── FlowPanel.tsx
│   │   └── ExportPanel.tsx
│   ├── context-menu/           # Context menu components
│   └── layout/                 # Main layout components
├── hooks/                      # Custom hooks
├── lib/                        # Utilities and helpers
├── models/                     # TypeScript types
└── stores/                     # State management
```

## 🚀 Implementation Phases

### Phase 1: Environment Setup & Basic Infrastructure

1. **Setup Shadcn/ui**
   - Install dependencies and configure components
   - Setup minimal black/white theme
   - Create basic UI components (Button, Dialog, Input, etc.)

2. **Setup React Flow**
   - Configure React Flow with basic nodes
   - Implement straight-line edges (not curved)
   - Setup viewport controls

3. **Basic Project Structure**
   - Create folder structure
   - Setup TypeScript types for Nomos entities
   - Create basic layout components

### Phase 2: Node System Implementation

1. **Node Types**
   - **StepNode**: Represents Nomos steps with edit capabilities
   - **ToolNode**: Represents available tools

2. **Node Features**
   - Minimal, elegant design with black/white theme
   - Edit button that opens configuration dialog
   - Proper handle management for connections
   - Drag and drop functionality
   - Node validation and error states

3. **Node Edit Dialogs**
   - Step configuration (step_id, tools, routes, persona, etc.)
   - Tool configuration (name, description, parameters)
   - Form validation and real-time updates

### Phase 3: Connection & Flow Management

1. **Connection System**
   - Straight-line connections between nodes
   - Directional step-to-step connections
   - Connection validation rules
   - Handle positioning and management

2. **Context Menu**
   - Right-click to add new nodes
   - Edit existing nodes
   - Delete nodes/connections
   - Copy/paste functionality

3. **Auto-arrange**
   - Algorithm to arrange nodes without overlaps
   - Hierarchical layout for step flows
   - Maintain readability and logical flow

### Phase 4: Flow Grouping & Advanced Features

1. **Flow Grouping**
   - Visual grouping of steps into flows
   - Flow-level configuration
   - Drag entire flows
   - Flow entry/exit point management

2. **Advanced Editing**
   - Multi-select nodes
   - Bulk operations
   - Undo/redo functionality
   - Search and filter nodes

### Phase 5: Import/Export System

1. **YAML Export**
   - Convert visual flow to config.agent.yaml
   - Validate generated configuration
   - Pretty formatting and comments

2. **YAML Import**
   - Parse existing config.agent.yaml files
   - Generate visual representation
   - Handle missing or invalid configurations
   - Preserve existing configurations

### Phase 6: Polish & UX Enhancements

1. **UI/UX Improvements**
   - Smooth animations and transitions
   - Loading states and feedback
   - Keyboard shortcuts
   - Accessibility improvements

2. **Validation & Error Handling**
   - Real-time configuration validation
   - Visual error indicators
   - Helpful error messages and suggestions

## 📋 Detailed Component Specifications

### Node Components

#### StepNode
```typescript
interface StepNodeData {
  step_id: string;
  persona?: string;
  tools?: string[];
  routes?: Record<string, string>;
  answer_model?: string;
  max_iter?: number;
}
```

#### ToolNode
```typescript
interface ToolNodeData {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
  package_reference?: string;
}
```

### Key Features Implementation

#### Context Menu
- Position-aware context menu
- Add Step Node / Add Tool Node options
- Edit Node option for existing nodes
- Delete option with confirmation
- Auto-arrange option

#### Auto-arrange Algorithm
- Use force-directed layout or hierarchical layout
- Consider node relationships and flow direction
- Maintain minimum spacing between nodes
- Preserve user's manual positioning when possible

#### Connection Validation
- Ensure only valid step-to-step connections
- Prevent circular dependencies
- Validate flow entry/exit points
- Visual feedback for invalid connections

## 🎨 Design System

### Color Palette (Black & White Only)
```css
:root {
  /* Pure colors */
  --pure-white: #ffffff;
  --pure-black: #000000;

  /* Greys */
  --grey-50: #fafafa;
  --grey-100: #f5f5f5;
  --grey-200: #e5e5e5;
  --grey-300: #d4d4d4;
  --grey-400: #a3a3a3;
  --grey-500: #737373;
  --grey-600: #525252;
  --grey-700: #404040;
  --grey-800: #262626;
  --grey-900: #171717;
}
```

### Node Design Principles
- Clean, minimal rectangular nodes
- Clear typography with proper hierarchy
- Subtle shadows for depth
- Consistent spacing and sizing
- Elegant hover and selection states

## 🔧 Technical Implementation Details

### State Management
```typescript
interface AppState {
  nodes: Node[];
  edges: Edge[];
  flows: FlowGroup[];
  selectedNodes: string[];
  editingNode: string | null;
  config: NomosConfig;
}
```

### Key Hooks
- `useFlowBuilder` - Main flow management
- `useConfigExport` - YAML export/import logic
- `useAutoArrange` - Node arrangement algorithm
- `useContextMenu` - Context menu management

### Integration Points
- YAML parser for Nomos configuration
- Validation engine for configuration integrity
- Export system with proper formatting
- Import system with error handling
