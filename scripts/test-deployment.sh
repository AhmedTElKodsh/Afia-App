#!/bin/bash
# Test deployment script for Cloudflare Pages
# This script helps verify your deployment setup locally

set -e

echo "🔍 Testing Cloudflare deployment setup..."
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler is not installed"
    echo "   Run: npm install -g wrangler"
    exit 1
fi

echo "✅ wrangler is installed"

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare"
    echo "   Run: wrangler login"
    exit 1
fi

echo "✅ Logged in to Cloudflare"

# Get account info
ACCOUNT_INFO=$(wrangler whoami 2>&1)
echo ""
echo "📋 Account Information:"
echo "$ACCOUNT_INFO"
echo ""

# Check if project exists
echo "🔍 Checking if afia-app project exists..."
if wrangler pages project list 2>&1 | grep -q "afia-app"; then
    echo "✅ Project 'afia-app' exists"
else
    echo "⚠️  Project 'afia-app' not found"
    echo "   Creating project..."
    wrangler pages project create afia-app --production-branch=master
fi

echo ""
echo "🎯 Expected Account ID: a34f53a07c2ef6f31c29f1dc20b71b23"
echo ""
echo "📝 To deploy manually, run:"
echo "   npm run build"
echo "   npx wrangler pages deploy dist --project-name=afia-app --branch=master"
echo ""
echo "✅ Setup verification complete!"
