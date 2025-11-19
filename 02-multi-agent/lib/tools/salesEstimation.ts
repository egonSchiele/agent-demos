import OpenAI from "openai";

export interface SalesEstimate {
  scenario: "conservative" | "moderate" | "optimistic";
  monthlySales: number;
  quarterlySales: number;
  annualSales: number;
  monthlyRevenue: number;
  quarterlyRevenue: number;
  annualRevenue: number;
}

export interface SalesEstimationResult {
  itemName: string;
  estimatedPrice: number;
  timeHorizon: string;
  estimates: SalesEstimate[];
  keyFactors: string[];
  recommendations: string[];
  comparableShops: {
    shopName: string;
    monthlySales: number;
    shopAge: string;
    pricePoint: string;
  }[];
}

export interface EstimateSalesVolumeParams {
  itemName: string;
  competitorPrice: number;
  isNewShop: boolean;
  marketingBudget?: number;
  timeHorizon?: "monthly" | "quarterly" | "annually";
}

export function estimateSalesVolume({
  itemName,
  competitorPrice,
  isNewShop,
  marketingBudget = 0,
  timeHorizon = "monthly",
}: EstimateSalesVolumeParams): SalesEstimationResult {
  // Mock data - in a real implementation, this would analyze actual Etsy shop data

  // Base estimates for a typical item (monthly)
  let baseConservative = isNewShop ? 5 : 15;
  let baseModerate = isNewShop ? 15 : 40;
  let baseOptimistic = isNewShop ? 30 : 80;

  // Adjust based on marketing budget
  const marketingMultiplier = 1 + (marketingBudget / 200) * 0.5; // Each $200 adds 50% boost
  baseConservative = Math.round(baseConservative * marketingMultiplier);
  baseModerate = Math.round(baseModerate * marketingMultiplier);
  baseOptimistic = Math.round(baseOptimistic * marketingMultiplier);

  // Generate estimates
  const estimates: SalesEstimate[] = [
    {
      scenario: "conservative",
      monthlySales: baseConservative,
      quarterlySales: baseConservative * 3,
      annualSales: baseConservative * 12,
      monthlyRevenue: Math.round(baseConservative * competitorPrice * 100) / 100,
      quarterlyRevenue: Math.round(baseConservative * 3 * competitorPrice * 100) / 100,
      annualRevenue: Math.round(baseConservative * 12 * competitorPrice * 100) / 100,
    },
    {
      scenario: "moderate",
      monthlySales: baseModerate,
      quarterlySales: baseModerate * 3,
      annualSales: baseModerate * 12,
      monthlyRevenue: Math.round(baseModerate * competitorPrice * 100) / 100,
      quarterlyRevenue: Math.round(baseModerate * 3 * competitorPrice * 100) / 100,
      annualRevenue: Math.round(baseModerate * 12 * competitorPrice * 100) / 100,
    },
    {
      scenario: "optimistic",
      monthlySales: baseOptimistic,
      quarterlySales: baseOptimistic * 3,
      annualSales: baseOptimistic * 12,
      monthlyRevenue: Math.round(baseOptimistic * competitorPrice * 100) / 100,
      quarterlyRevenue: Math.round(baseOptimistic * 3 * competitorPrice * 100) / 100,
      annualRevenue: Math.round(baseOptimistic * 12 * competitorPrice * 100) / 100,
    },
  ];

  // Key factors affecting sales
  const keyFactors: string[] = [
    isNewShop
      ? "New shop status - expect lower initial sales as you build reputation"
      : "Established shop - benefit from existing reviews and search ranking",
    `Price point of $${competitorPrice} - ${competitorPrice < 25 ? "affordable impulse buy range" : competitorPrice < 50 ? "moderate price point" : "premium pricing"}`,
    marketingBudget > 0
      ? `Marketing budget of $${marketingBudget}/month will boost visibility`
      : "No dedicated marketing budget - relying on organic traffic",
    "Competition level in your niche",
    "Quality of product photos and descriptions",
    "Customer reviews and ratings",
    "Seasonal trends and demand fluctuations",
  ];

  // Recommendations
  const recommendations: string[] = [];

  if (isNewShop) {
    recommendations.push(
      "As a new shop, focus on getting your first 10-20 sales and reviews to build credibility"
    );
    recommendations.push(
      "Consider offering a launch discount to attract initial customers"
    );
  }

  if (marketingBudget === 0) {
    recommendations.push(
      "Consider allocating $50-100/month for Etsy Ads to increase visibility"
    );
  } else if (marketingBudget < 50) {
    recommendations.push(
      "Your marketing budget is quite low. Consider increasing to $50-100/month for better results"
    );
  }

  if (competitorPrice > 50) {
    recommendations.push(
      "Higher price points typically mean lower sales volume but higher profit margins"
    );
  }

  recommendations.push(
    "Invest in high-quality product photography - it's the #1 factor in Etsy conversions"
  );
  recommendations.push(
    "Optimize your titles and tags for Etsy SEO to improve organic discovery"
  );

  // Mock comparable shops
  const comparableShops = [
    {
      shopName: "CraftyCreations",
      monthlySales: 45,
      shopAge: "2 years",
      pricePoint: `$${competitorPrice - 5} - $${competitorPrice + 5}`,
    },
    {
      shopName: "ArtisanMakers",
      monthlySales: 78,
      shopAge: "4 years",
      pricePoint: `$${competitorPrice - 3} - $${competitorPrice + 8}`,
    },
    {
      shopName: "HandmadeByAlex",
      monthlySales: 32,
      shopAge: "1 year",
      pricePoint: `$${competitorPrice - 8} - $${competitorPrice + 2}`,
    },
  ];

  return {
    itemName,
    estimatedPrice: competitorPrice,
    timeHorizon,
    estimates,
    keyFactors,
    recommendations,
    comparableShops,
  };
}

