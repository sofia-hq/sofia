# Nomos TypeScript/JavaScript SDK Example

This example demonstrates how to use the Nomos SDK to interact with Nomos agents from TypeScript and JavaScript applications.

## What's Included

- **`simple-example.js`** - A pure JavaScript example showing basic SDK usage
- **`src/index.ts`** - TypeScript version with detailed comments
- **`src/basic-example.ts`** - Clean TypeScript example with error handling
- **`src/advanced-example.ts`** - Production-ready patterns and utilities
- **`src/interactive-chat.ts`** - Interactive CLI chat application
- **Package configuration** for both TypeScript and JavaScript usage

## Prerequisites

1. **Nomos Server Running**: Make sure you have a Nomos server running on `http://localhost:8000`
2. **Agent Configured**: Have at least one agent configured (e.g., the barista example)
3. **Node.js**: Version 16 or higher
4. **SDK Built**: The Nomos TypeScript SDK should be built

## Quick Start

### 1. Install Dependencies

```bash
cd examples/typescript-sdk-example
npm install
```

### 2. Build the SDK (if not already done)

```bash
cd ../../sdk/ts
npm install
npm run build
npm link  # Create global link

cd ../../examples/typescript-sdk-example
npm install
npm link nomos-sdk  # Link to the project
```

### 3. Run the Examples

#### Automated Setup & Test
```bash
./setup.sh          # Complete setup
./test-examples.sh   # Test examples (with or without server)
```

#### JavaScript Example (No build required)
```bash
npm run start:js
```

#### TypeScript Examples
```bash
# Build and run the basic example
npm run dev

# Run the clean basic example
npm run basic

# Run advanced patterns example
npm run advanced

# Or build once and run multiple times
npm run build
npm start

# Run the interactive chat
npm run interactive
```

## Examples Overview

### Simple JavaScript Example (`simple-example.js`)

This example demonstrates:
- Creating a client connection
- Starting a session with an agent
- Sending messages back and forth
- Getting conversation history
- Using both session-based and chat endpoints
- Proper error handling

```javascript
import { NomosClient } from 'nomos-sdk';

const client = new NomosClient('http://localhost:8000');
const session = await client.createSession(true);
const response = await client.sendMessage(session.session_id, 'Hello!');
```

### TypeScript Example (`src/index.ts`)

Similar to the JavaScript example but with:
- Full TypeScript type safety
- Detailed comments and documentation
- Error handling with typed responses

### Interactive Chat (`src/interactive-chat.ts`)

A command-line chat interface that allows you to:
- Have real-time conversations with agents
- See tool outputs when agents use tools
- Maintain conversation context
- Exit gracefully

## SDK Features Demonstrated

### 1. Session Management
```javascript
// Create a new session
const session = await client.createSession(true);

// Send messages
const response = await client.sendMessage(session.session_id, 'Hello');

// Get history
const history = await client.getSessionHistory(session.session_id);

// End session
await client.endSession(session.session_id);
```

### 2. Direct Chat Interface
```javascript
// Use the chat endpoint for stateless interactions
const response = await client.chat({
  user_input: 'Hello',
  session_data: previousSessionData
});
```

### 3. Error Handling
```javascript
try {
  const response = await client.sendMessage(sessionId, message);
} catch (error) {
  console.error('Failed to send message:', error.message);
}
```

## Configuration

### Custom Server URL
```javascript
const client = new NomosClient('http://your-server:8080');
```

### TypeScript Configuration
The example includes a `tsconfig.json` configured for:
- ES2020 target
- ESNext modules
- Strict type checking
- Source maps for debugging

## Troubleshooting

### Common Issues

1. **"Cannot find module 'nomos-sdk'"**
   - Make sure the SDK is built: `cd ../../sdk/ts && npm run build`
   - Check that dependencies are installed: `npm install`

2. **Connection errors**
   - Ensure Nomos server is running on the correct port
   - Check that you have an agent configured
   - Verify the server URL in your client initialization

3. **TypeScript compilation errors**
   - Install dependencies: `npm install`
   - Check TypeScript version: `npx tsc --version`

### Debugging Tips

1. **Enable verbose logging**: Add console.log statements to see request/response data
2. **Check server logs**: Look at your Nomos server output for errors
3. **Verify agent configuration**: Make sure your agent YAML is properly configured
4. **Test with curl**: Verify the API endpoints work directly

## Next Steps

After running these examples, you can:

1. **Modify the conversation flow** - Change the messages to test different scenarios
2. **Add custom error handling** - Implement retry logic or fallback responses
3. **Build a web interface** - Use the SDK in a React/Vue/Angular application
4. **Create agent-specific clients** - Build specialized clients for different agents
5. **Add authentication** - Extend the client to handle authentication if needed

## API Reference

For complete API documentation, see the main SDK documentation and the TypeScript type definitions in the SDK source code.

## Contributing

Feel free to improve these examples by:
- Adding more comprehensive error handling
- Creating additional usage patterns
- Adding tests
- Improving documentation
