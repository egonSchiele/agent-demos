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
  offsiteAds = false,
}: {
  itemPrice: number;
  offsiteAds?: boolean;
}): EtsyFees {
  const listingFee = 0.2;
  const transactionFeeRate = 0.065;
  const paymentProcessingFeeRate = 0.03;
  const paymentProcessingFixedFee = 0.25;
  const offsiteAdsFeeRate = offsiteAds ? 0.12 : 0; // assuming 12% for Offsite Ads

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