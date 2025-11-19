import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph";
import { z } from "zod";
import { etsyFeesCalculator, getInput, loadingMessages, showLoading } from "./lib/util.js";

// Initialize ChatOpenAI model
const model = new ChatOpenAI({
  modelName: "gpt-4-turbo",
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Define the function tool for LangGraph
const etsyFeesCalculatorTool = new DynamicStructuredTool({
  name: "etsyFeesCalculator",
  description:
    "Calculates Etsy seller fees for a product listing, including listing fee, transaction fee, payment processing fee, and optional offsite ads fee.",
  schema: z.object({
    itemPrice: z.number().describe("The price of the Etsy item in dollars"),
    offsiteAds: z
      .union([z.boolean(), z.null()])
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

// Bind tools to the model
const modelWithTools = model.bindTools([etsyFeesCalculatorTool]);

// System prompt for the conversational agent
const systemPrompt = `You are a helpful assistant that can calculate Etsy seller fees.
When a user asks about Etsy fees or wants to know how much they'll pay in fees for selling an item on Etsy, use the etsyFeesCalculator function.
Be friendly and conversational. You can answer general questions, but your specialty is helping with Etsy fee calculations.`;

// Define the agent node - calls the model
async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await modelWithTools.invoke(state.messages);
  return { messages: [response] };
}

// Define routing logic - decides whether to call tools or end
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const lastMessage = state.messages[state.messages.length - 1];

  // If there are tool calls, continue to tools node
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }

  // Otherwise, end the conversation turn
  return END;
}

// Build the graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", new ToolNode([etsyFeesCalculatorTool]))
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, {
    tools: "tools",
    [END]: END,
  })
  .addEdge("tools", "agent");

// Add memory saver for persistent conversation
const memory = new MemorySaver();
const app = workflow.compile({ checkpointer: memory });

// Thread config for conversation continuity
const config = { configurable: { thread_id: "etsy-conversation" } };

// Track whether system message has been added
let systemMessageAdded = false;

async function chat(userInput: string): Promise<string> {
  // Build messages array
  const messages: any[] = [];

  // Add system message on first call
  if (!systemMessageAdded) {
    messages.push({ role: "system", content: systemPrompt });
    systemMessageAdded = true;
  }

  // Add user message
  messages.push({ role: "user", content: userInput });

  // Invoke the graph
  const result = await app.invoke(
    {
      messages: messages,
    },
    config
  );

  // Get the last message from the result
  const lastMessage = result.messages[result.messages.length - 1];
  return lastMessage.content || "I apologize, but I could not generate a response.";
}

async function main() {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is not set.");
    console.error("Please set it with: export OPENAI_API_KEY=your-api-key");
    process.exit(1);
  }

  console.log("Welcome to the Etsy Fees Calculator Agent!");
  console.log("I can help you calculate Etsy seller fees for your products.");
  console.log('Type "exit" or "quit" to end the conversation.\n');

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
