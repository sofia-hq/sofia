import { NomosClient } from 'nomos-sdk';

/**
 * Advanced TypeScript example showing various SDK usage patterns
 * Includes utilities for building production applications
 */

class NomosAgentWrapper {
  private client: NomosClient;
  private sessionId: string | null = null;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.client = new NomosClient(baseUrl);
  }

  /**
   * Initialize a conversation session
   */
  async startSession(): Promise<string> {
    const session = await this.client.createSession(true);
    this.sessionId = session.session_id;
    return this.formatMessage(session.message);
  }

  /**
   * Send a message and get response
   */
  async sendMessage(message: string): Promise<string> {
    if (!this.sessionId) {
      throw new Error('No active session. Call startSession() first.');
    }

    const response = await this.client.sendMessage(this.sessionId, message);
    return this.formatMessage(response.message);
  }

  /**
   * Get the full conversation history
   */
  async getHistory(): Promise<string[]> {
    if (!this.sessionId) {
      throw new Error('No active session.');
    }

    const history = await this.client.getSessionHistory(this.sessionId);
    return history.history.map((msg: any) => msg.content || JSON.stringify(msg));
  }

  /**
   * End the current session
   */
  async endSession(): Promise<string> {
    if (!this.sessionId) {
      throw new Error('No active session.');
    }

    const result = await this.client.endSession(this.sessionId);
    this.sessionId = null;
    return result.message;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Check if there's an active session
   */
  hasActiveSession(): boolean {
    return this.sessionId !== null;
  }

  private formatMessage(message: Record<string, unknown>): string {
    if (typeof message === 'string') return message;
    if (message.content && typeof message.content === 'string') return message.content;
    if (message.text && typeof message.text === 'string') return message.text;
    return JSON.stringify(message, null, 2);
  }
}

/**
 * Example: Coffee ordering bot interaction
 */
async function coffeeOrderingExample() {
  console.log('☕ Coffee Ordering Example');
  console.log('==========================');

  const agent = new NomosAgentWrapper();

  try {
    // Start conversation
    const greeting = await agent.startSession();
    console.log('🤖 Barista:', greeting);

    // Simulate a coffee ordering conversation
    const conversation = [
      "Hi! I'd like to order a coffee please.",
      "What coffee options do you have?",
      "I'll take a large cappuccino.",
      "Yes, that sounds perfect. Please finalize my order."
    ];

    for (const message of conversation) {
      console.log(`👤 Customer: ${message}`);
      const response = await agent.sendMessage(message);
      console.log(`🤖 Barista: ${response}`);
      console.log();
    }

    // Show conversation history
    console.log('📜 Full Conversation:');
    const history = await agent.getHistory();
    history.forEach((msg, idx) => {
      console.log(`${idx + 1}. ${msg}`);
    });

    // End session
    const endMessage = await agent.endSession();
    console.log(`\n✅ ${endMessage}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example: Multi-session management
 */
async function multiSessionExample() {
  console.log('\n🔄 Multi-Session Example');
  console.log('========================');

  const sessions: NomosAgentWrapper[] = [];

  try {
    // Create multiple sessions
    for (let i = 1; i <= 3; i++) {
      const agent = new NomosAgentWrapper();
      const greeting = await agent.startSession();
      sessions.push(agent);
      console.log(`Session ${i} (${agent.getCurrentSessionId()?.slice(0, 8)}...): ${greeting}`);
    }

    // Send different messages to each session
    const messages = [
      "I want a small latte",
      "Do you have any tea options?",
      "What's your most popular drink?"
    ];

    for (let i = 0; i < sessions.length; i++) {
      console.log(`\n📱 Session ${i + 1} conversation:`);
      const response = await sessions[i].sendMessage(messages[i]);
      console.log(`Response: ${response}`);
    }

    // Clean up all sessions
    console.log('\n🧹 Cleaning up sessions...');
    for (let i = 0; i < sessions.length; i++) {
      await sessions[i].endSession();
      console.log(`✅ Session ${i + 1} ended`);
    }

  } catch (error: any) {
    console.error('❌ Multi-session error:', error.message);
  }
}

/**
 * Example: Error recovery and resilience
 */
async function resilientAgentExample() {
  console.log('\n🛡️  Resilient Agent Example');
  console.log('===========================');

  class ResilientAgent extends NomosAgentWrapper {
    private maxRetries = 3;
    private retryDelay = 1000;

    async sendMessageWithRetry(message: string): Promise<string> {
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          return await this.sendMessage(message);
        } catch (error: any) {
          console.log(`⚠️  Attempt ${attempt} failed: ${error.message}`);

          if (attempt === this.maxRetries) {
            throw error;
          }

          console.log(`⏳ Retrying in ${this.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          this.retryDelay *= 2; // Exponential backoff
        }
      }

      throw new Error('Max retries exceeded');
    }

    async recoverSession(): Promise<void> {
      if (!this.hasActiveSession()) {
        console.log('🔄 Starting new session after failure...');
        await this.startSession();
      }
    }
  }

  const resilientAgent = new ResilientAgent();

  try {
    await resilientAgent.startSession();
    console.log('✅ Resilient session started');

    // This might fail, but will be retried
    const response = await resilientAgent.sendMessageWithRetry("Hello, I need help!");
    console.log('🤖 Response:', response);

    await resilientAgent.endSession();

  } catch (error: any) {
    console.error('❌ Resilient agent failed:', error.message);
    await resilientAgent.recoverSession();
  }
}

/**
 * Example: Performance monitoring
 */
async function performanceExample() {
  console.log('\n⚡ Performance Monitoring Example');
  console.log('=================================');

  const agent = new NomosAgentWrapper();

  // Performance monitoring wrapper
  async function timeOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - start;
      console.log(`✅ ${name}: ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.log(`❌ ${name}: ${duration}ms (failed)`);
      throw error;
    }
  }

  try {
    await timeOperation('Session Creation', () => agent.startSession());

    await timeOperation('First Message', () =>
      agent.sendMessage("What's your fastest coffee option?")
    );

    await timeOperation('Second Message', () =>
      agent.sendMessage("I'll take that please")
    );

    await timeOperation('History Retrieval', () => agent.getHistory());

    await timeOperation('Session Cleanup', () => agent.endSession());

  } catch (error: any) {
    console.error('❌ Performance test failed:', error.message);
  }
}

/**
 * Main function to run all examples
 */
async function runAdvancedExamples() {
  console.log('🚀 Advanced Nomos SDK Examples');
  console.log('===============================\n');

  await coffeeOrderingExample();
  await multiSessionExample();
  await resilientAgentExample();
  await performanceExample();

  console.log('\n🎉 All advanced examples completed!');
  console.log('\n💡 These patterns can be used to build:');
  console.log('   • Production chatbots');
  console.log('   • Multi-user applications');
  console.log('   • Resilient agent integrations');
  console.log('   • Performance-monitored systems');
}

// Export classes and functions for use in other modules
export { NomosAgentWrapper, runAdvancedExamples };

// Run examples
runAdvancedExamples().catch(console.error);
