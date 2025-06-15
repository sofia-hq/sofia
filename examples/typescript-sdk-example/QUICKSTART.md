# Quick Start Guide

## Prerequisites
1. **Nomos Server**: Make sure you have a Nomos server running
2. **Agent**: Have at least one agent configured (e.g., the barista example)
3. **Node.js**: Version 16 or higher

## Fastest Way to Get Started

### Option 1: Automated Setup
```bash
cd examples/typescript-sdk-example
./setup.sh
npm run start:js
```

### Option 2: Manual Setup
```bash
# 1. Build the SDK
cd sdk/ts
npm install && npm run build

# 2. Setup the example
cd ../../examples/typescript-sdk-example
npm install

# 3. Run examples
npm run start:js          # JavaScript example
npm run basic             # TypeScript basic example
npm run advanced          # TypeScript advanced example
npm run interactive       # Interactive chat
```

## Test Your Setup

If everything is working, you should see output like:
```
🚀 Nomos SDK JavaScript Example
================================
📝 Creating session...
✅ Session ID: abc123...
🤖 Agent says: {"content": "Hello! How can I help you today?"}
...
```

## Common Issues

**Connection Error**: Make sure Nomos server is running on http://localhost:8000
**No Agent**: Configure an agent using the examples in the examples/ folder
**Build Error**: Make sure to build the SDK first with `npm run build`

## Next Steps

1. Modify the examples to test your specific agents
2. Build your own application using the SDK
3. Explore the advanced patterns in `advanced-example.ts`
