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

  it('sendMessage posts message content', async () => {
    const resp: SessionResponse = { session_id: '1', message: { ok: true } };
    nock(base)
      .post('/session/1/message', { content: 'hello' } as unknown as DataMatcherMap)
      .reply(200, resp);
    const result = await client.sendMessage('1', 'hello');
    expect(result).toEqual(resp);
  });

  it('endSession deletes session', async () => {
    const resp = { message: 'ended' };
    nock(base).delete('/session/1').reply(200, resp);
    const result = await client.endSession('1');
    expect(result).toEqual(resp);
  });

  it('getSessionHistory returns history', async () => {
    const resp = { session_id: '1', history: [{ role: 'user', content: 'hi' }] };
    nock(base).get('/session/1/history').reply(200, resp);
    const result = await client.getSessionHistory('1');
    expect(result).toEqual(resp);
  });
});
