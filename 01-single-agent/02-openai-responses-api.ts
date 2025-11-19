/* function calling with structured responses example */
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { etsyFeesCalculator, getInput, loadingMessages, showLoading, systemPrompt, checkForOpenAIKey, printWelcomeMessage } from "./lib/util.js";

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

// Define a structured response schema using Zod
const ResponseSchema = z.object({
  answer: z.string().describe("The assistant's response to the user"),
  usedCalculator: z.boolean().describe("Whether the Etsy fee calculator was used"),
});

// Message history to maintain conversation context
const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
  { role: "system", content: systemPrompt },
];

async function chat(userInput: string): Promise<string> {
  // Add user message to history
  messages.push({ role: "user", content: userInput });

  // Initial API call with function calling
  let response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06", // Requires model that supports structured outputs
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

    // Get the next response from the model with structured output
    response = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: messages,
      tools: tools,
      response_format: zodResponseFormat(ResponseSchema, "response"),
    });
    responseMessage = response.choices[0].message;
  }

  // Add final assistant response to history
  messages.push(responseMessage);

  // Parse the structured response
  if (responseMessage.content) {
    try {
      const parsed = JSON.parse(responseMessage.content);
      console.log("Got this structured response back from openai:", parsed);
      return parsed.answer || responseMessage.content;
    } catch {
      // If parsing fails, return raw content
      return responseMessage.content;
    }
  }

  return "I apologize, but I could not generate a response.";
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