// OpenAI function definition
export const estimateSalesVolumeTool: OpenAI.Chat.Completions.ChatCompletionTool =
  {
    type: "function",
    function: {
      name: "estimateSalesVolume",
      description:
        "Estimate how many items you might be able to sell on Etsy based on market analysis, shop status, and marketing efforts. Provides conservative, moderate, and optimistic scenarios.",
      parameters: {
        type: "object",
        properties: {
          itemName: {
            type: "string",
            description: "The item to estimate sales for",
          },
          competitorPrice: {
            type: "number",
            description: "Average market price for similar items",
          },
          isNewShop: {
            type: "boolean",
            description: "Whether this is a new Etsy shop or established shop",
          },
          marketingBudget: {
            type: "number",
            description:
              "Monthly advertising budget in dollars (optional, default: 0)",
          },
          timeHorizon: {
            type: "string",
            enum: ["monthly", "quarterly", "annually"],
            description:
              "Time period for estimates (optional, default: monthly)",
          },
        },
        required: ["itemName", "competitorPrice", "isNewShop"],
        additionalProperties: false,
      },
    },
  };

// LangChain tool definition (shared between LangChain and LangGraph)
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const estimateSalesVolumeSchema = z.object({
  itemName: z.string().describe("The item to estimate sales for"),
  competitorPrice: z.number().describe("Average market price for similar items"),
  isNewShop: z
    .boolean()
    .describe("Whether this is a new Etsy shop or established shop"),
  marketingBudget: z
    .number()
    .nullish()
    .describe("Monthly advertising budget in dollars (optional, default: 0)"),
  timeHorizon: z
    .enum(["monthly", "quarterly", "annually"])
    .nullish()
    .describe("Time period for estimates (optional, default: monthly)"),
});

export const estimateSalesVolumeLangChainTool = new DynamicStructuredTool({
  name: "estimateSalesVolume",
  description:
    "Estimate how many items you might be able to sell on Etsy based on market analysis, shop status, and marketing efforts. Provides conservative, moderate, and optimistic scenarios.",
  schema: estimateSalesVolumeSchema,
  func: async ({ itemName, competitorPrice, isNewShop, marketingBudget, timeHorizon }) => {
    const result = estimateSalesVolume({
      itemName,
      competitorPrice,
      isNewShop,
      marketingBudget: marketingBudget ?? undefined,
      timeHorizon: timeHorizon ?? undefined,
    });
    return JSON.stringify(result);
  },
});
