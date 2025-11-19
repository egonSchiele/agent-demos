import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { etsyFeesCalculator, getInput, loadingMessages, showLoading, systemPrompt, checkForOpenAIKey, printWelcomeMessage } from "./lib/util.js";

// Define the Etsy fees calculator tool using Vercel AI SDK
const etsyFeesCalculatorTool = {
  description:
    "Calculates Etsy seller fees for a product listing, including listing fee, transaction fee, payment processing fee, and optional offsite ads fee.",
  inputSchema: z.object({
    itemPrice: z.number().describe("The price of the Etsy item in dollars"),
    offsiteAds: z
      .boolean()
      .nullable()
      .describe("Whether the item uses Etsy offsite ads (use null or false if not applicable)"),
  }),
  execute: async ({ itemPrice, offsiteAds }: { itemPrice: number; offsiteAds: boolean | null }) => {
    const result = etsyFeesCalculator({
      itemPrice,
      offsiteAds,
    });
    return result;
  },
};

// Message history to maintain conversation context
const messages: Array<any> = [];

async function chat(userInput: string): Promise<string> {
  // Generate response with tool calling using Vercel AI SDK
  const result = await generateText({
    model: openai("gpt-4-turbo"),
    system: systemPrompt,
    messages: [...messages, { role: "user", content: userInput }],
    tools: {
      etsyFeesCalculator: etsyFeesCalculatorTool,
    },
  });

  // console.log("Text:", result.text);
  // console.log("Tool calls:", result.toolCalls);
  // console.log("Tool results:", result.toolResults);

  // Add user message to history
  messages.push({ role: "user", content: userInput });

  // Handle response based on whether tools were called
  let responseText = result.text;

  if (!responseText && result.toolResults && result.toolResults.length > 0) {
    // If tool was called, format the tool results for the user
    const toolResult = result.toolResults[0].output;
    const fees = typeof toolResult === 'string' ? JSON.parse(toolResult) : toolResult;

    responseText = `Here are the Etsy fees for your item:\n` +
      `- Listing Fee: $${fees.listingFee.toFixed(2)}\n` +
      `- Transaction Fee: $${fees.transactionFee.toFixed(2)}\n` +
      `- Payment Processing Fee: $${fees.paymentProcessingFee.toFixed(2)}\n` +
      `- Offsite Ads Fee: $${fees.offsiteAdsFee.toFixed(2)}\n` +
      `- Total Fees: $${(fees.listingFee + fees.transactionFee + fees.paymentProcessingFee + fees.offsiteAdsFee).toFixed(2)}`;
  }

  // Add assistant response to history
  if (responseText) {
    messages.push({ role: "assistant", content: responseText });
  }

  return responseText || "I apologize, but I could not generate a response.";
}

async function main() {
  checkForOpenAIKey();
  printWelcomeMessage();
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
