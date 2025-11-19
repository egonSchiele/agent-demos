import OpenAI from 'openai';
import { Command } from 'commander';
import * as readline from 'readline';
import { etsyFeesCalculator } from './lib/util';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Assistant configuration
const ASSISTANT_CONFIG = {
  name: 'Etsy Fees Calculator',
  instructions: `You are a helpful assistant that can calculate Etsy seller fees.
When a user asks about Etsy fees or wants to know how much they'll pay in fees for selling an item on Etsy, use the etsyFeesCalculator function.
Be friendly and conversational. You can answer general questions, but your specialty is helping with Etsy fee calculations.`,
  model: 'gpt-4-turbo',
  tools: [
    {
      type: 'function' as const,
      function: {
        name: 'etsyFeesCalculator',
        description:
          'Calculates Etsy seller fees for a product listing, including listing fee, transaction fee, payment processing fee, and optional offsite ads fee.',
        parameters: {
          type: 'object',
          properties: {
            itemPrice: {
              type: 'number',
              description: 'The price of the Etsy item in dollars',
            },
            offsiteAds: {
              type: 'boolean',
              description: 'Whether the item uses Etsy offsite ads (defaults to false)',
            },
          },
          required: ['itemPrice'],
          additionalProperties: false,
        },
      },
    },
  ],
};

async function getOrCreateAssistant(): Promise<string> {
  // Check if we have an existing assistant ID
  const assistantId = process.env.OPENAI_ASSISTANT_ID;

  if (assistantId) {
    try {
      // Verify the assistant exists
      await openai.beta.assistants.retrieve(assistantId);
      console.log(`Using existing assistant: ${assistantId}\n`);
      return assistantId;
    } catch (error) {
      console.log('Assistant ID not found, creating a new one...\n');
    }
  }

  // Create a new assistant
  const assistant = await openai.beta.assistants.create(ASSISTANT_CONFIG);

  console.log(' Created new assistant!');
  console.log(`Assistant ID: ${assistant.id}`);
  console.log('\nTo reuse this assistant in future sessions, set:');
  console.log(`export OPENAI_ASSISTANT_ID=${assistant.id}\n`);

  return assistant.id;
}

async function chat(
  threadId: string,
  assistantId: string,
  userInput: string
): Promise<string> {
  // Add user message to thread
  await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: userInput,
  });

  // Create a run
  let run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: assistantId,
  });

  // Poll until the run completes
  while (
    run.status === 'queued' ||
    run.status === 'in_progress' ||
    run.status === 'requires_action'
  ) {
    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Handle tool calls
    if (
      run.status === 'requires_action' &&
      run.required_action?.type === 'submit_tool_outputs'
    ) {
      const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
      const toolOutputs = [];

      for (const toolCall of toolCalls) {
        if (
          toolCall.type === 'function' &&
          toolCall.function.name === 'etsyFeesCalculator'
        ) {
          const args = JSON.parse(toolCall.function.arguments);

          // Call the actual function
          const result = etsyFeesCalculator({
            itemPrice: args.itemPrice,
            offsiteAds: args.offsiteAds,
          });

          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: JSON.stringify(result),
          });
        }
      }

      // Submit tool outputs and continue the run
      run = await openai.beta.threads.runs.submitToolOutputs(run.id, {
        thread_id: threadId,
        tool_outputs: toolOutputs,
      });
    } else {
      // Retrieve the run status
      run = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: threadId,
      });
    }
  }

  // Check if the run completed successfully
  if (run.status === 'completed') {
    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(threadId, {
      limit: 1,
      order: 'desc',
    });

    const lastMessage = messages.data[0];

    if (lastMessage.role === 'assistant' && lastMessage.content[0].type === 'text') {
      return lastMessage.content[0].text.value;
    }
  } else if (run.status === 'failed') {
    throw new Error(`Run failed: ${run.last_error?.message || 'Unknown error'}`);
  } else if (run.status === 'expired') {
    throw new Error('Run expired - took too long to complete');
  }

  return 'I apologize, but I could not generate a response.';
}

async function main() {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is not set.');
    console.error('Please set it with: export OPENAI_API_KEY=your-api-key');
    process.exit(1);
  }

  const program = new Command();
  program
    .name('etsy-fees-agent-assistants')
    .description(
      'A conversational agent using OpenAI Assistants API that can calculate Etsy seller fees'
    )
    .version('1.0.0');

  program.action(async () => {
    try {
      // Get or create assistant
      const assistantId = await getOrCreateAssistant();

      // Create a new thread for this conversation
      const thread = await openai.beta.threads.create();
      console.log('Welcome to the Etsy Fees Calculator Agent (Assistants API)!');
      console.log('I can help you calculate Etsy seller fees for your products.');
      console.log('Type "exit" or "quit" to end the conversation.\n');

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const askQuestion = (): Promise<string> => {
        return new Promise((resolve) => {
          rl.question('You: ', (answer) => {
            resolve(answer);
          });
        });
      };

      // Interactive loop
      while (true) {
        const userInput = await askQuestion();

        // Check for exit commands
        if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
          console.log('\nGoodbye! Have a great day!');
          rl.close();
          break;
        }

        // Skip empty inputs
        if (!userInput.trim()) {
          continue;
        }

        try {
          const response = await chat(thread.id, assistantId, userInput);
          console.log(`\nAgent: ${response}\n`);
        } catch (error) {
          if (error instanceof Error) {
            console.error(`\nError: ${error.message}\n`);
          } else {
            console.error('\nAn unexpected error occurred.\n');
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\nFatal error: ${error.message}`);
      } else {
        console.error('\nAn unexpected fatal error occurred.');
      }
      process.exit(1);
    }
  });

  program.parse();
}

main();
