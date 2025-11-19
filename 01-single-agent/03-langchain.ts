import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { checkForOpenAIKey, etsyFeesCalculator, getInput, loadingMessages, printWelcomeMessage, showLoading, systemPrompt } from "./lib/util.js";

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
      .boolean().nullable()
      .describe("Whether the item uses Etsy offsite ads (use null or false if not applicable)"),
  }),
  func: async ({ itemPrice, offsiteAds }) => {
    const result = etsyFeesCalculator({
      itemPrice,
      offsiteAds,
    });
    return JSON.stringify(result);
  },
});


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
  checkForOpenAIKey();
  printWelcomeMessage();
  // Bind tools to the model
  modelWithTools = model.bindTools([etsyFeesCalculatorTool]);


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
