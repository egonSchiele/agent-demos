import { OpenRouter } from "@openrouter/sdk";
import { etsyFeesCalculator, getInput, loadingMessages, printWelcomeMessage, showLoading, systemPrompt } from "./lib/util.js";
import { AssistantMessage } from "@openrouter/sdk/models";

const model = "anthropic/claude-3.5-sonnet";
// Initialize OpenRouter client
const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Define the function tool for OpenRouter (same format as OpenAI)
const tools = [
  {
    type: "function" as const,
    function: {
      name: "etsyFeesCalculator",
      description:
        "Calculates Etsy seller fees for a product listing, including listing fee, transaction fee, payment processing fee, and optional offsite ads fee.",
      parameters: {
        type: "object",
        properties: {
          itemPrice: {
            type: "number",
            description: "The price of the Etsy item in dollars",
          },
          offsiteAds: {
            type: ["boolean", "null"],
            description:
              "Whether the item uses Etsy offsite ads (use null or false if not applicable)",
          },
        },
        required: ["itemPrice", "offsiteAds"],
        additionalProperties: false,
      },
    },
  },
];

// Message history to maintain conversation context
const messages: any[] = [
  { role: "system", content: systemPrompt },
];

async function chat(userInput: string): Promise<AssistantMessage["content"]> {
  // Add user message to history
  messages.push({ role: "user", content: userInput });

  // Initial API call
  let response = await openrouter.chat.send({
    model,
    messages: messages,
    tools: tools,
  });

  let responseMessage = response.choices[0].message;

  // Handle function calls
  while (responseMessage.toolCalls && responseMessage.toolCalls.length > 0) {
    // Add assistant's response with tool calls to message history
    messages.push(responseMessage);

    // Process each tool call
    for (const toolCall of responseMessage.toolCalls) {
      if (
        toolCall.type === "function" &&
        toolCall.function.name === "etsyFeesCalculator"
      ) {
        const args = JSON.parse(toolCall.function.arguments);

        // Call the actual function
        const result = etsyFeesCalculator({
          itemPrice: args.itemPrice,
          offsiteAds: args.offsiteAds,
        });

        // Add function result to messages
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    // Get the next response from the model
    response = await openrouter.chat.send({
      model,
      messages: messages,
      tools: tools,
    });

    responseMessage = response.choices[0].message;
  }

  // Add final assistant response to history
  messages.push(responseMessage);

  return (
    responseMessage.content ||
    "I apologize, but I could not generate a response."
  );
}

async function main() {
  // Check for API key
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Error: OPENROUTER_API_KEY environment variable is not set.");
    console.error("Please set it with: export OPENROUTER_API_KEY=your-api-key");
    console.error("\nYou can get an API key from: https://openrouter.ai/keys");
    process.exit(1);
  }

  printWelcomeMessage();
  console.log("Using model:", model);


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
