import json

from openai import OpenAI

client = OpenAI()

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the current weather for a city",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "The city name"},
                },
                "required": ["city"],
                "additionalProperties": False,
            },
        },
    }
]


def get_weather(city: str) -> dict:
    return {"city": city, "temperature": 72, "condition": "sunny"}


messages = [{"role": "user", "content": "What's the weather in Paris?"}]

# First call: model decides to use the tool
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=messages,
    tools=tools,
)

message = response.choices[0].message
print("Model wants to call:", message.tool_calls[0].function.name)
print("With args:", message.tool_calls[0].function.arguments)

# Execute the function
args = json.loads(message.tool_calls[0].function.arguments)
result = get_weather(**args)

# Second call: send the tool result back, model generates final answer
messages.append(message)
messages.append({
    "role": "tool",
    "tool_call_id": message.tool_calls[0].id,
    "content": json.dumps(result),
})

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=messages,
    tools=tools,
)

print(response.choices[0].message.content)
