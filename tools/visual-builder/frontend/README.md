# Nomos Visual Flow Builder

A powerful visual interface for building and configuring Nomos AI agent workflows. This tool provides an intuitive drag-and-drop interface for creating complex conversational flows with integrated tools and step-by-step routing logic.

## Features

- **Visual Flow Design**: Drag-and-drop interface for creating agent conversation flows
- **Step-based Architecture**: Define conversation steps with descriptions, tools, and routing conditions
- **Tool Integration**: Visual connections between steps and available tools with automatic configuration
- **Flow Grouping**: Organize related steps into logical groups for better workflow management
- **Real-time Validation**: Automatic validation of flow connections and configurations
- **YAML Export/Import**: Export flows to Nomos-compatible YAML configuration files
- **Undo/Redo Support**: Full history management for flow editing operations
- **Auto-arrangement**: Intelligent layout algorithms for clean flow visualization

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn/pnpm
- Modern web browser with ES6+ support

### Quick Start with Docker

The fastest way to get started is using Docker:

```bash
# Pull and run from Docker Hub (when available)
docker run -p 3000:80 nomos/visual-builder

# Or build locally
git clone <repository-url>
cd tools/visual-builder
npm run docker:build
npm run docker:run
```

The application will be available at `http://localhost:3000`

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development

```bash
# Start development server with hot reload
npm run dev
```

The application will be available at `http://localhost:5173`

## Usage

### Creating Flows

1. **Add Step Nodes**: Right-click on the canvas and select "Add Step Node" to create conversation steps
2. **Add Tool Nodes**: Add tools that your agent can use during conversations
3. **Create Connections**:
   - Connect steps to other steps using route edges (purple) to define conversation flow
   - Connect steps to tools using tool edges (blue) to make tools available to specific steps
4. **Configure Steps**: Double-click nodes or use the edit button to configure step details
5. **Group Related Steps**: Select multiple steps and use the group function to organize them into flows

### Real-time Integration

The visual builder features automatic integration between visual connections and step configurations:

- **Tool Connections**: When you connect a step to a tool visually, the tool is automatically added to the step's `available_tools` list
- **Route Connections**: Visual route connections automatically populate the step's `routes` configuration
- **Live Updates**: Changes to visual connections immediately reflect in the step edit dialogs

### Export and Import

- **Export**: Use the export function to generate Nomos-compatible YAML configuration files
- **Import**: Import existing YAML configurations to continue editing flows visually
- **Agent Configuration**: Set agent name, persona, and other metadata through the export dialog

## Project Structure

## Project Structure

```
src/
├── components/           # React components
│   ├── FlowBuilder.tsx  # Main flow builder component
│   ├── nodes/           # Custom node types
│   ├── edges/           # Custom edge types
│   ├── dialogs/         # Edit dialogs for nodes
│   └── ui/              # Reusable UI components
├── context/             # React context providers
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── models/              # Data models and validation
```

## Key Components

- **FlowBuilder**: Main application component managing the flow canvas
- **StepNode**: Visual representation of conversation steps
- **ToolNode**: Visual representation of available tools
- **RouteEdge**: Connections between steps showing conversation flow
- **ToolEdge**: Connections between steps and tools
- **StepEditDialog**: Configuration interface for step properties
- **FlowProvider**: Context provider for sharing flow state

## Docker Deployment

### Building the Docker Image

```bash
# Build the application and Docker image
npm run docker:build

# Or manually
npm run build
docker build -t nomos-visual-builder .
```

### Running with Docker

```bash
# Run locally
docker run -p 3000:80 nomos-visual-builder

# Run in background
docker run -d -p 3000:80 --name visual-builder nomos-visual-builder

# Stop the container
docker stop visual-builder
```

### Docker Hub

```bash
# Pull from Docker Hub (when published)
docker pull nomos/visual-builder
docker run -p 3000:80 nomos/visual-builder
```

## Development Notes

### Architecture

The application is built with:
- **React Flow**: Core flow visualization and interaction
- **TypeScript**: Type safety and development experience
- **Vite**: Fast development server and build tool
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives

### Key Features Implementation

- **Real-time Integration**: Uses React Context and useMemo for automatic updates between visual connections and step configurations
- **Undo/Redo**: Custom hook with deep cloning for reliable history management
- **Auto-layout**: Dagre-based algorithm for intelligent node positioning
- **YAML Integration**: Bidirectional conversion between visual flows and Nomos configuration format

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Integration with Nomos

This visual builder generates configuration files compatible with the Nomos AI agent framework. The exported YAML files can be used directly with Nomos to run the designed conversational flows.

## License

This project is part of the Nomos ecosystem. See the main Nomos repository for license information.
