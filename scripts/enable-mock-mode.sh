#!/bin/bash
# Enable Mock Mode for Afia Worker
# This bypasses LLM API calls and uses mock responses for testing

set -e

echo "🧪 Enabling Mock Mode for Afia Worker"
echo "======================================"
echo ""

cd worker

echo "Setting ENABLE_MOCK_LLM environment variable..."
echo "true" | npx wrangler secret put ENABLE_MOCK_LLM --env stage1

echo ""
echo "✅ Mock mode enabled successfully!"
echo ""
echo "📝 Note: The app will now use mock LLM responses instead of real API calls."
echo "This is useful for testing without API keys or when quota is exhausted."
echo ""
echo "To disable mock mode later, run:"
echo "  echo 'false' | npx wrangler secret put ENABLE_MOCK_LLM --env stage1"
echo ""
