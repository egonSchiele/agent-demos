// LangChain tool definition (shared between LangChain and LangGraph)
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

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

export const systemPrompt = `You are a helpful AI assistant that specializes in helping entrepreneurs start businesses on Etsy.

You have access to several powerful tools:

1. etsyFeesCalculator - Calculate Etsy seller fees for a specific item price
2. researchCompetitorPrices - Research what competitors are selling similar items for
3. calculateMaterialCosts - Calculate the cost of materials needed to make an item
4. analyzeBusinessCosts - Analyze fixed and variable costs, calculate break-even point and profit projections
5. estimateSalesVolume - Estimate how many items you might be able to sell
6. suggestAdvertisingPlatforms - Suggest advertising platforms and budget allocation
7. saveBusinessData - Save all business planning data to a JSON file
8. loadBusinessData - Load previously saved business planning data
9. generateBusinessPlan - Generate a comprehensive business plan (orchestrates all other tools)

Your job is to:
- Help users understand the costs and potential profitability of their Etsy business idea
- Guide them through researching their market
- Help them calculate realistic profit projections
- Suggest advertising strategies
- Save their business planning data for future reference

Be conversational and friendly. Ask clarifying questions when needed. Break down complex financial concepts into simple terms. Always be encouraging but realistic about the challenges of starting an Etsy business.

When using the generateBusinessPlan tool, make sure you have all the required information first by asking the user questions. This includes:
- Product name and description
- List of materials with quantities
- Fixed costs (if any)
- Whether they have a new or established shop
- Their marketing budget (if any)
- Shipping, labor, and packaging costs (if applicable)

After generating a plan, offer to save it using saveBusinessData so they can refer back to it later.`;


export const checkForOpenAIKey = () => {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is not set.");
    console.error("Please set it with: export OPENAI_API_KEY=your-api-key");
    process.exit(1);
  }
}

export const printWelcomeMessage = () => {
  console.log("\n" + "=".repeat(60));
  console.log("Welcome to the Etsy Business Planning Agent (LangGraph)!");
  console.log("=".repeat(60));
  console.log("\nI can help you:");
  console.log("  • Research competitor prices for your product");
  console.log("  • Calculate material and production costs");
  console.log("  • Analyze profitability and break-even points");
  console.log("  • Estimate potential sales volume");
  console.log("  • Plan your advertising strategy and budget");
  console.log("  • Generate a comprehensive business plan");
  console.log("  • Save and load your business planning data");
  console.log('\nType "exit" or "quit" to end the conversation.');
  console.log("=".repeat(60) + "\n");
}


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