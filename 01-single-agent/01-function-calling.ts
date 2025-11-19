import OpenAI from 'openai';
import { Command } from 'commander';
import * as readline from 'readline';
import { etsyFeesCalculator } from './lib/util';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the function tool for OpenAI
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'etsyFeesCalculator',
      description: 'Calculates Etsy seller fees for a product listing, including listing fee, transaction fee, payment processing fee, and optional offsite ads fee.',
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
];

// System prompt for the conversational agent
const systemPrompt = `You are a helpful assistant that can calculate Etsy seller fees.
When a user asks about Etsy fees or wants to know how much they'll pay in fees for selling an item on Etsy, use the etsyFeesCalculator function.
Be friendly and conversational. You can answer general questions, but your specialty is helping with Etsy fee calculations.`;

// Message history to maintain conversation context
const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
  { role: 'system', content: systemPrompt },
];

async function chat(userInput: string): Promise<string> {
  // Add user message to history
  messages.push({ role: 'user', content: userInput });

  // Initial API call
  let response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: messages,
    tools: tools,
  });

  let responseMessage = response.choices[0].message;

  // Handle function calls
  while (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
    // Add assistant's response with tool calls to message history
    messages.push(responseMessage);

    // Process each tool call
    for (const toolCall of responseMessage.tool_calls) {
      if (toolCall.type === 'function' && toolCall.function.name === 'etsyFeesCalculator') {
        const args = JSON.parse(toolCall.function.arguments);

        // Call the actual function
        const result = etsyFeesCalculator({
          itemPrice: args.itemPrice,
          offsiteAds: args.offsiteAds,
        });

        // Add function result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    // Get the next response from the model
    response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: messages,
      tools: tools,
    });

    responseMessage = response.choices[0].message;
  }

  // Add final assistant response to history
  messages.push(responseMessage);
  // console.log(JSON.stringify(messages, null, 2)); // Debug: log message history
  // console.log({messages});
  return responseMessage.content || 'I apologize, but I could not generate a response.';
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
    .name('etsy-fees-agent')
    .description('A conversational agent that can calculate Etsy seller fees')
    .version('1.0.0');

  program.action(async () => {
    console.log('Welcome to the Etsy Fees Calculator Agent!');
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
        const response = await chat(userInput);
        console.log(`\nAgent: ${response}\n`);
      } catch (error) {
        if (error instanceof Error) {
          console.error(`\nError: ${error.message}\n`);
        } else {
          console.error('\nAn unexpected error occurred.\n');
        }
      }
    }
  });

  program.parse();
}

main();
