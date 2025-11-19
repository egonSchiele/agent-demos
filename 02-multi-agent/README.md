This repo contains examples of agents built with different frameworks.

## Usage

Install dependencies:

```
pnpm install
```

(If you don't have `pnpm`, substituting `npm` for all these commands will work as well).

Then build

```
pnpm run build
```

Then you can run any of the examples like this

```
node dist/01-function-calling.js
```

## Etsy Business Planning Agent

Example 08 (`08-etsy-business-agent.ts`) is a comprehensive agent that helps entrepreneurs plan an Etsy business. It includes:

**Features:**
- Research competitor prices on Etsy
- Calculate material costs with bulk pricing analysis
- Analyze business costs (fixed vs variable) and break-even points
- Estimate potential sales volume
- Suggest advertising platforms and budget allocation
- Generate comprehensive business plans
- Save and load business data as JSON files

**Tools included:**
- `researchCompetitorPrices` - Mock competitor price research
- `calculateMaterialCosts` - Mock material price lookup with extensive database
- `analyzeBusinessCosts` - Real profit/loss calculations
- `estimateSalesVolume` - Mock sales projections (conservative, moderate, optimistic)
- `suggestAdvertisingPlatforms` - Mock ad platform recommendations
- `saveBusinessData` / `loadBusinessData` - Working JSON file persistence
- `generateBusinessPlan` - Orchestration tool that uses all other tools

To run:
```
node dist/08-etsy-business-agent.js
```

Business data is saved to the `etsy-business-data/` directory.

### Same Agent, Three Implementations

The Etsy Business Planning Agent is implemented three different ways to demonstrate different approaches:

**1. OpenAI Function Calling (Example 08)**
```
node dist/08-etsy-business-agent.js
```
- Direct OpenAI API with manual tool call handling
- Requires managing message history and tool execution loop
- Most control but more code

**2. LangChain (Example 03)**
```
node dist/03-langchain.js
```
- Uses LangChain's `AgentExecutor` to handle tool calling automatically
- Simpler code - no manual tool call loop needed
- Tool definitions shared with LangGraph version (in `lib/tools/*.ts`)
- More portable across different LLM providers

**3. LangGraph (Example 04)**
```
node dist/04-langgraph.js
```
- Graph-based approach with explicit agent workflow
- Defines state transitions between "agent" and "tools" nodes
- Tool definitions shared with LangChain version (in `lib/tools/*.ts`)
- Best for complex multi-step workflows

**Shared Tool Definitions:**
All three implementations use the same underlying tool functions from `lib/tools/`. Each tool file exports three formats:
- Raw TypeScript function (e.g., `researchCompetitorPrices()`)
- OpenAI tool definition (e.g., `researchCompetitorPricesTool`)
- LangChain tool definition with Zod schema (e.g., `researchCompetitorPricesLangChainTool`)

This architecture allows you to switch between frameworks without rewriting tool logic.

## Agent vs assistant

Note: depending on how pedantic you are feeling, some of these could technically be considered "assistants" instead of "agents". I am not sure how valuable this distinction is going to be, so for consistency I am just going to use the term "agent" everywhere.

## Pros and cons of different methods:

### function calling
- simple to understand
- doesn't require adding another package if you're already using OpenAI
- can get structured responses with a structured outputs feature

### langchain
- adds another package as a dependency, but you're not locked into one model provider

### langgraph
- useful for building more complex agents, but also harder to understand as you need to build a graph

### openrouter
- adds another package as a dependency, but you're not locked into one model provider

### openai assistants api
- a much more complex API where you're managing threads and runs yourself, but it creates an assistant that you can then see and edit through the OpenAI UI.

### vercel ai sdk
When using function calling through OpenAI, you have to manage the actual function calling part yourself, but the Vercel AI SDK takes care of this for you. However, it just returns the output of the function call and then it is up to you to generate the message based on that output.