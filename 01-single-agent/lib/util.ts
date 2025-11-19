import * as readline from "readline";

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
  if (
    userInput.toLowerCase() === "exit" ||
    userInput.toLowerCase() === "quit"
  ) {
    console.log("\nGoodbye! Have a great day!");
    rl.close();
    process.exit(0);
  }

  return userInput;
}
