import OpenAI from "openai";
import { researchCompetitorPrices, MarketResearchResult } from "./marketResearch.js";
import { calculateMaterialCosts, Material, MaterialCostsResult } from "./materialCosts.js";
import { analyzeBusinessCosts, FixedCost, VariableCosts, CostAnalysisResult } from "./costAnalysis.js";
import { estimateSalesVolume, SalesEstimationResult } from "./salesEstimation.js";
import { suggestAdvertisingPlatforms, AdvertisingResult } from "./advertising.js";
import { EtsyFees } from "../util.js";

export interface BusinessPlanInput {
  productName: string;
  productDescription?: string;
  productCategory: string;
  materials: Material[];
  fixedCosts: FixedCost[];
  etsyFees: EtsyFees;
  isNewShop: boolean;
  targetMonthlyIncome?: number;
  marketingBudget?: number;
  shippingCostPerItem?: number;
  laborCostPerItem?: number;
  packagingCostPerItem?: number;
}

export interface BusinessPlanResult {
  summary: {
    productName: string;
    recommendedPrice: number;
    breakEvenUnits: number;
    estimatedMonthlySales: number;
    estimatedMonthlyProfit: number;
    viabilityScore: "Low" | "Moderate" | "High";
    keyInsights: string[];
  };
  marketResearch: MarketResearchResult;
  materialCosts: MaterialCostsResult;
  costAnalysis: CostAnalysisResult;
  salesEstimates: SalesEstimationResult;
  advertisingPlan: AdvertisingResult;
  actionItems: string[];
  risks: string[];
}

