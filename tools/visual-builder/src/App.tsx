import { ReactFlowProvider } from '@xyflow/react';
import FlowBuilder from './components/FlowBuilder-simple';
import '@xyflow/react/dist/style.css';

export default function App() {
  return (
    <div className="h-screen w-screen bg-white">
      <ReactFlowProvider>
        <FlowBuilder />
      </ReactFlowProvider>
    </div>
  );
}
