import { useState, useEffect, useRef } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { startAgent, sendMessage, stopAgent } from '../../lib/pyAgent';
import { exportToYaml } from '../../utils/nomosYaml';

interface ChatPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  agentName: string;
  persona: string;
}

export function ChatPreviewDialog({ open, onClose, nodes, edges, agentName, persona }: ChatPreviewDialogProps) {
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const [envText, setEnvText] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseEnv = (text: string) => {
    const env: Record<string, string> = {};
    text.split('\n').forEach(line => {
      const [k, v] = line.split('=');
      if (k && v) env[k.trim()] = v.trim();
    });
    return env;
  };

  const start = () => {
    const yaml = exportToYaml(nodes, edges, agentName, persona).yaml;
    startAgent(yaml, { provider, model }, parseEnv(envText));
  };

  useEffect(() => {
    if (open) {
      setMessages([]);
      start();
    } else {
      stopAgent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);


  const handleSave = () => {
    start();
  };

  const handleSend = async () => {
    const msg = inputRef.current?.value || '';
    if (!msg) return;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    const reply = await sendMessage(msg).catch(() => 'Error');
    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl w-full">
        <DialogHeader>
          <DialogTitle>Preview Chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>LLM Provider</Label>
            <Input value={provider} onChange={e => setProvider(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Input value={model} onChange={e => setModel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Environment Variables</Label>
            <Textarea value={envText} onChange={e => setEnvText(e.target.value)} rows={3} placeholder="KEY=value" />
          </div>
          <Button onClick={handleSave}>Save & Restart</Button>
          <div className="border rounded h-48 overflow-y-auto p-2 bg-gray-50 text-sm space-y-1">
            {messages.map((m, i) => (
              <div key={i}><b>{m.role}:</b> {m.content}</div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input ref={inputRef} placeholder="Type a message" className="flex-grow" />
            <Button onClick={handleSend}>Send</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
