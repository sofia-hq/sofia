# Nomos TypeScript/JavaScript SDK

[![npm version](https://badge.fury.io/js/nomos-sdk.svg)](https://www.npmjs.com/package/nomos-sdk)
[![CI](https://github.com/dowhiledev/nomos/workflows/CI%20-%20TypeScript%20SDK/badge.svg)](https://github.com/dowhiledev/nomos/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful TypeScript/JavaScript SDK for interacting with Nomos agents. Build conversational AI applications with ease.

## 🚀 Quick Start

### Installation

```bash
npm install nomos-sdk
```

> **Note:** This package is published as an ES module. For CommonJS projects, use dynamic imports:
> ```javascript
> // ES Module (recommended)
> import { NomosClient } from 'nomos-sdk';
>
> // CommonJS (use dynamic import)
> const { NomosClient } = await import('nomos-sdk');
> ```

### Basic Usage

```typescript
import { NomosClient } from 'nomos-sdk';

// Create a client
const client = new NomosClient('http://localhost:8000');

// Start a conversation
const session = await client.createSession(true);
console.log('Agent:', session.message);

// Send messages
const response = await client.sendMessage(session.session_id, 'Hello!');
console.log('Response:', response.message);

// End session
await client.endSession(session.session_id);
```
## 📖 Features

- **Full TypeScript Support** - Complete type safety and IntelliSense
- **Session Management** - Create, manage, and clean up conversation sessions
- **Direct Chat API** - Stateless chat interactions
- **Error Handling** - Comprehensive error handling and recovery
- **Node.js & Browser** - Works in both environments
- **Zero Dependencies** - Minimal footprint with only essential dependencies

## 🔧 Usage Examples

### Stateless Chat

```typescript
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

### Stateful Sessions

```typescript
import { NomosClient } from 'nomos-sdk';

const client = new NomosClient();
const { session_id } = await client.createSession(true);
await client.sendMessage(session_id, 'How are you?');
const history = await client.getSessionHistory(session_id);
await client.endSession(session_id);
```

## 📝 Complete Examples

Check out the [complete examples](https://github.com/dowhiledev/nomos/tree/main/examples/typescript-sdk-example) including:

- **Basic Usage** - Simple request/response examples
- **Advanced Patterns** - Production-ready patterns
- **Interactive Chat** - CLI chat interface
- **Error Handling** - Comprehensive error recovery
- **Multi-session Management** - Handle multiple conversations

## 🏗️ Development

### Building from Source

```bash
git clone https://github.com/dowhiledev/nomos.git
cd nomos/sdk/ts
npm install
npm run build
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](https://github.com/dowhiledev/nomos/blob/main/CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- [Documentation](https://github.com/dowhiledev/nomos)
- [Examples](https://github.com/dowhiledev/nomos/tree/main/examples/typescript-sdk-example)
- [Issues](https://github.com/dowhiledev/nomos/issues)
- [npm Package](https://www.npmjs.com/package/nomos-sdk)
