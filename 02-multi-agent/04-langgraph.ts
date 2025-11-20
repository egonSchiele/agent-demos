import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, MessagesAnnotation, END, START } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { BaseMessage } from "@langchain/core/messages";
import {
  checkForOpenAIKey,
  getInput,
  loadingMessages,
  showLoading,
  etsyFeesCalculatorLangChainTool,
  systemPrompt,
  printWelcomeMessage,
} from "./lib/util.js";
import { researchCompetitorPricesLangChainTool } from "./lib/tools/marketResearch.js";
import { calculateMaterialCostsLangChainTool } from "./lib/tools/materialCosts.js";
import { analyzeBusinessCostsLangChainTool } from "./lib/tools/costAnalysis.js";
import { estimateSalesVolumeLangChainTool } from "./lib/tools/salesEstimation.js";
import { suggestAdvertisingPlatformsLangChainTool } from "./lib/tools/advertising.js";
import {
  saveBusinessDataLangChainTool,
  loadBusinessDataLangChainTool,
} from "./lib/tools/dataManagement.js";
import { generateBusinessPlanLangChainTool } from "./lib/tools/businessPlan.js";

// System prompt for the Etsy business agent
// Initialize LLM
const llm = new ChatOpenAI({
  modelName: "gpt-4-turbo",
  temperature: 0,
});

// Define all tools
const tools = [
  etsyFeesCalculatorLangChainTool,
  researchCompetitorPricesLangChainTool,
  calculateMaterialCostsLangChainTool,
  analyzeBusinessCostsLangChainTool,
  estimateSalesVolumeLangChainTool,
  suggestAdvertisingPlatformsLangChainTool,
  saveBusinessDataLangChainTool,
  loadBusinessDataLangChainTool,
  generateBusinessPlanLangChainTool,
];

// Bind tools to LLM
const llmWithTools = llm.bindTools(tools);

// Define the function that calls the model
async function callModel(state: typeof MessagesAnnotation.State) {
  const messages = state.messages;

  // Add system message if this is the first message
  const messagesToSend = messages.length === 0 || messages[0].getType() !== "system"
    ? [{ role: "system", content: systemPrompt } as any, ...messages]
    : messages;

  const response = await llmWithTools.invoke(messagesToSend);
  return { messages: [response] };
}

// Define the function that determines whether to continue or end
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as BaseMessage;

  // If the LLM makes a tool call, then we route to the "tools" node
  if ((lastMessage as any).tool_calls && (lastMessage as any).tool_calls.length > 0) {
    return "tools";
  }
  // Otherwise, we stop (reply to the user)
  return END;
}

// Function to initialize the graph
async function initializeGraph() {
  // Define a new graph
  const workflow = new StateGraph(MessagesAnnotation)
    // Define the two nodes we will cycle between
    .addNode("agent", callModel)
    .addNode("tools", new ToolNode(tools))
    // Set the entrypoint as `agent`
    .addEdge(START, "agent")
    // Add a conditional edge
    .addConditionalEdges("agent", shouldContinue)
    // Add a normal edge from `tools` to `agent`
    .addEdge("tools", "agent");

  // Compile the graph
  const app = workflow.compile();
  return app;
}

// Function to run the agent
async function chat(app: any, userInput: string): Promise<string> {
  const finalState = await app.invoke({
    messages: [{ role: "user", content: userInput }],
  });

  // Get the last message (the agent's response)
  const messages = finalState.messages;
  const lastMessage = messages[messages.length - 1];
  return lastMessage.content;
}

async function main() {
  checkForOpenAIKey();
  printWelcomeMessage();

  // Initialize graph
  const app = await initializeGraph();

  // Interactive loop
  while (true) {
    const userInput = await getInput("You: ");

    // Skip empty inputs
    if (!userInput.trim()) {
      continue;
    }

    const loading = showLoading(loadingMessages);
    try {
      const response = await chat(app, userInput);
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
