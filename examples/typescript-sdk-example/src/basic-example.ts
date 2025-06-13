import { NomosClient } from 'nomos-sdk';

/**
 * Basic TypeScript example demonstrating Nomos SDK usage
 * This example focuses on core functionality without complex dependencies
 */

interface AgentMessage {
  content?: string;
  [key: string]: any;
}

async function basicExample() {
  console.log('🚀 Nomos SDK TypeScript Example');
  console.log('===============================');

  // Initialize client
  const client = new NomosClient('http://localhost:8000');

  try {
    // Step 1: Create and initiate a session
    console.log('📝 Creating new session...');
    const session = await client.createSession(true);
    console.log(`✅ Session created: ${session.session_id}`);
    console.log(`🤖 Initial response:`, formatMessage(session.message));
    console.log();

    // Step 2: Send a series of messages
    const conversations = [
      "Hello! I'd like some help.",
      "What can you help me with?",
      "That sounds great, let's proceed."
    ];

    for (const [index, message] of conversations.entries()) {
      console.log(`💬 Message ${index + 1}: "${message}"`);

      const response = await client.sendMessage(session.session_id, message);
      console.log(`🤖 Agent response:`, formatMessage(response.message));
      console.log();

      // Brief pause between messages
      await sleep(500);
    }

    // Step 3: Try using the chat endpoint
    console.log('🗨️  Testing chat endpoint...');
    const chatResponse = await client.chat({
      user_input: "Can you help me with something specific?"
    });
    console.log(`🤖 Chat response:`, formatMessage(chatResponse.response));
    if (chatResponse.tool_output) {
      console.log(`🔧 Tool output: ${chatResponse.tool_output}`);
    }
    console.log();

    // Step 4: Get conversation history
    console.log('📜 Retrieving conversation history...');
    const history = await client.getSessionHistory(session.session_id);
    console.log(`📋 History for session ${history.session_id}:`);

    if (history.history && Array.isArray(history.history)) {
      history.history.forEach((msg: AgentMessage, idx: number) => {
        const content = msg.content || JSON.stringify(msg);
        console.log(`  ${idx + 1}. ${content}`);
      });
    }
    console.log();

    // Step 5: Clean up
    console.log('🔚 Ending session...');
    const endResult = await client.endSession(session.session_id);
    console.log(`✅ Session ended: ${endResult.message}`);

  } catch (error: any) {
    console.error('❌ Error occurred:', error.message || error);
    console.log('\n💡 Troubleshooting:');
    console.log('   • Ensure Nomos server is running on http://localhost:8000');
    console.log('   • Check that you have an agent configured');
    console.log('   • Verify the SDK is properly built');
  }

  console.log('\n🎉 Example completed!');
}

/**
 * Format message response for display
 */
function formatMessage(message: Record<string, unknown>): string {
  if (typeof message === 'string') {
    return message;
  }

  // Try to extract content from common fields
  if (message.content && typeof message.content === 'string') {
    return message.content;
  }

  if (message.text && typeof message.text === 'string') {
    return message.text;
  }

  if (message.message && typeof message.message === 'string') {
    return message.message;
  }

  // Fallback to JSON representation
  return JSON.stringify(message, null, 2);
}

/**
 * Simple sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Demonstration of error handling patterns
 */
async function errorHandlingExample() {
  console.log('\n🛡️  Error Handling Example');
  console.log('=========================');

  const client = new NomosClient('http://localhost:8000');

  // Example 1: Handling connection errors
  try {
    const invalidClient = new NomosClient('http://invalid-url:9999');
    await invalidClient.createSession();
  } catch (error: any) {
    console.log('✅ Caught connection error:', error.message);
  }

  // Example 2: Handling invalid session
  try {
    await client.sendMessage('invalid-session-id', 'Hello');
  } catch (error: any) {
    console.log('✅ Caught invalid session error:', error.message);
  }

  // Example 3: Retry logic example
  console.log('🔄 Demonstrating retry logic...');
  await withRetry(async () => {
    const session = await client.createSession(true);
    console.log('✅ Session created successfully with retry logic');
    await client.endSession(session.session_id);
  }, 3);
}

/**
 * Simple retry utility
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.log(`⚠️  Attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxRetries) {
        const delay = attempt * 1000; // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}

// Run the examples
async function main() {
  await basicExample();
  await errorHandlingExample();
}

// Execute the examples
main().catch(console.error);
