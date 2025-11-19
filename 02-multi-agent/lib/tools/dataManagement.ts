import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

export interface BusinessData {
  businessName: string;
  productInformation?: {
    itemName: string;
    description?: string;
    category?: string;
  };
  marketResearch?: any;
  materialCosts?: any;
  costAnalysis?: any;
  salesEstimates?: any;
  advertisingPlan?: any;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface SaveBusinessDataParams {
  businessName: string;
  data: Omit<BusinessData, "businessName" | "createdAt" | "updatedAt">;
  filename?: string;
}

export interface SaveBusinessDataResult {
  success: boolean;
  message: string;
  filePath?: string;
  error?: string;
}

export interface LoadBusinessDataParams {
  filename: string;
}

export interface LoadBusinessDataResult {
  success: boolean;
  data?: BusinessData;
  message: string;
  error?: string;
}

// Directory to store business data files
const DATA_DIR = path.join(process.cwd(), "etsy-business-data");

// Ensure data directory exists
function ensureDataDirectory(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Generate filename from business name
function generateFilename(businessName: string, customFilename?: string): string {
  if (customFilename) {
    return customFilename.endsWith(".json")
      ? customFilename
      : `${customFilename}.json`;
  }

  // Sanitize business name for filename
  const sanitized = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `${sanitized}-${timestamp}.json`;
}

export function saveBusinessData({
  businessName,
  data,
  filename,
}: SaveBusinessDataParams): SaveBusinessDataResult {
  try {
    ensureDataDirectory();

    const now = new Date().toISOString();

    // Create complete business data object
    const businessData: BusinessData = {
      businessName,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    // Generate filename
    const fileName = generateFilename(businessName, filename);
    const filePath = path.join(DATA_DIR, fileName);

    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(businessData, null, 2), "utf-8");

    return {
      success: true,
      message: `Business data saved successfully`,
      filePath,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to save business data",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function loadBusinessData({
  filename,
}: LoadBusinessDataParams): LoadBusinessDataResult {
  try {
    ensureDataDirectory();

    // Add .json extension if not present
    const fileName = filename.endsWith(".json") ? filename : `${filename}.json`;
    const filePath = path.join(DATA_DIR, fileName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        message: `File not found: ${fileName}`,
        error: "File does not exist",
      };
    }

    // Read and parse file
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const data: BusinessData = JSON.parse(fileContent);

    return {
      success: true,
      data,
      message: `Business data loaded successfully`,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to load business data",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Helper function to list all saved business data files
export function listBusinessDataFiles(): string[] {
  try {
    ensureDataDirectory();

    if (!fs.existsSync(DATA_DIR)) {
      return [];
    }

    const files = fs.readdirSync(DATA_DIR);
    return files
      .filter((file) => file.endsWith(".json"))
      .sort()
      .reverse(); // Most recent first
  } catch (error) {
    console.error("Error listing business data files:", error);
    return [];
  }
}

// OpenAI function definitions
export const saveBusinessDataTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "saveBusinessData",
    description:
      "Save all business planning data to a JSON file. This includes product information, market research, costs, sales estimates, and advertising plans. The file is saved in the 'etsy-business-data' directory.",
    parameters: {
      type: "object",
      properties: {
        businessName: {
          type: "string",
          description: "Name of the Etsy shop or product line",
        },
        data: {
          type: "object",
          description: "All collected business data to save",
          properties: {
            productInformation: {
              type: "object",
              description: "Information about the product",
              properties: {
                itemName: { type: "string" },
                description: { type: "string" },
                category: { type: "string" },
              },
            },
            marketResearch: {
              type: "object",
              description: "Results from competitor price research",
            },
            materialCosts: {
              type: "object",
              description: "Material cost calculations",
            },
            costAnalysis: {
              type: "object",
              description: "Business cost analysis and profit projections",
            },
            salesEstimates: {
              type: "object",
              description: "Sales volume estimates",
            },
            advertisingPlan: {
              type: "object",
              description: "Recommended advertising platforms and budget",
            },
            notes: {
              type: "string",
              description: "Optional notes about the business plan",
            },
          },
        },
        filename: {
          type: "string",
          description:
            "Optional custom filename (without .json extension). If not provided, a filename will be generated from the business name and current date.",
        },
      },
      required: ["businessName", "data"],
      additionalProperties: false,
    },
  },
};

export const loadBusinessDataTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "loadBusinessData",
    description:
      "Load previously saved business planning data from a JSON file. The file should be in the 'etsy-business-data' directory.",
    parameters: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description:
            "Name of the file to load (with or without .json extension)",
        },
      },
      required: ["filename"],
      additionalProperties: false,
    },
  },
};

// LangChain tool definitions (shared between LangChain and LangGraph)
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const productInformationSchema = z.object({
  itemName: z.string(),
  description: z.string().nullish(),
  category: z.string().nullish(),
});

export const saveBusinessDataSchema = z.object({
  businessName: z.string().describe("Name of the Etsy shop or product line"),
  data: z.object({
    productInformation: productInformationSchema.nullish().describe("Information about the product"),
    marketResearch: z.any().nullish().describe("Results from competitor price research"),
    materialCosts: z.any().nullish().describe("Material cost calculations"),
    costAnalysis: z.any().nullish().describe("Business cost analysis and profit projections"),
    salesEstimates: z.any().nullish().describe("Sales volume estimates"),
    advertisingPlan: z.any().nullish().describe("Recommended advertising platforms and budget"),
    notes: z.string().nullish().describe("Optional notes about the business plan"),
  }).describe("All collected business data to save"),
  filename: z.string().nullish().describe("Optional custom filename (without .json extension). If not provided, a filename will be generated from the business name and current date."),
});

export const loadBusinessDataSchema = z.object({
  filename: z.string().describe("Name of the file to load (with or without .json extension)"),
});

export const saveBusinessDataLangChainTool = new DynamicStructuredTool({
  name: "saveBusinessData",
  description:
    "Save all business planning data to a JSON file. This includes product information, market research, costs, sales estimates, and advertising plans. The file is saved in the 'etsy-business-data' directory.",
  schema: saveBusinessDataSchema,
  func: async ({ businessName, data, filename }) => {
    // Convert nullish values to undefined for TypeScript compatibility
    const cleanedData: any = {};
    if (data.productInformation !== null && data.productInformation !== undefined) {
      cleanedData.productInformation = {
        itemName: data.productInformation.itemName,
        description: data.productInformation.description ?? undefined,
        category: data.productInformation.category ?? undefined,
      };
    }
    if (data.marketResearch !== null) cleanedData.marketResearch = data.marketResearch;
    if (data.materialCosts !== null) cleanedData.materialCosts = data.materialCosts;
    if (data.costAnalysis !== null) cleanedData.costAnalysis = data.costAnalysis;
    if (data.salesEstimates !== null) cleanedData.salesEstimates = data.salesEstimates;
    if (data.advertisingPlan !== null) cleanedData.advertisingPlan = data.advertisingPlan;
    if (data.notes !== null && data.notes !== undefined) cleanedData.notes = data.notes;

    const result = saveBusinessData({
      businessName,
      data: cleanedData,
      filename: filename ?? undefined
    });
    return JSON.stringify(result);
  },
});

export const loadBusinessDataLangChainTool = new DynamicStructuredTool({
  name: "loadBusinessData",
  description:
    "Load previously saved business planning data from a JSON file. The file should be in the 'etsy-business-data' directory.",
  schema: loadBusinessDataSchema,
  func: async ({ filename }) => {
    const result = loadBusinessData({ filename });
    return JSON.stringify(result);
  },
});
