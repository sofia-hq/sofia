import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import type { Node, Edge } from '@xyflow/react';
import { exportToYaml } from '../../utils/nomosYaml';
import { NomosClient } from 'nomos-sdk';

interface PreviewPanelProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
}

interface ChatMessage { role: string; content: string; }

export function PreviewPanel({ open, onClose, nodes, edges }: PreviewPanelProps) {
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [envText, setEnvText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const pyodideRef = useRef<any>(null);
  const clientRef = useRef<NomosClient | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const fetchPatched = useRef(false);

  useEffect(() => {
    if (open) {
      startAgent();
    }
  }, [open]);

  async function patchFetch(py: any) {
    if (fetchPatched.current) return;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith('pyagent://')) {
        const u = new URL(url);
        const path = u.pathname;
        if (path === '/session' && init?.method === 'POST') {
          const initiate = u.searchParams.get('initiate') === 'true';
          const res = await py.runPythonAsync(`import json; json.dumps(create_session(${initiate}))`);
          return new Response(res, { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        const m1 = path.match(/^\/session\/(.+)\/message$/);
        if (m1 && init?.method === 'POST') {
          const body = JSON.parse(init?.body as string);
          const msg = JSON.stringify(body.content);
          const res = await py.runPythonAsync(`import json; json.dumps(send_message('${m1[1]}', ${msg}))`);
          return new Response(res, { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        const m2 = path.match(/^\/session\/(.+)$/);
        if (m2 && init?.method === 'DELETE') {
          const res = await py.runPythonAsync(`import json; json.dumps(end_session('${m2[1]}'))`);
          return new Response(res, { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        const m3 = path.match(/^\/session\/(.+)\/history$/);
        if (m3 && (!init || init.method === 'GET')) {
          const res = await py.runPythonAsync(`import json; json.dumps(get_history('${m3[1]}'))`);
          return new Response(res, { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      }
      return originalFetch(input, init);
    };
    fetchPatched.current = true;
  }

  async function startAgent() {
    const { yaml } = exportToYaml(nodes, edges);
    if (!pyodideRef.current) {
      // @ts-ignore
      pyodideRef.current = await (window as any).loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/' });
      await pyodideRef.current.loadPackage(['micropip']);
      await pyodideRef.current.runPythonAsync("import micropip\nawait micropip.install('nomos')").catch((e: any) => console.log(e));
    }
    const py = pyodideRef.current;
    await patchFetch(py);

    const envLines = envText.split('\n').filter(Boolean);
    const envSetup = envLines.map(line => {
      const idx = line.indexOf('=');
      if (idx === -1) return '';
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      return `os.environ['${key}'] = '${val}'`;
    }).join('\n');

    const escapedYaml = yaml.replace(/"/g, '\\"');
    const code = `import os, uuid, json, yaml\nfrom nomos import Agent, AgentConfig\nfrom nomos.llms.base import LLMBase\nclass DummyLLM(LLMBase):\n    def __init__(self, model):\n        self.model = model\n    def get_output(self, messages, response_format, **kwargs):\n        return response_format(content=f'({self.model}) ' + messages[-1].content)\nconfig = AgentConfig.from_yaml("""${escapedYaml}""")\nllm = DummyLLM('${model}')\nagent = Agent.from_config(config, llm, [])\nsessions = {}\ndef create_session(initiate=False):\n    sid = str(uuid.uuid4())\n    sessions[sid] = agent.create_session(verbose=False)\n    if initiate:\n        dec,_ = sessions[sid].next(None)\n        msg = dec.model_dump(mode='json')\n    else:\n        msg = {'status':'created'}\n    return {'session_id': sid, 'message': msg}\ndef send_message(sid, message):\n    dec,_ = sessions[sid].next(message)\n    return {'session_id': sid, 'message': dec.model_dump(mode='json')}\ndef end_session(sid):\n    sessions.pop(sid, None)\n    return {'message':'ended'}\ndef get_history(sid):\n    sess = sessions[sid]\n    hist = [m.model_dump(mode='json') for m in sess.memory.context]\n    return {'session_id': sid, 'history': hist}`;
    await py.runPythonAsync(envSetup + '\n' + code);
    clientRef.current = new NomosClient('pyagent://');
    sessionIdRef.current = null;
    setMessages([]);
  }

  async function startChat() {
    if (!clientRef.current) return;
    const res = await clientRef.current.createSession(true);
    sessionIdRef.current = res.session_id;
    const msg = (res.message as any).input || JSON.stringify(res.message);
    setMessages([{ role: 'agent', content: msg }]);
  }

  async function sendChat() {
    if (!clientRef.current || !sessionIdRef.current) return;
    const res = await clientRef.current.sendMessage(sessionIdRef.current, chatInput);
    const agentMsg = (res.message as any).input || JSON.stringify(res.message);
    setMessages(m => [...m, { role: 'user', content: chatInput }, { role: 'agent', content: agentMsg }]);
    setChatInput('');
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="fixed right-0 top-0 h-screen w-[400px] max-w-none m-0">
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
          <div className="space-y-2">
            <label className="text-sm font-medium">Provider</label>
            <Input value={provider} onChange={e => setProvider(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            <Input value={model} onChange={e => setModel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Env Vars (KEY=VALUE)</label>
            <Textarea value={envText} onChange={e => setEnvText(e.target.value)} rows={3} />
          </div>
          <Button onClick={startAgent}>Save &amp; Restart</Button>
          <div className="border-t pt-4">
            <div className="h-48 overflow-y-auto border rounded p-2 space-y-1">
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                  <span className="block text-xs text-gray-500">{m.role}</span>
                  <span>{m.content}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input value={chatInput} onChange={e => setChatInput(e.target.value)} className="flex-1" />
              <Button onClick={sessionIdRef.current ? sendChat : startChat}>Send</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
