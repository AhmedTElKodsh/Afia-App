#!/bin/bash
# Setup API Keys for Afia Worker
# This script helps you configure all required API keys for the LLM providers

set -e

echo "🔐 Afia Worker - API Keys Setup"
echo "================================"
echo ""
echo "This script will help you set up API keys for:"
echo "  1. Gemini API (Primary - 3 keys for rotation)"
echo "  2. Groq API (Fallback)"
echo "  3. OpenRouter API (Fallback)"
echo "  4. Mistral API (Fallback)"
echo ""
echo "📝 Get your free API keys from:"
echo "  - Gemini: https://aistudio.google.com/app/apikey"
echo "  - Groq: https://console.groq.com/keys"
echo "  - OpenRouter: https://openrouter.ai/keys"
echo "  - Mistral: https://console.mistral.ai/api-keys/"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

cd worker

echo ""
echo "🔑 Setting up Gemini API Keys (Primary Provider)"
echo "================================================"
echo ""

# Gemini Key 1 (Required)
echo "Enter your first Gemini API key (required):"
read -s GEMINI_KEY_1
if [ -z "$GEMINI_KEY_1" ]; then
  echo "❌ Error: Gemini API key is required!"
  exit 1
fi
echo "$GEMINI_KEY_1" | npx wrangler secret put GEMINI_API_KEY --env stage1
echo "✅ GEMINI_API_KEY set successfully"

# Gemini Key 2 (Optional)
echo ""
echo "Enter your second Gemini API key (optional, press Enter to skip):"
read -s GEMINI_KEY_2
if [ ! -z "$GEMINI_KEY_2" ]; then
  echo "$GEMINI_KEY_2" | npx wrangler secret put GEMINI_API_KEY2 --env stage1
  echo "✅ GEMINI_API_KEY2 set successfully"
else
  echo "⏭️  Skipped GEMINI_API_KEY2"
fi

# Gemini Key 3 (Optional)
echo ""
echo "Enter your third Gemini API key (optional, press Enter to skip):"
read -s GEMINI_KEY_3
if [ ! -z "$GEMINI_KEY_3" ]; then
  echo "$GEMINI_KEY_3" | npx wrangler secret put GEMINI_API_KEY3 --env stage1
  echo "✅ GEMINI_API_KEY3 set successfully"
else
  echo "⏭️  Skipped GEMINI_API_KEY3"
fi

# Gemini Key 4 (Optional)
echo ""
echo "Enter your fourth Gemini API key (optional, press Enter to skip):"
read -s GEMINI_KEY_4
if [ ! -z "$GEMINI_KEY_4" ]; then
  echo "$GEMINI_KEY_4" | npx wrangler secret put GEMINI_API_KEY4 --env stage1
  echo "✅ GEMINI_API_KEY4 set successfully"
else
  echo "⏭️  Skipped GEMINI_API_KEY4"
fi

echo ""
echo "🔑 Setting up Fallback Provider Keys (Optional)"
echo "==============================================="
echo ""

# Groq Key (Optional)
echo "Enter your Groq API key (optional, press Enter to skip):"
read -s GROQ_KEY
if [ ! -z "$GROQ_KEY" ]; then
  echo "$GROQ_KEY" | npx wrangler secret put GROQ_API_KEY --env stage1
  echo "✅ GROQ_API_KEY set successfully"
else
  echo "⏭️  Skipped GROQ_API_KEY"
fi

# OpenRouter Key (Optional)
echo ""
echo "Enter your OpenRouter API key (optional, press Enter to skip):"
read -s OPENROUTER_KEY
if [ ! -z "$OPENROUTER_KEY" ]; then
  echo "$OPENROUTER_KEY" | npx wrangler secret put OPENROUTER_API_KEY --env stage1
  echo "✅ OPENROUTER_API_KEY set successfully"
else
  echo "⏭️  Skipped OPENROUTER_API_KEY"
fi

# Mistral Key (Optional)
echo ""
echo "Enter your Mistral API key (optional, press Enter to skip):"
read -s MISTRAL_KEY
if [ ! -z "$MISTRAL_KEY" ]; then
  echo "$MISTRAL_KEY" | npx wrangler secret put MISTRAL_API_KEY --env stage1
  echo "✅ MISTRAL_API_KEY set successfully"
else
  echo "⏭️  Skipped MISTRAL_API_KEY"
fi

echo ""
echo "✅ API Keys Setup Complete!"
echo ""
echo "📋 Summary:"
echo "  - Gemini keys configured: Primary provider"
echo "  - Fallback providers: Available if Gemini fails"
echo ""
echo "🚀 Next Steps:"
echo "  1. Test the app by scanning a bottle"
echo "  2. Check the admin dashboard for scan results"
echo "  3. Monitor API usage in the provider dashboards"
echo ""
echo "💡 Tips:"
echo "  - Gemini free tier: 15 requests/minute, 1500 requests/day"
echo "  - Use multiple keys to increase rate limits"
echo "  - Fallback providers activate automatically if Gemini fails"
echo ""
