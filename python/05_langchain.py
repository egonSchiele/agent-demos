import json

from langchain_core.tools import tool
from langchain.chat_models import init_chat_model
from pydantic import BaseModel, Field

from lib.util import (
    LOADING_MESSAGES,
    SYSTEM_PROMPT,
    check_for_openai_key,
    etsy_fees_calculator,
    get_input,
    print_welcome_message,
    show_loading,
)


class EtsyFeesInput(BaseModel):
    itemPrice: float = Field(description="The price of the Etsy item in dollars")
    offsiteAds: bool | None = Field(
        default=None,
        description="Whether the item uses Etsy offsite ads (use null or false if not applicable)",
    )


@tool(args_schema=EtsyFeesInput)
def etsy_fees_calculator_tool(itemPrice: float, offsiteAds: bool | None = None) -> str:
    """Calculates Etsy seller fees for a product listing, including listing fee, transaction fee, payment processing fee, and optional offsite ads fee."""
    result = etsy_fees_calculator(item_price=itemPrice, offsite_ads=offsiteAds)
    return json.dumps(result)


model = init_chat_model("gpt-4-turbo", model_provider="openai")
agent = model.bind_tools([etsy_fees_calculator_tool])

messages: list = [{"role": "system", "content": SYSTEM_PROMPT}]


def chat(user_input: str) -> str:
    messages.append({"role": "user", "content": user_input})

    response = agent.invoke(messages)

    # Handle tool calls in a loop
    while response.tool_calls:
        messages.append(response)
        for tc in response.tool_calls:
            result = etsy_fees_calculator_tool.invoke(tc["args"])
            messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result})
        response = agent.invoke(messages)

    messages.append({"role": "assistant", "content": str(response.content)})
    return str(response.content)


def main():
    check_for_openai_key()
    print_welcome_message()

    while True:
        user_input = get_input("You: ")
        if not user_input.strip():
            continue

        loading = show_loading(LOADING_MESSAGES)
        try:
            response = chat(user_input)
            loading.stop()
            print(f"\nAgent: {response}\n")
        except Exception as e:
            loading.stop()
            print(f"\nError: {e}\n")


if __name__ == "__main__":
    main()
