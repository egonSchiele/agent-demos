import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { etsyFeesCalculator, getInput, loadingMessages, showLoading } from "./lib/util.js";

// Initialize ChatOpenAI model
const model = new ChatOpenAI({
  modelName: "gpt-4-turbo",
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Define the function tool for LangChain
const etsyFeesCalculatorTool = new DynamicStructuredTool({
  name: "etsyFeesCalculator",
  description:
    "Calculates Etsy seller fees for a product listing, including listing fee, transaction fee, payment processing fee, and optional offsite ads fee.",
  schema: z.object({
    itemPrice: z.number().describe("The price of the Etsy item in dollars"),
    offsiteAds: z
      .boolean()
      .optional()
      .describe("Whether the item uses Etsy offsite ads (defaults to false)"),
  }),
  func: async ({ itemPrice, offsiteAds }) => {
    const result = etsyFeesCalculator({
      itemPrice,
      offsiteAds,
    });
    return JSON.stringify(result);
  },
});

// System prompt for the conversational agent
const systemPrompt = `You are a helpful assistant that can calculate Etsy seller fees.
When a user asks about Etsy fees or wants to know how much they'll pay in fees for selling an item on Etsy, use the etsyFeesCalculator function.
Be friendly and conversational. You can answer general questions, but your specialty is helping with Etsy fee calculations.`;

// Message history to maintain conversation context
const messages: any[] = [new SystemMessage(systemPrompt)];

// Model with tools bound
let modelWithTools: any;

async function chat(userInput: string): Promise<string> {
  // Add user message to history
  messages.push(new HumanMessage(userInput));

  // Invoke the model with tools
  let response = await modelWithTools.invoke(messages);

  // Handle tool calls
  while (response.tool_calls && response.tool_calls.length > 0) {
    // Add assistant's response with tool calls to message history
    messages.push(response);

    // Process each tool call
    for (const toolCall of response.tool_calls) {
      if (toolCall.name === "etsyFeesCalculator") {
        // Call the actual function
        const result = await etsyFeesCalculatorTool.func(toolCall.args);

        // Add tool result to messages
        messages.push({
          role: "tool",
          content: result,
          tool_call_id: toolCall.id,
        });
      }
    }

    // Get the next response from the model
    response = await modelWithTools.invoke(messages);
  }

  // Add final assistant response to history
  messages.push(response);

  return response.content || "I apologize, but I could not generate a response.";
}

async function main() {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is not set.");
    console.error("Please set it with: export OPENAI_API_KEY=your-api-key");
    process.exit(1);
  }

  // Bind tools to the model
  modelWithTools = model.bindTools([etsyFeesCalculatorTool]);

  console.log("Welcome to the Etsy Fees Calculator Agent!");
  console.log("I can help you calculate Etsy seller fees for your products.");
  console.log('Type "exit" or "quit" to end the conversation.\n');

  // Interactive loop
  while (true) {
    const userInput = await getInput("You: ");

    // Skip empty inputs
    if (!userInput.trim()) {
      continue;
    }

    const loading = showLoading(loadingMessages);
    try {
      const response = await chat(userInput);
      loading.stop();
      console.log(`\nAgent: ${response}\n`);
    } catch (error) {
      loading.stop();
      if (error instanceof Error) {
        console.error(`\nError: ${error.message}\n`);
      } else {
        console.error("\nAn unexpected error occurred.\n");
      }
    }
  }
}

main();
