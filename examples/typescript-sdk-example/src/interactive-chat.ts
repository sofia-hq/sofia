import { NomosClient, ChatRequest, SessionData } from 'nomos-sdk';
import { createInterface, Interface } from 'readline';

/**
 * Interactive chat example using the Nomos SDK
 * This example demonstrates how to use the chat endpoint for real-time conversation
 */
class InteractiveChat {
  private client: NomosClient;
  private rl: Interface;
  private sessionData: SessionData | undefined;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.client = new NomosClient(baseUrl);
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('🤖 Welcome to Nomos Interactive Chat!');
    console.log('Type "quit" or "exit" to end the conversation');
    console.log('='.repeat(50));

    try {
      // Initialize the conversation
      await this.initializeChat();

      // Start the interactive loop
      await this.chatLoop();

    } catch (error) {
      console.error('❌ Error starting chat:', error);
    } finally {
      this.rl.close();
    }
  }

  private async initializeChat() {
    console.log('🚀 Initializing chat session...');

    const request: ChatRequest = {
      user_input: '', // Empty input to initialize
    };

    const response = await this.client.chat(request);
    this.sessionData = response.session_data;

    console.log('🤖 Agent:', this.formatMessage(response.response));
    console.log();
  }

  private async chatLoop() {
    while (true) {
      const userInput = await this.getUserInput('👤 You: ');

      if (userInput.toLowerCase() === 'quit' || userInput.toLowerCase() === 'exit') {
        console.log('👋 Goodbye!');
        break;
      }

      if (userInput.trim() === '') {
        continue;
      }

      try {
        const request: ChatRequest = {
          user_input: userInput,
          session_data: this.sessionData
        };

        console.log('🤔 Thinking...');
        const response = await this.client.chat(request);

        // Update session data
        this.sessionData = response.session_data;

        // Display response
        console.log('🤖 Agent:', this.formatMessage(response.response));

        // Show tool output if any
        if (response.tool_output) {
          console.log('🔧 Tool Output:', response.tool_output);
        }

        console.log();

      } catch (error) {
        console.error('❌ Error sending message:', error);
        console.log('Please try again or type "quit" to exit.');
        console.log();
      }
    }
  }

  private getUserInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  private formatMessage(message: Record<string, unknown>): string {
    // Try to extract the content from the message object
    if (typeof message === 'string') {
      return message;
    }

    if (message && typeof message === 'object') {
      // Check common message content fields
      if ('content' in message && typeof message.content === 'string') {
        return message.content;
      }
      if ('text' in message && typeof message.text === 'string') {
        return message.text;
      }
      if ('message' in message && typeof message.message === 'string') {
        return message.message;
      }

      // If no known field, stringify the object
      return JSON.stringify(message, null, 2);
    }

    return String(message);
  }
}

// Usage example
async function runInteractiveChat() {
  const chat = new InteractiveChat();
  await chat.start();
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runInteractiveChat().catch(console.error);
}
