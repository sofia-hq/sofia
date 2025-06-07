import { describe, it, expect, beforeEach } from 'vitest';
import nock, { type DataMatcherMap } from 'nock';
import { NomosClient, ChatRequest, ChatResponse, SessionResponse } from '../src/index.js';

describe('NomosClient', () => {
  const base = 'http://localhost:8000';
  let client: NomosClient;

  beforeEach(() => {
    client = new NomosClient(base);
  });

  it('createSession sends proper request', async () => {
    const resp: SessionResponse = { session_id: '1', message: { ok: true } };
    nock(base).post('/session').reply(200, resp);
    const result = await client.createSession();
    expect(result).toEqual(resp);
  });

  it('chat sends request body', async () => {
    const req: ChatRequest = { user_input: 'hi' };
    const resp: ChatResponse = {
      response: { action: 'answer', response: 'hello' },
      tool_output: null,
      session_data: { session_id: '1', current_step_id: 'start', history: [] }
    };
    nock(base).post('/chat', req as unknown as DataMatcherMap).reply(200, resp);
    const result = await client.chat(req);
    expect(result).toEqual(resp);
  });
});
