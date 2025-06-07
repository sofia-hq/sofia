# Nomos TypeScript SDK

A small client for interacting with a Nomos agent server via REST APIs.

## Installation

```bash
npm install nomos-sdk
```

## Stateless Usage

```ts
import { NomosClient } from 'nomos-sdk';

const client = new NomosClient('http://localhost:8000');
const { response, session_data } = await client.chat({ user_input: 'Hello' });
console.log(response); // agent reply

// Use the returned session_data to continue the conversation
const followUp = await client.chat({
  user_input: 'Tell me more',
  session_data,
});
console.log(followUp.response);
```

## Stateful Usage

```ts
import { NomosClient } from 'nomos-sdk';

const client = new NomosClient();
const { session_id } = await client.createSession(true);
await client.sendMessage(session_id, 'How are you?');
const history = await client.getSessionHistory(session_id);
await client.endSession(session_id);
```
