import OpenAI from "openai";

export interface Material {
  name: string;
  quantity: number;
  unit: string;
  preferredSupplier?: string;
}

export interface MaterialCostDetail {
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalCost: number;
  supplier: string;
  bulkOption?: {
    bulkQuantity: number;
    bulkPrice: number;
    savingsPerUnit: number;
  };
  alternativeSuppliers?: {
    supplier: string;
    pricePerUnit: number;
    savings: number;
  }[];
}

export interface MaterialCostsResult {
  materials: MaterialCostDetail[];
  totalCost: number;
  potentialSavings: number;
  recommendations: string[];
}

export interface CalculateMaterialCostsParams {
  materials: Material[];
}

export function calculateMaterialCosts({
  materials,
}: CalculateMaterialCostsParams): MaterialCostsResult {
  // Mock price database - in a real implementation, this would query online retailers
  const mockPriceDatabase: Record<
    string,
    {
      pricePerUnit: number;
      supplier: string;
      bulkOption?: { bulkQuantity: number; bulkPrice: number };
      alternatives?: { supplier: string; pricePerUnit: number }[];
    }
  > = {
    // Fabric and textiles
    fabric: {
      pricePerUnit: 8.99,
      supplier: "Joann Fabrics",
      bulkOption: { bulkQuantity: 10, bulkPrice: 7.49 },
      alternatives: [
        { supplier: "Fabric.com", pricePerUnit: 9.5 },
        { supplier: "Amazon", pricePerUnit: 8.25 },
      ],
    },
    cotton: {
      pricePerUnit: 6.5,
      supplier: "Michaels",
      bulkOption: { bulkQuantity: 5, bulkPrice: 5.75 },
    },
    thread: {
      pricePerUnit: 3.99,
      supplier: "Joann Fabrics",
      bulkOption: { bulkQuantity: 6, bulkPrice: 3.25 },
    },
    // Yarn and knitting
    yarn: {
      pricePerUnit: 7.99,
      supplier: "Michaels",
      bulkOption: { bulkQuantity: 8, bulkPrice: 6.99 },
      alternatives: [{ supplier: "Hobby Lobby", pricePerUnit: 7.49 }],
    },
    wool: {
      pricePerUnit: 12.99,
      supplier: "Knit Picks",
      bulkOption: { bulkQuantity: 5, bulkPrice: 11.5 },
    },
    // Beads and jewelry
    beads: {
      pricePerUnit: 0.15,
      supplier: "Fire Mountain Gems",
      bulkOption: { bulkQuantity: 100, bulkPrice: 0.1 },
      alternatives: [{ supplier: "Amazon", pricePerUnit: 0.18 }],
    },
    wire: {
      pricePerUnit: 9.99,
      supplier: "Fire Mountain Gems",
      bulkOption: { bulkQuantity: 5, bulkPrice: 8.5 },
    },
    clasp: {
      pricePerUnit: 0.5,
      supplier: "Fire Mountain Gems",
      bulkOption: { bulkQuantity: 50, bulkPrice: 0.35 },
    },
    // Wood and crafts
    wood: {
      pricePerUnit: 4.99,
      supplier: "Home Depot",
      bulkOption: { bulkQuantity: 10, bulkPrice: 4.25 },
    },
    paint: {
      pricePerUnit: 5.99,
      supplier: "Michaels",
      alternatives: [{ supplier: "Blick Art", pricePerUnit: 6.5 }],
    },
    glue: {
      pricePerUnit: 4.5,
      supplier: "Michaels",
      bulkOption: { bulkQuantity: 4, bulkPrice: 3.99 },
    },
    // Paper and cards
    paper: {
      pricePerUnit: 0.25,
      supplier: "Paper Source",
      bulkOption: { bulkQuantity: 100, bulkPrice: 0.18 },
    },
    cardstock: {
      pricePerUnit: 0.35,
      supplier: "Michaels",
      bulkOption: { bulkQuantity: 50, bulkPrice: 0.28 },
    },
    // Candle making
    wax: {
      pricePerUnit: 2.5,
      supplier: "CandleScience",
      bulkOption: { bulkQuantity: 10, bulkPrice: 2.1 },
    },
    wick: {
      pricePerUnit: 0.5,
      supplier: "CandleScience",
      bulkOption: { bulkQuantity: 50, bulkPrice: 0.35 },
    },
    "fragrance oil": {
      pricePerUnit: 15.99,
      supplier: "CandleScience",
      bulkOption: { bulkQuantity: 3, bulkPrice: 13.99 },
    },
    // Soap making
    "soap base": {
      pricePerUnit: 3.99,
      supplier: "Bramble Berry",
      bulkOption: { bulkQuantity: 10, bulkPrice: 3.25 },
    },
    "essential oil": {
      pricePerUnit: 12.99,
      supplier: "Bramble Berry",
    },
    // Ceramics
    clay: {
      pricePerUnit: 18.99,
      supplier: "Blick Art",
      bulkOption: { bulkQuantity: 5, bulkPrice: 16.5 },
    },
    glaze: {
      pricePerUnit: 14.99,
      supplier: "Blick Art",
    },
    // Resin
    resin: {
      pricePerUnit: 35.99,
      supplier: "Amazon",
      bulkOption: { bulkQuantity: 3, bulkPrice: 31.99 },
    },
    "resin dye": {
      pricePerUnit: 8.99,
      supplier: "Amazon",
    },
  };

  const materialCostDetails: MaterialCostDetail[] = materials.map(
    (material) => {
      // Look up price (case-insensitive)
      const materialKey = Object.keys(mockPriceDatabase).find(
        (key) => key.toLowerCase() === material.name.toLowerCase()
      );

      let priceInfo = materialKey
        ? mockPriceDatabase[materialKey]
        : {
            pricePerUnit: 5.0, // Default fallback price
            supplier: "Generic Supplier",
          };

      // If user specified a preferred supplier, use that
      if (material.preferredSupplier) {
        priceInfo = {
          ...priceInfo,
          supplier: material.preferredSupplier,
        };
      }

      const totalCost = priceInfo.pricePerUnit * material.quantity;

      const detail: MaterialCostDetail = {
        name: material.name,
        quantity: material.quantity,
        unit: material.unit,
        pricePerUnit: priceInfo.pricePerUnit,
        totalCost: Math.round(totalCost * 100) / 100,
        supplier: priceInfo.supplier,
      };

      // Add bulk option if available
      if (priceInfo.bulkOption) {
        const savingsPerUnit =
          priceInfo.pricePerUnit - priceInfo.bulkOption.bulkPrice;
        detail.bulkOption = {
          bulkQuantity: priceInfo.bulkOption.bulkQuantity,
          bulkPrice: priceInfo.bulkOption.bulkPrice,
          savingsPerUnit: Math.round(savingsPerUnit * 100) / 100,
        };
      }

      // Add alternative suppliers
      if (priceInfo.alternatives) {
        detail.alternativeSuppliers = priceInfo.alternatives.map((alt) => ({
          supplier: alt.supplier,
          pricePerUnit: alt.pricePerUnit,
          savings: Math.round((priceInfo.pricePerUnit - alt.pricePerUnit) * 100) / 100,
        }));
      }

      return detail;
    }
  );

  // Calculate total cost and potential savings
  const totalCost = materialCostDetails.reduce(
    (sum, m) => sum + m.totalCost,
    0
  );

  const potentialSavings = materialCostDetails.reduce((sum, m) => {
    if (m.bulkOption && m.quantity >= m.bulkOption.bulkQuantity) {
      return sum + m.bulkOption.savingsPerUnit * m.quantity;
    }
    return sum;
  }, 0);

  // Generate recommendations
  const recommendations: string[] = [];

  const bulkEligible = materialCostDetails.filter(
    (m) => m.bulkOption && m.quantity >= m.bulkOption.bulkQuantity
  );
  if (bulkEligible.length > 0) {
    recommendations.push(
      `You could save $${Math.round(potentialSavings * 100) / 100} by buying ${bulkEligible.length} material(s) in bulk`
    );
  }

  const cheaperAlternatives = materialCostDetails.filter(
    (m) => m.alternativeSuppliers && m.alternativeSuppliers.some((a) => a.savings < 0)
  );
  if (cheaperAlternatives.length > 0) {
    recommendations.push(
      `Consider checking alternative suppliers for ${cheaperAlternatives.map((m) => m.name).join(", ")} to potentially reduce costs`
    );
  }

  if (totalCost > 50) {
    recommendations.push(
      "With material costs over $50 per item, consider ways to reduce costs or price items accordingly to maintain healthy margins"
    );
  }

  return {
    materials: materialCostDetails,
    totalCost: Math.round(totalCost * 100) / 100,
    potentialSavings: Math.round(potentialSavings * 100) / 100,
    recommendations,
  };
}

