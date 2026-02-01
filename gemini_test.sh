#!/bin/bash

# Test script to call Gemini CLI and capture the response
echo "Calling Gemini CLI..."
echo "===================="

# Call gemini and capture output
output=$(gemini "$1" 2>&1)

# Display the output
echo "$output"

# Save to file for inspection
echo "$output" > gemini_response.txt
echo ""
echo "Response saved to gemini_response.txt"
