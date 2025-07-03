import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ChevronDown, ChevronUp, Send, X, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { exportToYaml } from '../utils/nomosYaml';
import * as yaml from 'js-yaml';
import { useDraggable } from '../hooks/useDraggable';
import ReactMarkdown from 'react-markdown';
import type { SessionState } from '../types';

interface EnvVar { key: string; value: string }

interface BackendResponse {
  reasoning: string[];
  action: string;
  response: string;
  step_id: string;
  [key: string]: any;
}

export interface ChatPopupRef {
  reset: () => void;
}

interface ChatPopupProps {
  open: boolean;
  onClose: () => void;
  nodes: any[];
  edges: any[];
  agentName: string;
  persona: string;
  onHighlightNode?: (nodeId: string | null) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string[];
  isStreaming?: boolean;
  state?: {
    current_step_id?: string;
    flow_id?: string;
  };
}

const STORAGE_KEY = 'nomos-chat-state';

// Environment configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const DISABLE_FILE_UPLOAD = import.meta.env.VITE_DISABLE_FILE_UPLOAD === 'true';

// Component for rendering assistant message with collapsible reasoning
interface AssistantMessageProps {
  content: string;
  reasoning?: string[];
  state?: {
    current_step_id?: string;
    flow_id?: string;
  };
  onHighlightStep?: (stepId: string | null) => void;
}

