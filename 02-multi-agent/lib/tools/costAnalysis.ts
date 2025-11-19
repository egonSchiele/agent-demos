import OpenAI from "openai";

export interface FixedCost {
  name: string;
  amount: number;
  frequency: "monthly" | "annual" | "one-time";
}

export interface VariableCosts {
  materials: number;
  etsyFees: number;
  shipping?: number;
  labor?: number;
  packaging?: number;
}

export interface ProfitProjection {
  salesVolume: number;
  revenue: number;
  totalFixedCosts: number;
  totalVariableCosts: number;
  totalCosts: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}

export interface CostAnalysisResult {
  sellingPrice: number;
  variableCostPerItem: number;
  contributionMargin: number;
  contributionMarginPercent: number;
  monthlyFixedCosts: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  projections: ProfitProjection[];
  recommendations: string[];
}

export interface AnalyzeBusinessCostsParams {
  fixedCosts: FixedCost[];
  variableCosts: VariableCosts;
  sellingPrice: number;
  salesVolumes: number[];
}

export function analyzeBusinessCosts({
  fixedCosts,
  variableCosts,
  sellingPrice,
  salesVolumes,
}: AnalyzeBusinessCostsParams): CostAnalysisResult {
  // Calculate monthly fixed costs
  const monthlyFixedCosts = fixedCosts.reduce((sum, cost) => {
    if (cost.frequency === "monthly") {
      return sum + cost.amount;
    } else if (cost.frequency === "annual") {
      return sum + cost.amount / 12;
    }
    // One-time costs are amortized over 12 months
    return sum + cost.amount / 12;
  }, 0);

  // Calculate variable cost per item
  const variableCostPerItem =
    variableCosts.materials +
    variableCosts.etsyFees +
    (variableCosts.shipping || 0) +
    (variableCosts.labor || 0) +
    (variableCosts.packaging || 0);

  // Calculate contribution margin (how much each sale contributes to covering fixed costs)
  const contributionMargin = sellingPrice - variableCostPerItem;
  const contributionMarginPercent = (contributionMargin / sellingPrice) * 100;

  // Calculate break-even point
  const breakEvenUnits = Math.ceil(monthlyFixedCosts / contributionMargin);
  const breakEvenRevenue = breakEvenUnits * sellingPrice;

  // Generate profit projections for each sales volume
  const projections: ProfitProjection[] = salesVolumes.map((volume) => {
    const revenue = volume * sellingPrice;
    const totalVariableCosts = volume * variableCostPerItem;
    const totalCosts = monthlyFixedCosts + totalVariableCosts;
    const grossProfit = revenue - totalVariableCosts;
    const netProfit = grossProfit - monthlyFixedCosts;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      salesVolume: volume,
      revenue: Math.round(revenue * 100) / 100,
      totalFixedCosts: Math.round(monthlyFixedCosts * 100) / 100,
      totalVariableCosts: Math.round(totalVariableCosts * 100) / 100,
      totalCosts: Math.round(totalCosts * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100,
    };
  });

  // Generate recommendations
  const recommendations: string[] = [];

  // Check contribution margin health
  if (contributionMarginPercent < 30) {
    recommendations.push(
      `Your contribution margin is ${Math.round(contributionMarginPercent)}%, which is quite low. Consider increasing your price or reducing variable costs.`
    );
  } else if (contributionMarginPercent > 60) {
    recommendations.push(
      `You have a healthy contribution margin of ${Math.round(contributionMarginPercent)}%, giving you good room for profitability.`
    );
  }

  // Check break-even point
  if (breakEvenUnits > 100) {
    recommendations.push(
      `You need to sell ${breakEvenUnits} items monthly to break even. Consider ways to reduce fixed costs or increase your contribution margin.`
    );
  } else if (breakEvenUnits < 30) {
    recommendations.push(
      `Your break-even point is only ${breakEvenUnits} items per month, which is very achievable.`
    );
  }

  // Analyze profitability at different volumes
  const profitable = projections.filter((p) => p.netProfit > 0);
  if (profitable.length === 0) {
    recommendations.push(
      "None of your projected sales volumes are profitable. You need to either increase prices, reduce costs, or aim for higher sales volumes."
    );
  } else {
    const firstProfitable = profitable[0];
    recommendations.push(
      `You'll start making a profit after selling ${firstProfitable.salesVolume} items per month.`
    );
  }

  // Check if labor cost is included
  if (!variableCosts.labor || variableCosts.labor === 0) {
    recommendations.push(
      "Consider including labor costs in your calculations to get a more accurate picture of profitability."
    );
  }

  // Analyze variable cost composition
  const materialPercent = (variableCosts.materials / variableCostPerItem) * 100;
  if (materialPercent > 70) {
    recommendations.push(
      `Materials make up ${Math.round(materialPercent)}% of your variable costs. Look for bulk discounts or alternative suppliers to reduce this.`
    );
  }

  return {
    sellingPrice: Math.round(sellingPrice * 100) / 100,
    variableCostPerItem: Math.round(variableCostPerItem * 100) / 100,
    contributionMargin: Math.round(contributionMargin * 100) / 100,
    contributionMarginPercent: Math.round(contributionMarginPercent * 100) / 100,
    monthlyFixedCosts: Math.round(monthlyFixedCosts * 100) / 100,
    breakEvenUnits,
    breakEvenRevenue: Math.round(breakEvenRevenue * 100) / 100,
    projections,
    recommendations,
  };
}

