from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-4o-mini",
    input="What is the capital of France?",
)

print(response.output_text)
