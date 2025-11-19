import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { BaseMessage } from "@langchain/core/messages";
import {
  checkForOpenAIKey,
  getInput,
  loadingMessages,
  showLoading,
  etsyFeesCalculatorLangChainTool,
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
const systemPrompt = `You are a helpful AI assistant that specializes in helping entrepreneurs start businesses on Etsy.

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
  return "__end__";
}

// Function to initialize the graph
async function initializeGraph() {
  // Define a new graph
  const workflow = new StateGraph(MessagesAnnotation)
    // Define the two nodes we will cycle between
    .addNode("agent", callModel)
    .addNode("tools", new ToolNode(tools))
    // Set the entrypoint as `agent`
    .addEdge("__start__", "agent")
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

function printCustomWelcomeMessage() {
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

async function main() {
  checkForOpenAIKey();
  printCustomWelcomeMessage();

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
