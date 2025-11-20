import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";
import {
  checkForOpenAIKey,
  getInput,
  loadingMessages,
  showLoading,
  etsyFeesCalculator,
  etsyFeesCalculatorSchema,
  systemPrompt,
  printWelcomeMessage,
} from "./lib/util.js";
import {
  researchCompetitorPrices,
  researchCompetitorPricesSchema,
} from "./lib/tools/marketResearch.js";
import {
  calculateMaterialCosts,
  calculateMaterialCostsSchema,
} from "./lib/tools/materialCosts.js";
import {
  analyzeBusinessCosts,
  analyzeBusinessCostsSchema,
} from "./lib/tools/costAnalysis.js";
import {
  estimateSalesVolume,
  estimateSalesVolumeSchema,
} from "./lib/tools/salesEstimation.js";
import {
  suggestAdvertisingPlatforms,
  suggestAdvertisingPlatformsSchema,
} from "./lib/tools/advertising.js";
import {
  saveBusinessData,
  saveBusinessDataSchema,
  loadBusinessData,
  loadBusinessDataSchema,
} from "./lib/tools/dataManagement.js";
import {
  generateBusinessPlan,
  generateBusinessPlanSchema,
} from "./lib/tools/businessPlan.js";
import { z } from "zod";

// Define all tools using the new tool() API
const etsyFeesCalculatorTool = tool(
  (args) => {
    const result = etsyFeesCalculator(args);
    return JSON.stringify(result);
  },
  {
    name: "etsyFeesCalculator",
    description:
      "Calculates Etsy seller fees for a product listing, including listing fee, transaction fee, payment processing fee, and optional offsite ads fee.",
    schema: etsyFeesCalculatorSchema,
  }
);

const researchCompetitorPricesTool = tool(
  (args) => {
    const result = researchCompetitorPrices({
      itemName: args.itemName,
      itemDescription: args.itemDescription ?? undefined,
      numberOfListings: args.numberOfListings ?? undefined,
    });
    return JSON.stringify(result);
  },
  {
    name: "researchCompetitorPrices",
    description:
      "Research what competitors are selling similar items for on Etsy. Returns price statistics, competitor listings, and suggested pricing based on market data.",
    schema: researchCompetitorPricesSchema,
  }
);

const calculateMaterialCostsTool = tool(
  (args) => {
    const result = calculateMaterialCosts({
      materials: args.materials,
    });
    return JSON.stringify(result);
  },
  {
    name: "calculateMaterialCosts",
    description:
      "Calculate the total cost of materials needed for creating a product. Supports both per-item and bulk pricing calculations.",
    schema: calculateMaterialCostsSchema,
  }
);

const analyzeBusinessCostsTool = tool(
  (args) => {
    const result = analyzeBusinessCosts({
      monthlyFixedCosts: args.monthlyFixedCosts ?? undefined,
      itemPrice: args.itemPrice,
      materialCost: args.materialCost,
      etsyFees: args.etsyFees,
      laborHours: args.laborHours ?? undefined,
      hourlyRate: args.hourlyRate ?? undefined,
    });
    return JSON.stringify(result);
  },
  {
    name: "analyzeBusinessCosts",
    description:
      "Analyze all business costs including materials, labor, Etsy fees, and fixed costs. Calculates profit margins and break-even analysis.",
    schema: analyzeBusinessCostsSchema,
  }
);

const estimateSalesVolumeTool = tool(
  (args) => {
    const result = estimateSalesVolume({
      itemName: args.itemName,
      price: args.price,
      marketData: args.marketData ?? undefined,
    });
    return JSON.stringify(result);
  },
  {
    name: "estimateSalesVolume",
    description:
      "Estimate potential sales volume for a product based on market data, price point, and competition analysis.",
    schema: estimateSalesVolumeSchema,
  }
);

const suggestAdvertisingPlatformsTool = tool(
  (args) => {
    const result = suggestAdvertisingPlatforms({
      itemName: args.itemName,
      budget: args.budget ?? undefined,
      targetAudience: args.targetAudience ?? undefined,
    });
    return JSON.stringify(result);
  },
  {
    name: "suggestAdvertisingPlatforms",
    description:
      "Suggest advertising platforms and strategies based on product type, budget, and target audience.",
    schema: suggestAdvertisingPlatformsSchema,
  }
);

const saveBusinessDataTool = tool(
  (args) => {
    const result = saveBusinessData({
      businessData: args.businessData,
    });
    return JSON.stringify(result);
  },
  {
    name: "saveBusinessData",
    description:
      "Save business planning data to a file for future reference. Stores all calculations, market research, and business decisions.",
    schema: saveBusinessDataSchema,
  }
);

const loadBusinessDataTool = tool(
  (args) => {
    const result = loadBusinessData({
      filename: args.filename ?? undefined,
    });
    return JSON.stringify(result);
  },
  {
    name: "loadBusinessData",
    description:
      "Load previously saved business planning data from a file. Returns all stored calculations and decisions.",
    schema: loadBusinessDataSchema,
  }
);

const generateBusinessPlanTool = tool(
  (args) => {
    const result = generateBusinessPlan({
      businessName: args.businessName,
      itemName: args.itemName,
      itemDescription: args.itemDescription ?? undefined,
      marketResearch: args.marketResearch ?? undefined,
      costAnalysis: args.costAnalysis ?? undefined,
      salesEstimate: args.salesEstimate ?? undefined,
    });
    return JSON.stringify(result);
  },
  {
    name: "generateBusinessPlan",
    description:
      "Generate a comprehensive business plan document based on all the research and analysis performed.",
    schema: generateBusinessPlanSchema,
  }
);

// Create agent with all tools
const agent = createAgent({
  model: "gpt-4-turbo",
  tools: [
    etsyFeesCalculatorTool,
    researchCompetitorPricesTool,
    calculateMaterialCostsTool,
    analyzeBusinessCostsTool,
    estimateSalesVolumeTool,
    suggestAdvertisingPlatformsTool,
    saveBusinessDataTool,
    loadBusinessDataTool,
    generateBusinessPlanTool,
  ],
});

// Message history to maintain conversation context
const messages = [{ role: "system", content: systemPrompt }];

async function chat(userInput: string): Promise<string> {
  // Add user message to history
  messages.push({ role: "user", content: userInput });

  // Invoke the agent with tools
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
