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