#!/bin/bash
# Safi Oil Tracker - Deployment Setup Script
# This script helps set up Worker secrets and deploy to Cloudflare

set -e

echo "🚀 Safi Oil Tracker - Deployment Setup"
echo "========================================"
echo ""

# Navigate to worker directory
cd worker

echo "📦 Step 1: Installing Worker dependencies..."
npm ci

echo ""
echo "🔐 Step 2: Setting Worker secrets..."
echo ""

# Set Gemini API keys
echo "Setting GEMINI_API_KEY..."
echo "YOUR_GEMINI_API_KEY_1" | npx wrangler secret put GEMINI_API_KEY

echo "Setting GEMINI_API_KEY2..."
echo "YOUR_GEMINI_API_KEY_2" | npx wrangler secret put GEMINI_API_KEY2

echo "Setting GEMINI_API_KEY3..."
echo "YOUR_GEMINI_API_KEY_3" | npx wrangler secret put GEMINI_API_KEY3

echo "Setting GROQ_API_KEY..."
echo "YOUR_GROQ_API_KEY" | npx wrangler secret put GROQ_API_KEY

echo ""
echo "✅ Secrets configured successfully!"
echo ""

echo "🚀 Step 3: Deploying Worker..."
npx wrangler deploy

echo ""
echo "✅ Worker deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Copy the Worker URL from above"
echo "2. Go to Cloudflare Pages project settings"
echo "3. Add environment variable: VITE_PROXY_URL = <worker-url>"
echo "4. Set GitHub secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID"
echo "5. Push to main branch to trigger CI/CD"
echo ""
echo "🎉 Deployment setup complete!"
