import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
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

// Create prompt template
const prompt = ChatPromptTemplate.fromMessages([
  ["system", systemPrompt],
  ["placeholder", "{chat_history}"],
  ["human", "{input}"],
  ["placeholder", "{agent_scratchpad}"],
]);

// Function to initialize agent
async function initializeAgent() {
  // Create agent
  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools,
    prompt,
  });

  // Create agent executor
  const agentExecutor = new AgentExecutor({
    agent,
    tools,
    verbose: false,
  });

  return agentExecutor;
}

// Chat history
const chatHistory: Array<{ role: string; content: string }> = [];

async function chat(agentExecutor: AgentExecutor, userInput: string): Promise<string> {
  // Add user message to history
  chatHistory.push({ role: "human", content: userInput });

  // Invoke agent
  const result = await agentExecutor.invoke({
    input: userInput,
    chat_history: chatHistory,
  });

  // Add assistant response to history
  chatHistory.push({ role: "assistant", content: result.output });

  return result.output;
}



async function main() {
  checkForOpenAIKey();
  printWelcomeMessage();

  // Initialize agent
  const agentExecutor = await initializeAgent();

  // Interactive loop
  while (true) {
    const userInput = await getInput("You: ");

    // Skip empty inputs
    if (!userInput.trim()) {
      continue;
    }

    const loading = showLoading(loadingMessages);
    try {
      const response = await chat(agentExecutor, userInput);
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
