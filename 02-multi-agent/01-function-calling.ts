import OpenAI from "openai";
import {
  checkForOpenAIKey,
  etsyFeesCalculator,
  getInput,
  loadingMessages,
  printWelcomeMessage,
  showLoading,
} from "./lib/util.js";
import {
  researchCompetitorPrices,
  researchCompetitorPricesTool,
} from "./lib/tools/marketResearch.js";
import {
  calculateMaterialCosts,
  calculateMaterialCostsTool,
} from "./lib/tools/materialCosts.js";
import {
  analyzeBusinessCosts,
  analyzeBusinessCostsTool,
} from "./lib/tools/costAnalysis.js";
import {
  estimateSalesVolume,
  estimateSalesVolumeTool,
} from "./lib/tools/salesEstimation.js";
import {
  suggestAdvertisingPlatforms,
  suggestAdvertisingPlatformsTool,
} from "./lib/tools/advertising.js";
import {
  saveBusinessData,
  saveBusinessDataTool,
  loadBusinessData,
  loadBusinessDataTool,
} from "./lib/tools/dataManagement.js";
import {
  generateBusinessPlan,
  generateBusinessPlanTool,
} from "./lib/tools/businessPlan.js";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define all tools for OpenAI
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
  researchCompetitorPricesTool,
  calculateMaterialCostsTool,
  analyzeBusinessCostsTool,
  estimateSalesVolumeTool,
  suggestAdvertisingPlatformsTool,
  saveBusinessDataTool,
  loadBusinessDataTool,
  generateBusinessPlanTool,
];

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
      if (toolCall.type === "function") {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        let result: any;

        // Route to appropriate function
        switch (functionName) {
          case "etsyFeesCalculator":
            result = etsyFeesCalculator({
              itemPrice: args.itemPrice,
              offsiteAds: args.offsiteAds,
            });
            break;

          case "researchCompetitorPrices":
            result = researchCompetitorPrices({
              itemName: args.itemName,
              itemDescription: args.itemDescription,
              numberOfListings: args.numberOfListings,
            });
            break;

          case "calculateMaterialCosts":
            result = calculateMaterialCosts({
              materials: args.materials,
            });
            break;

          case "analyzeBusinessCosts":
            result = analyzeBusinessCosts({
              fixedCosts: args.fixedCosts,
              variableCosts: args.variableCosts,
              sellingPrice: args.sellingPrice,
              salesVolumes: args.salesVolumes,
            });
            break;

          case "estimateSalesVolume":
            result = estimateSalesVolume({
              itemName: args.itemName,
              competitorPrice: args.competitorPrice,
              isNewShop: args.isNewShop,
              marketingBudget: args.marketingBudget,
              timeHorizon: args.timeHorizon,
            });
            break;

          case "suggestAdvertisingPlatforms":
            result = suggestAdvertisingPlatforms({
              productCategory: args.productCategory,
              monthlyBudget: args.monthlyBudget,
              targetAudience: args.targetAudience,
            });
            break;

          case "saveBusinessData":
            result = saveBusinessData({
              businessName: args.businessName,
              data: args.data,
              filename: args.filename,
            });
            break;

          case "loadBusinessData":
            result = loadBusinessData({
              filename: args.filename,
            });
            break;

          case "generateBusinessPlan":
            result = generateBusinessPlan(args);
            break;

          default:
            result = { error: `Unknown function: ${functionName}` };
        }

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

  return (
    responseMessage.content ||
    "I apologize, but I could not generate a response."
  );
}

function printCustomWelcomeMessage() {
  console.log("\n=".repeat(60));
  console.log("Welcome to the Etsy Business Planning Agent!");
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
