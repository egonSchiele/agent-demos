from openai import OpenAI
from pydantic import BaseModel

client = OpenAI()


class Capital(BaseModel):
    city: str
    country: str
    population: int


response = client.beta.chat.completions.parse(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "What is the capital of France?"}],
    response_format=Capital,
)

capital = response.choices[0].message.parsed
print(capital)