// OpenAI function definition
export const calculateMaterialCostsTool: OpenAI.Chat.Completions.ChatCompletionTool =
  {
    type: "function",
    function: {
      name: "calculateMaterialCosts",
      description:
        "Calculate the cost of materials needed to make an item. Looks up current prices for each material, identifies bulk discounts, and finds alternative suppliers.",
      parameters: {
        type: "object",
        properties: {
          materials: {
            type: "array",
            description: "List of materials needed to make the item",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description:
                    "Name of the material (e.g., 'fabric', 'beads', 'yarn', 'wax')",
                },
                quantity: {
                  type: "number",
                  description: "Amount needed per item",
                },
                unit: {
                  type: "string",
                  description:
                    "Unit of measurement (e.g., 'yards', 'ounces', 'pieces', 'grams')",
                },
                preferredSupplier: {
                  type: "string",
                  description:
                    "Optional preferred supplier to get prices from",
                },
              },
              required: ["name", "quantity", "unit"],
            },
          },
        },
        required: ["materials"],
        additionalProperties: false,
      },
    },
  };

// LangChain tool definition (shared between LangChain and LangGraph)
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const materialSchema = z.object({
  name: z
    .string()
    .describe("Name of the material (e.g., 'fabric', 'beads', 'yarn', 'wax')"),
  quantity: z.number().describe("Amount needed per item"),
  unit: z
    .string()
    .describe("Unit of measurement (e.g., 'yards', 'ounces', 'pieces', 'grams')"),
  preferredSupplier: z
    .string()
    .nullish()
    .describe("Optional preferred supplier to get prices from"),
});

export const calculateMaterialCostsSchema = z.object({
  materials: z
    .array(materialSchema)
    .describe("List of materials needed to make the item"),
});

export const calculateMaterialCostsLangChainTool = new DynamicStructuredTool({
  name: "calculateMaterialCosts",
  description:
    "Calculate the cost of materials needed to make an item. Looks up current prices for each material, identifies bulk discounts, and finds alternative suppliers.",
  schema: calculateMaterialCostsSchema,
  func: async ({ materials }) => {
    const result = calculateMaterialCosts({
      materials: materials.map((m: any) => ({
        ...m,
        preferredSupplier: m.preferredSupplier ?? undefined,
      }))
    });
    return JSON.stringify(result);
  },
});
