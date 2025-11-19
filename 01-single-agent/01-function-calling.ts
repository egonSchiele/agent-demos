import OpenAI from "openai";
import { checkForOpenAIKey, etsyFeesCalculator, getInput, loadingMessages, printWelcomeMessage, showLoading, systemPrompt } from "./lib/util.js";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the function tool for OpenAI
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
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
            type: "boolean",
            description:
              "Whether the item uses Etsy offsite ads (defaults to false)",
          },
        },
        required: ["itemPrice"],
        additionalProperties: false,
      },
    },
  },
];

// Message history to maintain conversation context
const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
  { role: "system", content: systemPrompt },
];

async function chat(userInput: string): Promise<string> {
  // Add user message to history
  messages.push({ role: "user", content: userInput });

  // Initial API call
  let response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
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
    response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: messages,
      tools: tools,
    });

    responseMessage = response.choices[0].message;
  }

  // Add final assistant response to history
  messages.push(responseMessage);
  // console.log(JSON.stringify(messages, null, 2)); // Debug: log message history
  // console.log({messages});
  return (
    responseMessage.content ||
    "I apologize, but I could not generate a response."
  );
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