export function generateBusinessPlan(
  input: BusinessPlanInput
): BusinessPlanResult {
  // Step 1: Research competitor prices
  const marketResearch = researchCompetitorPrices({
    itemName: input.productName,
    itemDescription: input.productDescription,
    numberOfListings: 10,
  });

  // Step 2: Calculate material costs
  const materialCosts = calculateMaterialCosts({
    materials: input.materials,
  });

  // Step 3: Calculate Etsy fees for the suggested price
  const suggestedPrice = marketResearch.suggestedPrice.mid;
  const totalEtsyFees =
    input.etsyFees.listingFee +
    input.etsyFees.transactionFee +
    input.etsyFees.paymentProcessingFee +
    input.etsyFees.offsiteAdsFee;

  // Step 4: Analyze business costs
  const variableCosts: VariableCosts = {
    materials: materialCosts.totalCost,
    etsyFees: totalEtsyFees,
    shipping: input.shippingCostPerItem,
    labor: input.laborCostPerItem,
    packaging: input.packagingCostPerItem,
  };

  const costAnalysis = analyzeBusinessCosts({
    fixedCosts: input.fixedCosts,
    variableCosts,
    sellingPrice: suggestedPrice,
    salesVolumes: [10, 25, 50, 100, 200],
  });

  // Step 5: Estimate sales volume
  const salesEstimates = estimateSalesVolume({
    itemName: input.productName,
    competitorPrice: suggestedPrice,
    isNewShop: input.isNewShop,
    marketingBudget: input.marketingBudget,
    timeHorizon: "monthly",
  });

  // Step 6: Suggest advertising platforms
  const advertisingPlan = suggestAdvertisingPlatforms({
    productCategory: input.productCategory,
    monthlyBudget: input.marketingBudget || 50,
    targetAudience: input.productDescription,
  });

  // Calculate viability and key metrics
  const moderateSalesEstimate = salesEstimates.estimates.find(
    (e) => e.scenario === "moderate"
  )!.monthlySales;

  // Find the profit projection closest to moderate sales estimate
  const relevantProjection = costAnalysis.projections.reduce((prev, curr) => {
    return Math.abs(curr.salesVolume - moderateSalesEstimate) <
      Math.abs(prev.salesVolume - moderateSalesEstimate)
      ? curr
      : prev;
  });

  const estimatedMonthlyProfit = relevantProjection.netProfit;

  // Determine viability score
  let viabilityScore: "Low" | "Moderate" | "High";
  if (
    costAnalysis.contributionMarginPercent < 30 ||
    costAnalysis.breakEvenUnits > moderateSalesEstimate
  ) {
    viabilityScore = "Low";
  } else if (
    costAnalysis.contributionMarginPercent > 50 &&
    estimatedMonthlyProfit > (input.targetMonthlyIncome || 500)
  ) {
    viabilityScore = "High";
  } else {
    viabilityScore = "Moderate";
  }

  // Generate key insights
  const keyInsights: string[] = [];

  keyInsights.push(
    `Market research shows similar items sell for $${marketResearch.statistics.min}-$${marketResearch.statistics.max}, with an average of $${marketResearch.statistics.average}`
  );

  keyInsights.push(
    `Your material costs are $${materialCosts.totalCost} per item, representing ${Math.round((materialCosts.totalCost / suggestedPrice) * 100)}% of the suggested selling price`
  );

  keyInsights.push(
    `You need to sell ${costAnalysis.breakEvenUnits} items per month to break even, and moderate estimates suggest ${moderateSalesEstimate} monthly sales`
  );

  if (estimatedMonthlyProfit > 0) {
    keyInsights.push(
      `At moderate sales volume, you could make approximately $${Math.round(estimatedMonthlyProfit)} per month`
    );
  } else {
    keyInsights.push(
      `At moderate sales volume, you would lose approximately $${Math.abs(Math.round(estimatedMonthlyProfit))} per month`
    );
  }

  if (materialCosts.potentialSavings > 0) {
    keyInsights.push(
      `You could save $${materialCosts.potentialSavings} per item by buying materials in bulk`
    );
  }

  // Generate action items
  const actionItems: string[] = [];

  actionItems.push(
    `Set up your Etsy shop and create a listing for ${input.productName} at $${suggestedPrice}`
  );

  actionItems.push(
    "Take high-quality product photos - this is critical for Etsy success"
  );

  actionItems.push(
    "Write a detailed product description highlighting what makes your item unique"
  );

  if (input.marketingBudget && input.marketingBudget > 0) {
    actionItems.push(
      `Allocate your $${input.marketingBudget} marketing budget according to the advertising plan`
    );
  } else {
    actionItems.push(
      "Consider setting aside $50-100/month for Etsy Ads to boost visibility"
    );
  }

  if (materialCosts.potentialSavings > 0) {
    actionItems.push(
      "Look into buying materials in bulk to reduce per-item costs"
    );
  }

  actionItems.push(
    "Focus on getting your first 10-20 sales to build reviews and credibility"
  );

  actionItems.push(
    "Track your actual costs and sales to refine your pricing and projections"
  );

  // Identify risks
  const risks: string[] = [];

  if (costAnalysis.breakEvenUnits > moderateSalesEstimate) {
    risks.push(
      "Your break-even point is higher than moderate sales estimates. You may need to increase prices or reduce costs."
    );
  }

  if (costAnalysis.contributionMarginPercent < 30) {
    risks.push(
      "Your contribution margin is low, leaving little room for profit. Price increases or cost reductions are recommended."
    );
  }

  if (input.isNewShop) {
    risks.push(
      "As a new shop, it may take 3-6 months to build visibility and consistent sales."
    );
  }

  if (!input.laborCostPerItem || input.laborCostPerItem === 0) {
    risks.push(
      "You haven't included labor costs. Make sure you're valuing your time appropriately."
    );
  }

  const materialPercentage =
    (materialCosts.totalCost / suggestedPrice) * 100;
  if (materialPercentage > 50) {
    risks.push(
      "Material costs are more than 50% of your selling price, which may squeeze profit margins."
    );
  }

  if (!input.marketingBudget || input.marketingBudget < 50) {
    risks.push(
      "With limited or no marketing budget, you'll be relying heavily on organic traffic, which can be slow to build."
    );
  }

  return {
    summary: {
      productName: input.productName,
      recommendedPrice: suggestedPrice,
      breakEvenUnits: costAnalysis.breakEvenUnits,
      estimatedMonthlySales: moderateSalesEstimate,
      estimatedMonthlyProfit: Math.round(estimatedMonthlyProfit * 100) / 100,
      viabilityScore,
      keyInsights,
    },
    marketResearch,
    materialCosts,
    costAnalysis,
    salesEstimates,
    advertisingPlan,
    actionItems,
    risks,
  };
}

