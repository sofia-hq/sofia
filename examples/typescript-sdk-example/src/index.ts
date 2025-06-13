import { NomosClient } from 'nomos-sdk';

/**
 * Simple example demonstrating basic usage of the Nomos SDK
 * This example shows how to:
 * 1. Create a client
 * 2. Start a session
 * 3. Send messages
 * 4. Get session history
 * 5. End the session
 */
async function simpleExample() {
  // Initialize the Nomos client
  // By default, it connects to http://localhost:8000
  // You can specify a different URL: new NomosClient('http://your-server:port')
  const client = new NomosClient();

  console.log('🚀 Starting Nomos SDK Example');
  console.log('='.repeat(40));

  try {
    // Step 1: Create a new session
    console.log('📝 Creating a new session...');
    const session = await client.createSession(true); // initiate=true to start the conversation
    console.log(`✅ Session created: ${session.session_id}`);
    console.log(`📧 Initial message:`, session.message);
    console.log();

    // Step 2: Send a message to the agent
    console.log('💬 Sending a message to the agent...');
    const message1 = await client.sendMessage(session.session_id, 'Hello! I would like to order a coffee.');
    console.log(`🤖 Agent response:`, message1.message);
    console.log();

    // Step 3: Continue the conversation
    console.log('💬 Continuing the conversation...');
    const message2 = await client.sendMessage(session.session_id, 'What coffee options do you have?');
    console.log(`🤖 Agent response:`, message2.message);
    console.log();

    // Step 4: Another message
    console.log('💬 Placing an order...');
    const message3 = await client.sendMessage(session.session_id, 'I would like a large cappuccino please.');
    console.log(`🤖 Agent response:`, message3.message);
    console.log();

    // Step 5: Get the session history
    console.log('📜 Getting session history...');
    const history = await client.getSessionHistory(session.session_id);
    console.log(`📋 Session History for ${history.session_id}:`);
    history.history.forEach((msg: any, index: number) => {
      console.log(`  ${index + 1}. ${msg.content}`);
    });
    console.log();

    // Step 6: End the session
    console.log('🔚 Ending the session...');
    const endResult = await client.endSession(session.session_id);
    console.log(`✅ ${endResult.message}`);

  } catch (error) {
    console.error('❌ Error occurred:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }

  console.log();
  console.log('='.repeat(40));
  console.log('🎉 Example completed!');
}

// Run the example
simpleExample().catch(console.error);
