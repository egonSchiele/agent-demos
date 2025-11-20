import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";
import { z } from "zod";
import {
  checkForOpenAIKey,
  etsyFeesCalculator,
  getInput,
  loadingMessages,
  printWelcomeMessage,
  showLoading,
  systemPrompt,
} from "./lib/util.js";

const etsyFeesCalculatorTool = tool(
  (args) => {
    const result = etsyFeesCalculator(args);
    return JSON.stringify(result);
  },
  {
    name: "etsyFeesCalculator",
    description:
      "Calculates Etsy seller fees for a product listing, including listing fee, transaction fee, payment processing fee, and optional offsite ads fee.",
    schema: z.object({
      itemPrice: z.number().describe("The price of the Etsy item in dollars"),
      offsiteAds: z
        .boolean()
        .nullable()
        .describe(
          "Whether the item uses Etsy offsite ads (use null or false if not applicable)"
        ),
    }),
  }
);

const agent = createAgent({
  model: "gpt-4-turbo",
  tools: [etsyFeesCalculatorTool],
});

// Message history to maintain conversation context
const messages = [{ role: "system", content: systemPrompt }];

async function chat(userInput: string): Promise<string> {
  // Add user message to history
  messages.push({ role: "user", content: userInput });

  // Invoke the model with tools
  let response = await agent.invoke({ messages });

  const message = response.messages[response.messages.length - 1];

  // Add final assistant response to history
  messages.push({ role: "assistant", content: String(message.content) });
  return String(message.content);
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