// OpenAI function definition
export const generateBusinessPlanTool: OpenAI.Chat.Completions.ChatCompletionTool =
  {
    type: "function",
    function: {
      name: "generateBusinessPlan",
      description:
        "Generate a comprehensive business plan for an Etsy product. This orchestrates all other tools to research competitors, calculate costs, estimate sales, plan advertising, and assess viability. Returns a complete business plan with recommendations.",
      parameters: {
        type: "object",
        properties: {
          productName: {
            type: "string",
            description: "Name of the product to sell",
          },
          productDescription: {
            type: "string",
            description: "Detailed description of the product (optional)",
          },
          productCategory: {
            type: "string",
            description:
              "Category of the product (e.g., 'jewelry', 'home decor', 'art')",
          },
          materials: {
            type: "array",
            description: "List of materials needed to make the product",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                unit: { type: "string" },
                preferredSupplier: { type: "string" },
              },
              required: ["name", "quantity", "unit"],
            },
          },
          fixedCosts: {
            type: "array",
            description: "List of fixed business costs",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                amount: { type: "number" },
                frequency: {
                  type: "string",
                  enum: ["monthly", "annual", "one-time"],
                },
              },
              required: ["name", "amount", "frequency"],
            },
          },
          etsyFees: {
            type: "object",
            description:
              "Etsy fees from etsyFeesCalculator for the expected price",
            properties: {
              listingFee: { type: "number" },
              transactionFee: { type: "number" },
              paymentProcessingFee: { type: "number" },
              offsiteAdsFee: { type: "number" },
            },
            required: [
              "listingFee",
              "transactionFee",
              "paymentProcessingFee",
              "offsiteAdsFee",
            ],
          },
          isNewShop: {
            type: "boolean",
            description: "Whether this is a new Etsy shop",
          },
          targetMonthlyIncome: {
            type: "number",
            description: "Optional monthly income goal",
          },
          marketingBudget: {
            type: "number",
            description: "Optional monthly marketing budget",
          },
          shippingCostPerItem: {
            type: "number",
            description: "Optional shipping cost per item",
          },
          laborCostPerItem: {
            type: "number",
            description: "Optional labor/time cost per item",
          },
          packagingCostPerItem: {
            type: "number",
            description: "Optional packaging cost per item",
          },
        },
        required: [
          "productName",
          "productCategory",
          "materials",
          "fixedCosts",
          "etsyFees",
          "isNewShop",
        ],
        additionalProperties: false,
      },
    },
  };

// LangChain tool definition (shared between LangChain and LangGraph)
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const businessPlanMaterialSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  preferredSupplier: z.string().nullish(),
});

const businessPlanFixedCostSchema = z.object({
  name: z.string(),
  amount: z.number(),
  frequency: z.enum(["monthly", "annual", "one-time"]),
});

const etsyFeesSchema = z.object({
  listingFee: z.number(),
  transactionFee: z.number(),
  paymentProcessingFee: z.number(),
  offsiteAdsFee: z.number(),
});

export const generateBusinessPlanSchema = z.object({
  productName: z.string().describe("Name of the product to sell"),
  productDescription: z.string().nullish().describe("Detailed description of the product (optional)"),
  productCategory: z
    .string()
    .describe("Category of the product (e.g., 'jewelry', 'home decor', 'art')"),
  materials: z
    .array(businessPlanMaterialSchema)
    .describe("List of materials needed to make the product"),
  fixedCosts: z.array(businessPlanFixedCostSchema).describe("List of fixed business costs"),
  etsyFees: etsyFeesSchema.describe(
    "Etsy fees from etsyFeesCalculator for the expected price"
  ),
  isNewShop: z.boolean().describe("Whether this is a new Etsy shop"),
  targetMonthlyIncome: z.number().nullish().describe("Optional monthly income goal"),
  marketingBudget: z.number().nullish().describe("Optional monthly marketing budget"),
  shippingCostPerItem: z.number().nullish().describe("Optional shipping cost per item"),
  laborCostPerItem: z.number().nullish().describe("Optional labor/time cost per item"),
  packagingCostPerItem: z.number().nullish().describe("Optional packaging cost per item"),
});

export const generateBusinessPlanLangChainTool = new DynamicStructuredTool({
  name: "generateBusinessPlan",
  description:
    "Generate a comprehensive business plan for an Etsy product. This orchestrates all other tools to research competitors, calculate costs, estimate sales, plan advertising, and assess viability. Returns a complete business plan with recommendations.",
  schema: generateBusinessPlanSchema,
  func: async (params) => {
    const result = generateBusinessPlan(params as BusinessPlanInput);
    return JSON.stringify(result);
  },
});
