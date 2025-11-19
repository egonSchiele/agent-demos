import * as readline from "readline";
import { color } from "termcolors";
export type EtsyFees = {
  listingFee: number;
  transactionFee: number;
  paymentProcessingFee: number;
  offsiteAdsFee: number;
};

export function etsyFeesCalculator({
  itemPrice,
  offsiteAds,
}: {
  itemPrice: number;
  offsiteAds: boolean | null;
}): EtsyFees {
  const listingFee = 0.2;
  const transactionFeeRate = 0.065;
  const paymentProcessingFeeRate = 0.03;
  const paymentProcessingFixedFee = 0.25;
  // Treat null as false - only charge offsite ads fee if explicitly true
  const offsiteAdsFeeRate = offsiteAds === true ? 0.12 : 0; // assuming 12% for Offsite Ads

  const transactionFee = itemPrice * transactionFeeRate;
  const paymentProcessingFee =
    itemPrice * paymentProcessingFeeRate + paymentProcessingFixedFee;
  const offsiteAdsFee = itemPrice * offsiteAdsFeeRate;

  return {
    listingFee,
    transactionFee,
    paymentProcessingFee,
    offsiteAdsFee,
  };
}

export async function getInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const userInput: string = await new Promise((resolve) => {
    rl.question(prompt, (answer: string) => {
      resolve(answer);
    });
  });
  rl.close();
  if (
    userInput.toLowerCase() === "exit" ||
    userInput.toLowerCase() === "quit"
  ) {
    console.log("\nGoodbye! Have a great day!");
    process.exit(0);
  }

  return userInput;
}

export interface LoadingController {
  stop: () => void;
}

export function showLoading(
  message: string | string[] = "Thinking..."
): LoadingController {
  const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let frameIndex = 0;

  // Handle message cycling if an array is provided
  const messages = Array.isArray(message) ? message : [message];
  let messageIndex = 0;
  let currentMessage = messages[0];

  // Update spinner animation every 80ms
  const spinnerIntervalId = setInterval(() => {
    const frame = spinnerFrames[frameIndex];
    process.stdout.write(color.red(`\r${frame} ${currentMessage}`));
    frameIndex = (frameIndex + 1) % spinnerFrames.length;
  }, 80);

  // Cycle through messages every 2 seconds if multiple messages provided
  let messageIntervalId: NodeJS.Timeout | null = null;
  if (messages.length > 1) {
    messageIntervalId = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      currentMessage = messages[messageIndex];
    }, 2000);
  }

  return {
    stop: () => {
      clearInterval(spinnerIntervalId);
      if (messageIntervalId) {
        clearInterval(messageIntervalId);
      }
      process.stdout.write("\r\x1b[K"); // Clear the line
    },
  };
}

export const loadingMessages = ["Thinking...", "Pondering..."];

export const systemPrompt = `You are a helpful assistant that can calculate Etsy seller fees.
When a user asks about Etsy fees or wants to know how much they'll pay in fees for selling an item on Etsy, use the etsyFeesCalculator function.
Be friendly and conversational. You can answer general questions, but your specialty is helping with Etsy fee calculations.`;

export const checkForOpenAIKey = () => {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is not set.");
    console.error("Please set it with: export OPENAI_API_KEY=your-api-key");
    process.exit(1);
  }
}

export const printWelcomeMessage = () => {
  console.log("Welcome to the Etsy Fees Calculator Agent!");
  console.log("I can help you calculate Etsy seller fees for your products.");
  console.log('Type "exit" or "quit" to end the conversation.\n');
}

// LangChain tool definition (shared between LangChain and LangGraph)
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const etsyFeesCalculatorSchema = z.object({
  itemPrice: z.number().describe("The price of the Etsy item in dollars"),
  offsiteAds: z
    .boolean()
    .nullish()
    .describe("Whether the item uses Etsy offsite ads (defaults to false)"),
});

export const etsyFeesCalculatorLangChainTool = new DynamicStructuredTool({
  name: "etsyFeesCalculator",
  description:
    "Calculates Etsy seller fees for a product listing, including listing fee, transaction fee, payment processing fee, and optional offsite ads fee.",
  schema: etsyFeesCalculatorSchema,
  func: async ({ itemPrice, offsiteAds }) => {
    const result = etsyFeesCalculator({
      itemPrice,
      offsiteAds: offsiteAds ?? null,
    });
    return JSON.stringify(result);
  },
});