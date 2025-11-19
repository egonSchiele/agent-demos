import OpenAI from "openai";

export interface AdvertisingPlatform {
  name: string;
  description: string;
  costStructure: string;
  typicalCPC?: number; // Cost per click
  typicalCPM?: number; // Cost per thousand impressions
  minimumBudget: number;
  recommendedBudget: number;
  expectedReach: string;
  bestFor: string[];
  pros: string[];
  cons: string[];
}

export interface BudgetAllocation {
  platform: string;
  allocatedBudget: number;
  percentage: number;
  estimatedClicks?: number;
  estimatedImpressions?: number;
  reasoning: string;
}

export interface AdvertisingResult {
  productCategory: string;
  totalBudget: number;
  recommendedPlatforms: AdvertisingPlatform[];
  budgetAllocation: BudgetAllocation[];
  recommendations: string[];
  expectedROI?: {
    estimatedClicks: number;
    estimatedConversionRate: number;
    estimatedSales: number;
    estimatedRevenue: number;
  };
}

export interface SuggestAdvertisingPlatformsParams {
  productCategory: string;
  monthlyBudget: number;
  targetAudience?: string;
}

export function suggestAdvertisingPlatforms({
  productCategory,
  monthlyBudget,
  targetAudience,
}: SuggestAdvertisingPlatformsParams): AdvertisingResult {
  // Mock platform database
  const allPlatforms: Record<string, AdvertisingPlatform> = {
    etsyAds: {
      name: "Etsy Ads",
      description:
        "Etsy's internal advertising platform that promotes your listings in Etsy search results and category pages",
      costStructure: "CPC (Cost Per Click)",
      typicalCPC: 0.25,
      minimumBudget: 1,
      recommendedBudget: 50,
      expectedReach: "Etsy shoppers actively searching for products",
      bestFor: [
        "All Etsy sellers",
        "New shops building visibility",
        "High-intent buyers",
      ],
      pros: [
        "Targets users already on Etsy",
        "Easy to set up",
        "Low minimum budget",
        "High purchase intent",
      ],
      cons: [
        "Limited to Etsy platform",
        "Can get expensive with competition",
        "Less control over targeting",
      ],
    },
    googleAds: {
      name: "Google Ads",
      description:
        "Pay-per-click advertising on Google search results and display network",
      costStructure: "CPC or CPM",
      typicalCPC: 1.5,
      typicalCPM: 4.0,
      minimumBudget: 10,
      recommendedBudget: 150,
      expectedReach: "Billions of Google searches daily",
      bestFor: [
        "Product keywords with high search volume",
        "Building brand awareness",
        "Capturing high-intent searches",
      ],
      pros: [
        "Massive reach",
        "Advanced targeting options",
        "High purchase intent for search ads",
        "Detailed analytics",
      ],
      cons: [
        "Can be expensive",
        "Steep learning curve",
        "Requires ongoing optimization",
      ],
    },
    facebookInstagram: {
      name: "Facebook & Instagram Ads",
      description:
        "Visual advertising on Meta's social platforms with advanced targeting",
      costStructure: "CPC or CPM",
      typicalCPC: 0.8,
      typicalCPM: 8.0,
      minimumBudget: 5,
      recommendedBudget: 100,
      expectedReach: "3+ billion active users across both platforms",
      bestFor: [
        "Visual products",
        "Building brand awareness",
        "Lifestyle products",
        "Targeting specific demographics",
      ],
      pros: [
        "Excellent for visual products",
        "Detailed demographic targeting",
        "Instagram shopping integration",
        "Good for storytelling",
      ],
      cons: [
        "Lower purchase intent than search ads",
        "Requires quality creative content",
        "Platform changes frequently",
      ],
    },
    pinterest: {
      name: "Pinterest Ads",
      description:
        "Promoted pins that appear in Pinterest search and feeds, great for discovery",
      costStructure: "CPC or CPM",
      typicalCPC: 0.6,
      typicalCPM: 5.0,
      minimumBudget: 10,
      recommendedBudget: 75,
      expectedReach: "450+ million active users",
      bestFor: [
        "Home decor",
        "Crafts and DIY",
        "Fashion and accessories",
        "Wedding items",
        "Gift items",
      ],
      pros: [
        "High purchase intent",
        "Long content lifespan",
        "Great for handmade/craft items",
        "Users actively seeking inspiration",
      ],
      cons: [
        "Smaller audience than other platforms",
        "Works best for certain categories",
        "Requires vertical image format",
      ],
    },
    tiktok: {
      name: "TikTok Ads",
      description:
        "Video advertising on the fast-growing short-form video platform",
      costStructure: "CPM or CPC",
      typicalCPC: 1.0,
      typicalCPM: 10.0,
      minimumBudget: 50,
      recommendedBudget: 150,
      expectedReach: "1+ billion active users",
      bestFor: [
        "Products appealing to Gen Z and Millennials",
        "Trendy items",
        "Products that demonstrate well in video",
      ],
      pros: [
        "Rapidly growing platform",
        "High engagement rates",
        "Viral potential",
        "Younger demographic",
      ],
      cons: [
        "Requires video content creation",
        "Higher minimum budget",
        "Newer advertising platform",
        "Less established for e-commerce",
      ],
    },
  };

  // Determine which platforms to recommend based on product category
  const recommendedPlatformNames: string[] = ["etsyAds"]; // Always recommend Etsy Ads

  // Category-specific recommendations
  const categoryKeywords = productCategory.toLowerCase();
  if (
    categoryKeywords.includes("jewelry") ||
    categoryKeywords.includes("fashion") ||
    categoryKeywords.includes("clothing") ||
    categoryKeywords.includes("accessories")
  ) {
    recommendedPlatformNames.push("facebookInstagram", "pinterest");
  } else if (
    categoryKeywords.includes("home") ||
    categoryKeywords.includes("decor") ||
    categoryKeywords.includes("furniture") ||
    categoryKeywords.includes("art")
  ) {
    recommendedPlatformNames.push("pinterest", "facebookInstagram");
  } else if (
    categoryKeywords.includes("craft") ||
    categoryKeywords.includes("diy") ||
    categoryKeywords.includes("supplies")
  ) {
    recommendedPlatformNames.push("pinterest", "googleAds");
  } else if (
    categoryKeywords.includes("toy") ||
    categoryKeywords.includes("game") ||
    categoryKeywords.includes("kids")
  ) {
    recommendedPlatformNames.push("facebookInstagram", "googleAds");
  } else {
    // Default recommendations
    recommendedPlatformNames.push("facebookInstagram", "googleAds");
  }

  // Filter platforms based on budget
  const affordablePlatforms = recommendedPlatformNames
    .map((name) => allPlatforms[name])
    .filter((platform) => platform.minimumBudget <= monthlyBudget);

  // If budget is too low for any recommended platforms, just use Etsy Ads
  const recommendedPlatforms =
    affordablePlatforms.length > 0 ? affordablePlatforms : [allPlatforms.etsyAds];

  // Allocate budget across platforms
  const budgetAllocation: BudgetAllocation[] = [];

  if (monthlyBudget < 50) {
    // Small budget - allocate everything to Etsy Ads
    budgetAllocation.push({
      platform: "Etsy Ads",
      allocatedBudget: monthlyBudget,
      percentage: 100,
      estimatedClicks: Math.round(monthlyBudget / 0.25),
      reasoning: "With a limited budget, focus entirely on Etsy Ads for high-intent traffic",
    });
  } else if (monthlyBudget < 150) {
    // Medium budget - split between Etsy Ads and one other platform
    budgetAllocation.push({
      platform: "Etsy Ads",
      allocatedBudget: Math.round(monthlyBudget * 0.6 * 100) / 100,
      percentage: 60,
      estimatedClicks: Math.round((monthlyBudget * 0.6) / 0.25),
      reasoning: "Primary focus on Etsy Ads where buyers have high purchase intent",
    });

    const secondPlatform = recommendedPlatforms.find((p) => p.name !== "Etsy Ads");
    if (secondPlatform) {
      const allocated = Math.round(monthlyBudget * 0.4 * 100) / 100;
      budgetAllocation.push({
        platform: secondPlatform.name,
        allocatedBudget: allocated,
        percentage: 40,
        estimatedClicks: secondPlatform.typicalCPC
          ? Math.round(allocated / secondPlatform.typicalCPC)
          : undefined,
        estimatedImpressions: secondPlatform.typicalCPM
          ? Math.round((allocated / secondPlatform.typicalCPM) * 1000)
          : undefined,
        reasoning: `Build awareness and reach new audiences outside of Etsy`,
      });
    }
  } else {
    // Larger budget - distribute across multiple platforms
    const etsyBudget = Math.round(monthlyBudget * 0.4 * 100) / 100;
    budgetAllocation.push({
      platform: "Etsy Ads",
      allocatedBudget: etsyBudget,
      percentage: 40,
      estimatedClicks: Math.round(etsyBudget / 0.25),
      reasoning: "Maintain strong presence on Etsy for high-intent traffic",
    });

    const otherPlatforms = recommendedPlatforms.filter((p) => p.name !== "Etsy Ads");
    const remainingBudget = monthlyBudget - etsyBudget;
    const perPlatformBudget = remainingBudget / otherPlatforms.length;
    const perPlatformPercentage = 60 / otherPlatforms.length;

    otherPlatforms.forEach((platform) => {
      const allocated = Math.round(perPlatformBudget * 100) / 100;
      budgetAllocation.push({
        platform: platform.name,
        allocatedBudget: allocated,
        percentage: Math.round(perPlatformPercentage),
        estimatedClicks: platform.typicalCPC
          ? Math.round(allocated / platform.typicalCPC)
          : undefined,
        estimatedImpressions: platform.typicalCPM
          ? Math.round((allocated / platform.typicalCPM) * 1000)
          : undefined,
        reasoning: `Diversify traffic sources and build brand awareness`,
      });
    });
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (monthlyBudget < 50) {
    recommendations.push(
      "Your budget is quite limited. Focus on Etsy Ads and organic growth strategies."
    );
    recommendations.push(
      "Consider increasing your budget to at least $100/month to effectively use multiple platforms."
    );
  } else {
    recommendations.push(
      "Start with these platforms and monitor performance closely for the first 2-4 weeks."
    );
  }

  recommendations.push(
    "Always use high-quality images and compelling ad copy to maximize click-through rates."
  );
  recommendations.push(
    "Track your return on ad spend (ROAS) - aim for at least 3:1 (earn $3 for every $1 spent)."
  );

  if (recommendedPlatforms.some((p) => p.name.includes("Instagram"))) {
    recommendations.push(
      "For Instagram/Facebook ads, consider using video content or carousel ads for better engagement."
    );
  }

  if (recommendedPlatforms.some((p) => p.name === "Pinterest Ads")) {
    recommendations.push(
      "Pinterest ads work especially well for handmade items - create lifestyle shots of your products in use."
    );
  }

  recommendations.push(
    "Don't forget about free marketing: optimize your SEO, engage on social media, and build an email list."
  );

  // Calculate expected ROI (simplified mock calculation)
  const totalEstimatedClicks = budgetAllocation.reduce(
    (sum, alloc) => sum + (alloc.estimatedClicks || 0),
    0
  );
  const estimatedConversionRate = 0.03; // 3% conversion rate
  const estimatedSales = Math.round(totalEstimatedClicks * estimatedConversionRate);

  return {
    productCategory,
    totalBudget: monthlyBudget,
    recommendedPlatforms,
    budgetAllocation,
    recommendations,
    expectedROI: {
      estimatedClicks: totalEstimatedClicks,
      estimatedConversionRate: estimatedConversionRate * 100,
      estimatedSales,
      estimatedRevenue: 0, // Would need product price to calculate
    },
  };
}

// OpenAI function definition
export const suggestAdvertisingPlatformsTool: OpenAI.Chat.Completions.ChatCompletionTool =
  {
    type: "function",
    function: {
      name: "suggestAdvertisingPlatforms",
      description:
        "Suggest advertising platforms and budget allocation based on product category and budget. Includes platform details, costs, and expected reach.",
      parameters: {
        type: "object",
        properties: {
          productCategory: {
            type: "string",
            description:
              "Category of product (e.g., 'jewelry', 'home decor', 'clothing', 'art', 'candles')",
          },
          monthlyBudget: {
            type: "number",
            description: "Total monthly advertising budget in dollars",
          },
          targetAudience: {
            type: "string",
            description:
              "Optional description of target customer (e.g., 'women 25-45 interested in sustainable fashion')",
          },
        },
        required: ["productCategory", "monthlyBudget"],
        additionalProperties: false,
      },
    },
  };

// LangChain tool definition (shared between LangChain and LangGraph)
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const suggestAdvertisingPlatformsSchema = z.object({
  productCategory: z
    .string()
    .describe("Category of product (e.g., 'jewelry', 'home decor', 'clothing', 'art', 'candles')"),
  monthlyBudget: z.number().describe("Total monthly advertising budget in dollars"),
  targetAudience: z
    .string()
    .nullish()
    .describe("Optional description of target customer (e.g., 'women 25-45 interested in sustainable fashion')"),
});

export const suggestAdvertisingPlatformsLangChainTool = new DynamicStructuredTool({
  name: "suggestAdvertisingPlatforms",
  description:
    "Suggest advertising platforms and budget allocation based on product category and budget. Includes platform details, costs, and expected reach.",
  schema: suggestAdvertisingPlatformsSchema,
  func: async ({ productCategory, monthlyBudget, targetAudience }) => {
    const result = suggestAdvertisingPlatforms({
      productCategory,
      monthlyBudget,
      targetAudience: targetAudience ?? undefined,
    });
    return JSON.stringify(result);
  },
});