// OpenAI function definition
export const analyzeBusinessCostsTool: OpenAI.Chat.Completions.ChatCompletionTool =
  {
    type: "function",
    function: {
      name: "analyzeBusinessCosts",
      description:
        "Analyze business costs including fixed and variable costs, calculate break-even point, contribution margin, and project profits at different sales volumes.",
      parameters: {
        type: "object",
        properties: {
          fixedCosts: {
            type: "array",
            description:
              "List of fixed costs (rent, equipment, subscriptions, etc.)",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Description of the fixed cost",
                },
                amount: {
                  type: "number",
                  description: "Dollar amount of the cost",
                },
                frequency: {
                  type: "string",
                  enum: ["monthly", "annual", "one-time"],
                  description: "How often this cost occurs",
                },
              },
              required: ["name", "amount", "frequency"],
            },
          },
          variableCosts: {
            type: "object",
            description: "Costs that vary with each item sold",
            properties: {
              materials: {
                type: "number",
                description: "Material cost per item",
              },
              etsyFees: {
                type: "number",
                description: "Etsy fees per item (from etsyFeesCalculator)",
              },
              shipping: {
                type: "number",
                description: "Shipping cost per item (optional)",
              },
              labor: {
                type: "number",
                description:
                  "Labor cost per item - value of your time (optional)",
              },
              packaging: {
                type: "number",
                description: "Packaging cost per item (optional)",
              },
            },
            required: ["materials", "etsyFees"],
          },
          sellingPrice: {
            type: "number",
            description: "Price you'll sell each item for",
          },
          salesVolumes: {
            type: "array",
            description:
              "Different sales volumes to project (e.g., [10, 50, 100, 200])",
            items: {
              type: "number",
            },
          },
        },
        required: ["fixedCosts", "variableCosts", "sellingPrice", "salesVolumes"],
        additionalProperties: false,
      },
    },
  };

// LangChain tool definition (shared between LangChain and LangGraph)
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const fixedCostSchema = z.object({
  name: z.string().describe("Description of the fixed cost"),
  amount: z.number().describe("Dollar amount of the cost"),
  frequency: z
    .enum(["monthly", "annual", "one-time"])
    .describe("How often this cost occurs"),
});

const variableCostsSchema = z.object({
  materials: z.number().describe("Material cost per item"),
  etsyFees: z.number().describe("Etsy fees per item (from etsyFeesCalculator)"),
  shipping: z.number().nullish().describe("Shipping cost per item (optional)"),
  labor: z
    .number()
    .nullish()
    .describe("Labor cost per item - value of your time (optional)"),
  packaging: z.number().nullish().describe("Packaging cost per item (optional)"),
});

export const analyzeBusinessCostsSchema = z.object({
  fixedCosts: z
    .array(fixedCostSchema)
    .describe("List of fixed costs (rent, equipment, subscriptions, etc.)"),
  variableCosts: variableCostsSchema.describe("Costs that vary with each item sold"),
  sellingPrice: z.number().describe("Price you'll sell each item for"),
  salesVolumes: z
    .array(z.number())
    .describe("Different sales volumes to project (e.g., [10, 50, 100, 200])"),
});

export const analyzeBusinessCostsLangChainTool = new DynamicStructuredTool({
  name: "analyzeBusinessCosts",
  description:
    "Analyze business costs including fixed and variable costs, calculate break-even point, contribution margin, and project profits at different sales volumes.",
  schema: analyzeBusinessCostsSchema,
  func: async ({ fixedCosts, variableCosts, sellingPrice, salesVolumes }) => {
    const result = analyzeBusinessCosts({
      fixedCosts,
      variableCosts: {
        materials: variableCosts.materials,
        etsyFees: variableCosts.etsyFees,
        shipping: variableCosts.shipping ?? undefined,
        labor: variableCosts.labor ?? undefined,
        packaging: variableCosts.packaging ?? undefined,
      },
      sellingPrice,
      salesVolumes,
    });
    return JSON.stringify(result);
  },
});
