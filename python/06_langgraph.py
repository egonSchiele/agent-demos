import json
from typing import Literal

from langchain_core.messages import AIMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode
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


model = ChatOpenAI(model="gpt-4-turbo", temperature=0)
model_with_tools = model.bind_tools([etsy_fees_calculator_tool])


def call_model(state: MessagesState):
    response = model_with_tools.invoke(state["messages"])
    return {"messages": [response]}


def should_continue(state: MessagesState) -> Literal["tools", "__end__"]:
    last_message = state["messages"][-1]
    if not isinstance(last_message, AIMessage):
        return END
    if last_message.tool_calls:
        return "tools"
    return END


workflow = StateGraph(MessagesState)
workflow.add_node("agent", call_model)
workflow.add_node("tools", ToolNode([etsy_fees_calculator_tool]))
workflow.add_edge(START, "agent")
workflow.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
workflow.add_edge("tools", "agent")

memory = MemorySaver()
app = workflow.compile(checkpointer=memory)

config = {"configurable": {"thread_id": "etsy-conversation"}}
system_message_added = False


def chat(user_input: str) -> str:
    global system_message_added
    messages = []

    if not system_message_added:
        messages.append({"role": "system", "content": SYSTEM_PROMPT})
        system_message_added = True

    messages.append({"role": "user", "content": user_input})

    result = app.invoke({"messages": messages}, config)

    last_message = result["messages"][-1]
    return str(last_message.content) or "I apologize, but I could not generate a response."


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
