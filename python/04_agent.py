import json

from openai import OpenAI

client = OpenAI()

# -- Tools --

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the current weather for a city",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string"},
                },
                "required": ["city"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_population",
            "description": "Get the population of a city",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string"},
                },
                "required": ["city"],
                "additionalProperties": False,
            },
        },
    },
]

TOOL_FUNCTIONS = {
    "get_weather": lambda city: {"city": city, "temperature": 72, "condition": "sunny"},
    "get_population": lambda city: {"city": city, "population": 2_161_000},
}

# -- Agent loop --

messages = [
    {"role": "system", "content": "You are a helpful assistant. Use the provided tools to answer the user's question. When you have all the information you need, respond to the user."},
    {"role": "user", "content": "Compare the weather and population of Paris and Tokyo."},
]

while True:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        tools=tools,
    )

    message = response.choices[0].message
    messages.append(message)

    # If no tool calls, the agent is done
    if not message.tool_calls:
        print(message.content)
        break

    # Execute each tool call and feed results back
    for tool_call in message.tool_calls:
        name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)
        print(f"Calling {name}({args})")

        result = TOOL_FUNCTIONS[name](**args)
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": json.dumps(result),
        })
