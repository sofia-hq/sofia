import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ChevronDown, ChevronUp, Send, X, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { exportToYaml } from '../utils/nomosYaml';
import * as yaml from 'js-yaml';
import { NomosClient, SessionData } from 'nomos-sdk';
import type { Node, Edge } from '@xyflow/react';
import { useDraggable } from '../hooks/useDraggable';

interface EnvVar { key: string; value: string }

export interface ChatPopupRef {
  reset: () => void;
}

interface ChatPopupProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  agentName: string;
  persona: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'nomos-chat-state';

// Environment configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const ChatPopup = forwardRef<ChatPopupRef, ChatPopupProps>(function ChatPopup({
  open,
  onClose,
  nodes,
  edges,
  agentName,
  persona,
}, ref) {
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [showEnv, setShowEnv] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionData, setSessionData] = useState<SessionData | undefined>();
  const [isConfigured, setIsConfigured] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const clientRef = useRef<NomosClient>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { position, onMouseDown, setPosition } = useDraggable({ x: 0, y: 0 });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.provider) setProvider(parsed.provider);
        if (parsed.model) setModel(parsed.model);
        if (Array.isArray(parsed.envVars)) setEnvVars(parsed.envVars);
        if (Array.isArray(parsed.messages)) setMessages(parsed.messages);
        if (parsed.sessionData) setSessionData(parsed.sessionData);
        if (parsed.isConfigured) setIsConfigured(parsed.isConfigured);
        if (parsed.sidebarCollapsed) setSidebarCollapsed(parsed.sidebarCollapsed);
        // Don't restore loading state
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const state = { provider, model, envVars, messages, sessionData, isConfigured, sidebarCollapsed };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [provider, model, envVars, messages, sessionData, isConfigured, sidebarCollapsed]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const resetBackend = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = exportToYaml(nodes, edges, agentName, persona);
      const lines = result.yaml.split('\n');
      const header = lines.slice(0, 4);
      const body = lines.slice(4).join('\n');
      const config = yaml.load(body) as any;
      config.llm = { provider, model };
      const finalYaml = [...header, yaml.dump(config, { indent: 2, lineWidth: 100, noRefs: true, sortKeys: false, styles: { '!!str': 'literal' } })].join('\n');

      const resetResponse = await fetch(`${BACKEND_URL}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml: finalYaml, env: Object.fromEntries(envVars.map(v => [v.key, v.value])) }),
      });

      if (!resetResponse.ok) {
        throw new Error(`Reset failed: ${resetResponse.status} ${resetResponse.statusText}`);
      }

      clientRef.current = new NomosClient(BACKEND_URL);
      setIsConfigured(true);
    } catch (error) {
      setMessages([{ role: 'assistant', content: `Error: ${error instanceof Error ? error.message : String(error)}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [nodes, edges, agentName, persona, provider, model, envVars]);

  const uploadTools = useCallback(async (files: FileList) => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      if (file.name.endsWith('.py')) {
        formData.append('files', file);
      }
    });

    if (formData.has('files')) {
      const response = await fetch(`${BACKEND_URL}/upload-tools`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
    }
  }, []);

  const saveAndStart = useCallback(async (files?: FileList) => {
    try {
      if (files) {
        await uploadTools(files);
      }
      await resetBackend();
    } catch (error) {
      setMessages([{ role: 'assistant', content: `Error: ${error instanceof Error ? error.message : String(error)}` }]);
    }
  }, [uploadTools, resetBackend]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      setIsConfigured(false);
      setMessages([]);
      setSessionData(undefined);
    }
  }), []);

  useEffect(() => {
    if (open) {
      setPosition({
        x: window.innerWidth - 800, // Wider for 2-column layout
        y: window.innerHeight - 700,
      });
    }
  }, [open, setPosition]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !clientRef.current || !isConfigured) return;

    try {
      const req = {
        user_input: input,
        session_data: sessionData || undefined
      };

      const res = await clientRef.current.chat(req);

      setSessionData(res.session_data);
      setMessages(m => [
        ...m,
        { role: 'user', content: input },
        { role: 'assistant', content: JSON.stringify(res.response, null, 2) }
      ]);
      setInput('');
    } catch (error) {
      setMessages(m => [
        ...m,
        { role: 'user', content: input },
        { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : String(error)}` }
      ]);
      setInput('');
    }
  }, [input, sessionData, isConfigured]);

  const addEnv = () => setEnvVars(v => [...v, { key: '', value: '' }]);
  const updateEnv = (index: number, key: string, value: string) => {
    setEnvVars(v => v.map((item, i) => (i === index ? { key, value } : item)));
  };
  const removeEnv = (index: number) => setEnvVars(v => v.filter((_, i) => i !== index));

  if (!open) return null;

  return (
    <div
      className="fixed z-50 bg-white border rounded-lg shadow-xl"
      style={{
        left: position.x,
        top: position.y,
        width: sidebarCollapsed ? '480px' : '780px',
        height: '600px'
      }}
    >
      <div className="flex items-center justify-between p-2 border-b cursor-move bg-gray-50 rounded-t-lg" onMouseDown={onMouseDown}>
        <h3 className="text-sm font-medium">Chat Preview</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
          <X className="w-3 h-3" />
        </Button>
      </div>
      <div className="flex h-[calc(100%-40px)]">
        {/* Left Sidebar - Configuration */}
        {!sidebarCollapsed && (
          <div className="w-64 border-r p-3 space-y-3 overflow-y-auto">
            <div className="space-y-2">
              <label className="text-xs font-medium">Provider</label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="w-full text-xs" size="sm">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="mistral">Mistral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">Model</label>
              <Input
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="Model name"
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEnv(!showEnv)}
                className="flex items-center gap-1 p-0 h-auto text-xs font-medium"
              >
                {showEnv ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Environment Variables
              </Button>
              {showEnv && (
                <div className="space-y-2">
                  {envVars.map((ev, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <Input
                        value={ev.key}
                        onChange={e => updateEnv(i, e.target.value, ev.value)}
                        placeholder="KEY"
                        className="text-xs h-7 flex-1"
                      />
                      <span className="text-xs text-muted-foreground">=</span>
                      <Input
                        value={ev.value}
                        onChange={e => updateEnv(i, ev.key, e.target.value)}
                        placeholder="value"
                        className="text-xs h-7 flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEnv(i)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addEnv}
                    className="w-full text-xs h-7 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Variable
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tools-upload" className="text-xs font-medium">
                Tools (.py files)
              </Label>
              <Input
                id="tools-upload"
                type="file"
                multiple
                accept=".py"
                className="text-xs"
              />
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => {
                const fileInput = document.getElementById('tools-upload') as HTMLInputElement;
                saveAndStart(fileInput.files || undefined);
              }}
              className="w-full text-xs"
              disabled={isLoading}
            >
              {isLoading ? 'Starting...' : 'Save & Start'}
            </Button>
          </div>
        )}

        {/* Collapse/Expand Button */}
        <div className="flex flex-col justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-4 p-0 border-l border-r"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3 h-3" />
            )}
          </Button>
        </div>

        {/* Right Side - Chat */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-3 overflow-y-auto bg-muted text-sm space-y-2">
            {!isConfigured && !isLoading && (
              <div className="text-center text-muted-foreground p-4">
                Configure settings and click "Save & Start" to begin chatting
              </div>
            )}
            {isLoading && (
              <div className="text-center text-muted-foreground p-4">
                Starting server and configuring agent...
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`p-3 rounded-lg max-w-[85%] ${m.role === 'user'
                  ? 'bg-blue-500 text-white ml-auto'
                  : 'bg-white border mr-auto shadow-sm'
                }`}>
                <div className="text-xs opacity-70 mb-1 font-medium">
                  {m.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div className="text-sm whitespace-pre-wrap break-words">
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-3">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1 text-sm"
                rows={2}
                disabled={!isConfigured}
                placeholder={isConfigured ? "Type your message... (Enter to send, Shift+Enter for new line)" : "Save & Start first"}
              />
              <Button
                variant="default"
                size="icon"
                onClick={sendMessage}
                disabled={!isConfigured}
                className="h-16 w-12"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ChatPopup.displayName = 'ChatPopup';
