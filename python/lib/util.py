import os
import sys
import threading
import time


def etsy_fees_calculator(item_price: float, offsite_ads: bool | None = None) -> dict:
    listing_fee = 0.20
    transaction_fee_rate = 0.065
    payment_processing_fee_rate = 0.03
    payment_processing_fixed_fee = 0.25
    offsite_ads_fee_rate = 0.12 if offsite_ads is True else 0

    transaction_fee = item_price * transaction_fee_rate
    payment_processing_fee = item_price * payment_processing_fee_rate + payment_processing_fixed_fee
    offsite_ads_fee = item_price * offsite_ads_fee_rate

    return {
        "listingFee": listing_fee,
        "transactionFee": transaction_fee,
        "paymentProcessingFee": payment_processing_fee,
        "offsiteAdsFee": offsite_ads_fee,
    }


def get_input(prompt: str) -> str:
    try:
        user_input = input(prompt)
    except (EOFError, KeyboardInterrupt):
        print("\nGoodbye! Have a great day!")
        sys.exit(0)

    if user_input.lower() in ("exit", "quit"):
        print("\nGoodbye! Have a great day!")
        sys.exit(0)

    return user_input


class LoadingController:
    def __init__(self, messages: list[str]):
        self._stop_event = threading.Event()
        spinner_frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
        frame_index = 0
        message_index = 0

        def spin():
            nonlocal frame_index, message_index
            last_message_switch = time.time()
            while not self._stop_event.is_set():
                msg = messages[message_index]
                frame = spinner_frames[frame_index]
                sys.stdout.write(f"\r\033[91m{frame} {msg}\033[0m")
                sys.stdout.flush()
                frame_index = (frame_index + 1) % len(spinner_frames)
                if len(messages) > 1 and time.time() - last_message_switch >= 2:
                    message_index = (message_index + 1) % len(messages)
                    last_message_switch = time.time()
                self._stop_event.wait(0.08)

        self._thread = threading.Thread(target=spin, daemon=True)
        self._thread.start()

    def stop(self):
        self._stop_event.set()
        self._thread.join()
        sys.stdout.write("\r\033[K")
        sys.stdout.flush()


def show_loading(messages: list[str] | str = "Thinking...") -> LoadingController:
    if isinstance(messages, str):
        messages = [messages]
    return LoadingController(messages)


LOADING_MESSAGES = ["Thinking...", "Pondering..."]

SYSTEM_PROMPT = (
    "You are a helpful assistant that can calculate Etsy seller fees.\n"
    "When a user asks about Etsy fees or wants to know how much they'll pay in fees "
    "for selling an item on Etsy, use the etsyFeesCalculator function.\n"
    "Be friendly and conversational. You can answer general questions, but your "
    "specialty is helping with Etsy fee calculations."
)


def check_for_openai_key():
    if not os.environ.get("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY environment variable is not set.", file=sys.stderr)
        print("Please set it with: export OPENAI_API_KEY=your-api-key", file=sys.stderr)
        sys.exit(1)


def print_welcome_message():
    print("Welcome to the Etsy Fees Calculator Agent!")
    print("I can help you calculate Etsy seller fees for your products.")
    print('Type "exit" or "quit" to end the conversation.\n')
