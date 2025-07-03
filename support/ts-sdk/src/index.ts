import fetch from 'node-fetch';

export interface Message {
  role: string;
  content: string;
}

export interface Summary {
  summary: string[];
}

export interface StepIdentifier {
  step_id: string;
}

export interface FlowContext {
  flow_id: string;
  [key: string]: unknown;
}

export interface FlowState {
  flow_id: string;
  flow_context: FlowContext;
  flow_memory_context: Array<Message | Summary | StepIdentifier>;
}

export interface SessionResponse {
  session_id: string;
  message: Record<string, unknown>;
}

export interface SessionData {
  session_id: string;
  current_step_id: string;
  history: Array<Message | Summary | StepIdentifier>;
  flow_state?: FlowState;
}

export interface ChatRequest {
  user_input?: string;
  session_data?: SessionData;
}

export interface ChatResponse {
  response: Record<string, unknown>;
  tool_output?: string | null;
  session_data: SessionData;
}

export class NomosClient {
  constructor(private baseUrl: string = 'http://localhost:8000') {}

  async createSession(initiate = false): Promise<SessionResponse> {
    const url = new URL('/session', this.baseUrl);
    if (initiate) url.searchParams.set('initiate', 'true');
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SessionResponse;
  }

  async sendMessage(sessionId: string, message: string): Promise<SessionResponse> {
    const url = new URL(`/session/${sessionId}/message`, this.baseUrl);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SessionResponse;
  }

  async endSession(sessionId: string): Promise<{ message: string }> {
    const url = new URL(`/session/${sessionId}`, this.baseUrl);
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as { message: string };
  }

  async getSessionHistory(sessionId: string): Promise<{ session_id: string; history: Array<Message | Summary | StepIdentifier> }> {
    const url = new URL(`/session/${sessionId}/history`, this.baseUrl);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as { session_id: string; history: Array<Message | Summary | StepIdentifier> };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const url = new URL('/chat', this.baseUrl);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as ChatResponse;
  }
}