const AssistantMessage = ({ content, reasoning, state, onHighlightStep }: AssistantMessageProps) => {
  const [showReasoning, setShowReasoning] = useState(false);

  // Debug logging
  console.log('AssistantMessage received state:', state);

  // Handle node highlighting on hover
  const handleStepHover = (stepId: string | null) => {
    if (onHighlightStep) {
      onHighlightStep(stepId);
    }
  };

  return (
    <div className="bg-white border dark:border-gray-600 mr-auto shadow-sm p-3 rounded-lg max-w-[85%]" style={{ backgroundColor: 'var(--background)' }}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs opacity-70 font-medium text-gray-900 dark:text-gray-100">Assistant</div>

        {/* State Information */}
        {state && (state.current_step_id || state.flow_id) && (
          <div className="flex items-center gap-2 text-xs">
            {state.current_step_id && (
              <span
                className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-mono cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                onMouseEnter={() => handleStepHover(state.current_step_id!)}
                onMouseLeave={() => handleStepHover(null)}
                title="Current Step (hover to highlight)"
              >
                Step: {state.current_step_id}
              </span>
            )}
            {state.flow_id && (
              <span
                className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full font-mono cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                onMouseEnter={() => handleStepHover(state.flow_id!)}
                onMouseLeave={() => handleStepHover(null)}
                title="Current Flow (hover to highlight)"
              >
                Flow: {state.flow_id}
              </span>
            )}
          </div>
        )}
      </div>

      {reasoning && reasoning.length > 0 && (
        <div className="mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReasoning(!showReasoning)}
            className="flex items-center gap-1 p-0 h-auto text-xs font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {showReasoning ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Reasoning ({reasoning.length} steps)
          </Button>

          {showReasoning && (
            <div className="mt-2 p-2 bg-gray-50 rounded border-l-2 border-blue-200 dark:border-blue-500" style={{ backgroundColor: 'var(--secondary)' }}>
              <div className="space-y-1">
                {reasoning.map((step, index) => (
                  <div key={index} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <span className="text-blue-500 dark:text-blue-400 font-mono min-w-[20px]">{index + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown
          components={{
            // Custom styles for markdown elements with dark mode support
            p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-900 dark:text-gray-100">{children}</p>,
            h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-bold mb-2 text-gray-900 dark:text-gray-100">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-bold mb-1 text-gray-900 dark:text-gray-100">{children}</h3>,
            code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-900 dark:text-gray-100" style={{ backgroundColor: 'var(--secondary)' }}>{children}</code>,
            pre: ({ children }) => <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto text-gray-900 dark:text-gray-100" style={{ backgroundColor: 'var(--secondary)' }}>{children}</pre>,
            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-gray-900 dark:text-gray-100">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-gray-900 dark:text-gray-100">{children}</ol>,
            li: ({ children }) => <li className="text-sm text-gray-900 dark:text-gray-100">{children}</li>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export const ChatPopup = forwardRef<ChatPopupRef, ChatPopupProps>(function ChatPopup({
  open,
  onClose,
  nodes,
  edges,
  agentName,
  persona,
  onHighlightNode,
}, ref) {
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [showEnv, setShowEnv] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionData, setSessionData] = useState<SessionState | undefined>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { position, onMouseDown, setPosition } = useDraggable({ x: 0, y: 0 });

  // Create a function to map step IDs to node IDs for highlighting
  const handleStepHighlight = useCallback((stepId: string | null) => {
    if (onHighlightNode) {
      if (stepId) {
        // Find the node ID that corresponds to this step ID
        const stepNode = nodes.find((node: any) =>
          node.type === 'step' && node.data?.step_id === stepId
        );
        onHighlightNode(stepNode ? stepNode.id : null);
      } else {
        onHighlightNode(null);
      }
    }
  }, [nodes, onHighlightNode]);

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
        if (parsed.sidebarCollapsed) setSidebarCollapsed(parsed.sidebarCollapsed);
        // Don't restore loading state
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const state = { provider, model, envVars, messages, sessionData, sidebarCollapsed };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [provider, model, envVars, messages, sessionData, sidebarCollapsed]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, []);

  // Remove the resetBackend function as it's no longer needed
  const uploadTools = useCallback(async (files: FileList) => {
    if (DISABLE_FILE_UPLOAD) {
      console.info('Tool upload is currently disabled. The hosted version supports only Package, CrewAI, and Langchain Tools. To enable tool upload, please run the visual builder locally.');
      return;
    }

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
      setIsLoading(true);
      if (files && !DISABLE_FILE_UPLOAD) {
        await uploadTools(files);
      }
      // No need to start a server anymore - just mark as ready
      setIsLoading(false);
    } catch (error) {
      setMessages([{ role: 'assistant', content: `Error: ${error instanceof Error ? error.message : String(error)}` }]);
      setIsLoading(false);
    }
  }, [uploadTools]);

  useImperativeHandle(ref, () => ({
    reset: () => {
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

  // Clear chat function - resets messages and session data
  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionData(undefined);
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
      streamingTimeoutRef.current = null;
    }
  }, []);

  // Stream text animation function
  const streamText = useCallback((text: string, messageIndex: number, reasoning?: string[], state?: any) => {
    let currentIndex = 0;

    const streamNextChar = () => {
      if (currentIndex <= text.length) {
        setMessages(prevMessages =>
          prevMessages.map((msg, idx) =>
            idx === messageIndex
              ? {
                  ...msg,
                  content: text.substring(0, currentIndex),
                  reasoning,
                  state,
                  isStreaming: currentIndex < text.length
                }
              : msg
          )
        );
        currentIndex++;

        if (currentIndex <= text.length) {
          // Adjust speed based on character - faster for spaces, slower for punctuation
          // Increased speed by 3x (reduced delays)
          const char = text[currentIndex - 1];
          const delay = char === ' ' ? 7 : char.match(/[.!?]/) ? 33 : 10;

          streamingTimeoutRef.current = setTimeout(streamNextChar, delay);
        }
      }
    };

    streamNextChar();
  }, []);

  // Typing indicator component
  const TypingIndicator = () => (
    <div className="bg-white border dark:border-gray-600 mr-auto shadow-sm p-3 rounded-lg max-w-[85%]" style={{ backgroundColor: 'var(--background)' }}>
      <div className="text-xs opacity-70 mb-1 font-medium text-gray-900 dark:text-gray-100">Assistant</div>
      <div className="flex items-center space-x-1">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">typing...</span>
      </div>
    </div>
  );

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;

    // Add user message first
    const userMessage: Message = { role: 'user', content: input };
    setMessages(m => [...m, userMessage]);
    const currentInput = input;
    setInput('');

    try {
      setIsLoading(true);
      setIsTyping(true);

      // Build the agent config from the flow
      const result = exportToYaml(nodes, edges, agentName, persona);
      const lines = result.yaml.split('\n');
      const body = lines.slice(4).join('\n');
      const config = (yaml as any).load(body) as any;
      config.llm = { provider, model };

      // Prepare the serverless chat request
      const requestPayload = {
        agent_config: config,
        chat_request: {
          user_input: currentInput,
          session_data: sessionData || undefined
        },
        env_vars: Object.fromEntries(envVars.map(v => [v.key, v.value])),
        verbose: false
      };

      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status} ${response.statusText}`);
      }

      const res = await response.json();
      console.log('Backend response:', res);
      console.log('Session data:', res.session_data);
      setSessionData(res.session_data);
      setIsTyping(false);

      // Parse the response to extract reasoning and response content
      let parsedResponse: BackendResponse | null = null;
      let assistantContent: string;
      let reasoning: string[] | undefined;

      try {
        // Try to parse the response as JSON to extract reasoning and response
        if (typeof res.response === 'string') {
          parsedResponse = JSON.parse(res.response);
        } else if (typeof res.response === 'object' && res.response !== null) {
          parsedResponse = res.response as BackendResponse;
        }

        if (parsedResponse && parsedResponse.reasoning && parsedResponse.response) {
          assistantContent = parsedResponse.response;
          reasoning = parsedResponse.reasoning;
        } else {
          // Fallback to displaying the raw response
          assistantContent = typeof res.response === 'string' ? res.response : JSON.stringify(res.response, null, 2);
        }
      } catch (parseError) {
        // If parsing fails, display the raw response
        assistantContent = typeof res.response === 'string' ? res.response : JSON.stringify(res.response, null, 2);
      }

      // Add assistant message with empty content for streaming
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        reasoning,
        isStreaming: true,
        state: res.session_data  // Use session_data from backend response
      };

      console.log('Assistant message state:', assistantMessage.state);
      setMessages(m => [...m, assistantMessage]);

      // Start streaming the response
      const messageIndex = messages.length + 1; // +1 because we already added user message
      streamText(assistantContent, messageIndex, reasoning, res.session_data);

    } catch (error) {
      setIsTyping(false);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
      setMessages(m => [...m, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, sessionData, nodes, edges, agentName, persona, provider, model, envVars, messages.length, streamText]);

  const addEnv = () => setEnvVars(v => [...v, { key: '', value: '' }]);
  const updateEnv = (index: number, key: string, value: string) => {
    setEnvVars(v => v.map((item, i) => (i === index ? { key, value } : item)));
  };
  const removeEnv = (index: number) => setEnvVars(v => v.filter((_, i) => i !== index));

  if (!open) return null;

  return (
    <>
      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `}
      </style>
      <div
        className="fixed z-50 bg-white border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
        style={{
          backgroundColor: 'var(--background)',
          left: position.x,
          top: position.y,
          width: sidebarCollapsed ? '480px' : '780px',
          height: '600px'
        }}
      >
      <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 cursor-move bg-gray-50 rounded-t-lg" style={{ backgroundColor: 'var(--secondary)' }} onMouseDown={onMouseDown}>
        <h3 className="text-sm font-medium">Chat Preview</h3>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              className="h-7 px-2 text-xs"
            >
              Clear
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="flex h-[calc(100%-40px)] relative">
        {/* Left Sidebar - Configuration */}
        {!sidebarCollapsed && (
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 p-3 space-y-3 overflow-y-auto">
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

            {!DISABLE_FILE_UPLOAD && (
              <>
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
                  {isLoading ? 'Uploading...' : 'Upload Tools'}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Floating Collapse/Expand Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`absolute top-2 z-10 h-8 w-8 p-0 bg-white border border-gray-200 dark:border-gray-600 rounded-full shadow-sm hover:bg-gray-50 ${
            sidebarCollapsed ? 'left-0' : 'left-64'
          } transition-all duration-200`}
          style={{
            backgroundColor: 'var(--background)',
            transform: sidebarCollapsed
              ? 'translateX(-50%)'
              : 'translateX(-50%)'
          }}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </Button>

        {/* Right Side - Chat */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-3 overflow-y-auto bg-muted text-sm space-y-2">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-muted-foreground p-4">
                Upload your tools and start chatting with your agent
              </div>
            )}
            {isLoading && (
              <div className="text-center text-muted-foreground p-4">
                Processing your request...
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                {m.role === 'user' ? (
                  <div className="bg-blue-500 text-white ml-auto p-3 rounded-lg max-w-[85%]">
                    <div className="text-xs opacity-70 mb-1 font-medium">You</div>
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <AssistantMessage
                    content={m.content}
                    reasoning={m.reasoning}
                    state={m.state}
                    onHighlightStep={handleStepHighlight}
                  />
                )}
              </div>
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 p-3">
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
                disabled={isLoading}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              />
              <Button
                variant="default"
                size="icon"
                onClick={sendMessage}
                disabled={isLoading}
                className="h-16 w-12"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
});

ChatPopup.displayName = 'ChatPopup';
