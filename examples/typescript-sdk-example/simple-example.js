import { NomosClient } from 'nomos-sdk';

/**
 * Simple JavaScript example using the Nomos SDK
 * This example shows basic interaction with a Nomos agent
 */

async function runSimpleExample() {
  // Create a new Nomos client
  const client = new NomosClient('http://localhost:8000');

  console.log('🚀 Nomos SDK JavaScript Example');
  console.log('================================');

  try {
    // Step 1: Create a session and initiate conversation
    console.log('📝 Creating session...');
    const session = await client.createSession(true);
    console.log(`✅ Session ID: ${session.session_id}`);
    console.log(`🤖 Agent says: ${JSON.stringify(session.message, null, 2)}`);
    console.log();

    // Step 2: Send messages to the agent
    const messages = [
      "Hello! I'd like to order a coffee.",
      "What options do you have?",
      "I'll have a large latte please.",
      "Yes, please finalize my order."
    ];

    for (let i = 0; i < messages.length; i++) {
      console.log(`💬 You: ${messages[i]}`);
      const response = await client.sendMessage(session.session_id, messages[i]);
      console.log(`🤖 Agent: ${JSON.stringify(response.message, null, 2)}`);
      console.log();

      // Add a small delay to make it more realistic
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 3: Get conversation history
    console.log('📜 Getting conversation history...');
    const history = await client.getSessionHistory(session.session_id);
    console.log('Conversation History:');
    history.history.forEach((msg, index) => {
      console.log(`  ${index + 1}. ${msg.content}`);
    });
    console.log();

    // Step 4: End the session
    console.log('🔚 Ending session...');
    const endResult = await client.endSession(session.session_id);
    console.log(`✅ ${endResult.message}`);

  } catch (error) {
    console.error('❌ Error:', error.message || error);
    console.log('\n💡 Make sure:');
    console.log('   - Nomos server is running on http://localhost:8000');
    console.log('   - You have a configured agent (e.g., barista)');
    console.log('   - The SDK is properly built');
  }

  console.log('\n🎉 Example completed!');
}

// Alternative example using the chat endpoint
async function runChatExample() {
  const client = new NomosClient('http://localhost:8000');

  console.log('\n🗨️  Chat Endpoint Example');
  console.log('=========================');

  try {
    // Initialize chat
    let sessionData;

    // First chat request to initialize
    console.log('🚀 Initializing chat...');
    let response = await client.chat({ user_input: '' });
    sessionData = response.session_data;
    console.log(`🤖 Agent: ${JSON.stringify(response.response, null, 2)}`);
    console.log();

    // Continue conversation
    const userInputs = [
      "Hi there!",
      "I want to order a coffee",
      "What do you recommend?"
    ];

    for (const input of userInputs) {
      console.log(`👤 You: ${input}`);
      response = await client.chat({
        user_input: input,
        session_data: sessionData
      });

      sessionData = response.session_data;
      console.log(`🤖 Agent: ${JSON.stringify(response.response, null, 2)}`);

      if (response.tool_output) {
        console.log(`🔧 Tool Output: ${response.tool_output}`);
      }
      console.log();
    }

  } catch (error) {
    console.error('❌ Chat Error:', error.message || error);
  }
}

// Run both examples
async function main() {
  await runSimpleExample();
  await runChatExample();
}

main().catch(console.error);
