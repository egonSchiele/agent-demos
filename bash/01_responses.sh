#!/bin/bash

curl -s https://api.openai.com/v1/responses \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "input": "What is the capital of France?"
  }' | jq -r '.output[0].content[0].text'
