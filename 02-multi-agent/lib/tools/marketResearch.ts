import OpenAI from "openai";

export interface CompetitorListing {
  title: string;
  price: number;
  sales: number;
  reviews: number;
  rating: number;
  url: string;
}

export interface MarketResearchResult {
  itemName: string;
  competitors: CompetitorListing[];
  statistics: {
    min: number;
    max: number;
    average: number;
    median: number;
  };
  suggestedPrice: {
    low: number;
    mid: number;
    high: number;
  };
  insights: string[];
}

export interface ResearchCompetitorPricesParams {
  itemName: string;
  itemDescription?: string;
  numberOfListings?: number;
}

export function researchCompetitorPrices({
  itemName,
  itemDescription,
  numberOfListings = 10,
}: ResearchCompetitorPricesParams): MarketResearchResult {
  // Mock data - in a real implementation, this would scrape Etsy or use an API
  const mockListings: CompetitorListing[] = [
    {
      title: `Handmade ${itemName} - Premium Quality`,
      price: 29.99,
      sales: 450,
      reviews: 123,
      rating: 4.8,
      url: "https://etsy.com/listing/mock1",
    },
    {
      title: `Custom ${itemName} - Unique Design`,
      price: 35.0,
      sales: 280,
      reviews: 89,
      rating: 4.9,
      url: "https://etsy.com/listing/mock2",
    },
    {
      title: `Artisan ${itemName}`,
      price: 24.5,
      sales: 620,
      reviews: 201,
      rating: 4.7,
      url: "https://etsy.com/listing/mock3",
    },
    {
      title: `${itemName} - Handcrafted`,
      price: 32.0,
      sales: 150,
      reviews: 45,
      rating: 4.6,
      url: "https://etsy.com/listing/mock4",
    },
    {
      title: `Personalized ${itemName}`,
      price: 39.99,
      sales: 890,
      reviews: 312,
      rating: 5.0,
      url: "https://etsy.com/listing/mock5",
    },
    {
      title: `${itemName} Set`,
      price: 27.5,
      sales: 340,
      reviews: 98,
      rating: 4.8,
      url: "https://etsy.com/listing/mock6",
    },
    {
      title: `Vintage Style ${itemName}`,
      price: 31.0,
      sales: 220,
      reviews: 67,
      rating: 4.7,
      url: "https://etsy.com/listing/mock7",
    },
    {
      title: `Modern ${itemName}`,
      price: 28.99,
      sales: 510,
      reviews: 156,
      rating: 4.9,
      url: "https://etsy.com/listing/mock8",
    },
    {
      title: `Eco-Friendly ${itemName}`,
      price: 33.5,
      sales: 380,
      reviews: 134,
      rating: 4.8,
      url: "https://etsy.com/listing/mock9",
    },
    {
      title: `Luxury ${itemName}`,
      price: 45.0,
      sales: 95,
      reviews: 28,
      rating: 4.9,
      url: "https://etsy.com/listing/mock10",
    },
  ];

  // Take only the requested number of listings
  const competitors = mockListings.slice(0, numberOfListings);

  // Calculate statistics
  const prices = competitors.map((c) => c.price);
  const sortedPrices = [...prices].sort((a, b) => a - b);

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const median =
    sortedPrices.length % 2 === 0
      ? (sortedPrices[sortedPrices.length / 2 - 1] +
          sortedPrices[sortedPrices.length / 2]) /
        2
      : sortedPrices[Math.floor(sortedPrices.length / 2)];

  // Calculate suggested pricing
  const suggestedPrice = {
    low: Math.round(average * 0.85 * 100) / 100,
    mid: Math.round(average * 100) / 100,
    high: Math.round(average * 1.15 * 100) / 100,
  };

  // Generate insights
  const highPerformers = competitors
    .filter((c) => c.sales > 400)
    .map((c) => c.price);
  const avgHighPerformerPrice =
    highPerformers.length > 0
      ? highPerformers.reduce((sum, p) => sum + p, 0) / highPerformers.length
      : average;

  const insights = [
    `Most successful sellers price between $${Math.round(avgHighPerformerPrice * 0.9 * 100) / 100} and $${Math.round(avgHighPerformerPrice * 1.1 * 100) / 100}`,
    `${competitors.filter((c) => c.rating >= 4.8).length} out of ${competitors.length} top listings have ratings of 4.8+`,
    `Average number of sales for similar items: ${Math.round(competitors.reduce((sum, c) => sum + c.sales, 0) / competitors.length)}`,
  ];

  return {
    itemName,
    competitors,
    statistics: {
      min,
      max,
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
    },
    suggestedPrice,
    insights,
  };
}

// OpenAI function definition
export const researchCompetitorPricesTool: OpenAI.Chat.Completions.ChatCompletionTool =
  {
    type: "function",
    function: {
      name: "researchCompetitorPrices",
      description:
        "Research what competitors are selling similar items for on Etsy. Returns price statistics, competitor listings, and suggested pricing based on market data.",
      parameters: {
        type: "object",
        properties: {
          itemName: {
            type: "string",
            description: "The name of the item to research (e.g., 'handmade candles', 'ceramic mug')",
          },
          itemDescription: {
            type: "string",
            description:
              "Optional detailed description of the item for better matching",
          },
          numberOfListings: {
            type: "number",
            description:
              "Number of competitor listings to analyze (default: 10, max: 20)",
          },
        },
        required: ["itemName"],
        additionalProperties: false,
      },
    },
  };

// LangChain tool definition (shared between LangChain and LangGraph)
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const researchCompetitorPricesSchema = z.object({
  itemName: z
    .string()
    .describe("The name of the item to research (e.g., 'handmade candles', 'ceramic mug')"),
  itemDescription: z
    .string()
    .nullish()
    .describe("Optional detailed description of the item for better matching"),
  numberOfListings: z
    .number()
    .nullish()
    .describe("Number of competitor listings to analyze (default: 10, max: 20)"),
});

export const researchCompetitorPricesLangChainTool = new DynamicStructuredTool({
  name: "researchCompetitorPrices",
  description:
    "Research what competitors are selling similar items for on Etsy. Returns price statistics, competitor listings, and suggested pricing based on market data.",
  schema: researchCompetitorPricesSchema,
  func: async ({ itemName, itemDescription, numberOfListings }) => {
    const result = researchCompetitorPrices({
      itemName,
      itemDescription: itemDescription ?? undefined,
      numberOfListings: numberOfListings ?? undefined,
    });
    return JSON.stringify(result);
  },
});
