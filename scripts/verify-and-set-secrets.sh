#!/bin/bash
# Verify and Set Secrets for Afia Worker
# This script ensures all required secrets are set in Cloudflare Workers

echo "=================================="
echo "Afia Worker Secrets Verification"
echo "=================================="
echo ""

# Check if wrangler is available
if command -v npx &> /dev/null; then
    echo "✓ Wrangler found"
else
    echo "✗ Wrangler not found. Please install Node.js and npm"
    exit 1
fi

echo ""
echo "Checking secrets for DEFAULT environment (stage1 production)..."
echo ""

# List current secrets in default environment
echo "Current secrets in DEFAULT environment:"
npx wrangler secret list 2>&1 || echo "Failed to list secrets"

echo ""
echo "Current secrets in STAGE1 environment:"
npx wrangler secret list --env stage1 2>&1 || echo "Failed to list secrets"

echo ""
echo "Current secrets in STAGE2 environment:"
npx wrangler secret list --env stage2 2>&1 || echo "Failed to list secrets"

echo ""
echo "=================================="
echo "Required Secrets Checklist:"
echo "=================================="
echo ""
echo "For DEFAULT environment (used by stage-1-llm-only branch):"
echo "  □ ADMIN_PASSWORD"
echo "  □ GEMINI_API_KEY"
echo "  □ GEMINI_API_KEY2"
echo "  □ GEMINI_API_KEY3"
echo "  □ GROQ_API_KEY"
echo ""
echo "For STAGE1 environment:"
echo "  □ ADMIN_PASSWORD"
echo "  □ GEMINI_API_KEY"
echo "  □ GEMINI_API_KEY2"
echo "  □ GEMINI_API_KEY3"
echo "  □ GROQ_API_KEY"
echo ""
echo "For STAGE2 environment:"
echo "  □ ADMIN_PASSWORD"
echo "  □ GEMINI_API_KEY"
echo "  □ GEMINI_API_KEY2"
echo "  □ GEMINI_API_KEY3"
echo "  □ GROQ_API_KEY"
echo ""

echo "=================================="
echo "To set secrets, run these commands:"
echo "=================================="
echo ""
echo "# For DEFAULT environment (stage-1-llm-only production):"
echo 'echo "YOUR_ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD'
echo 'echo "YOUR_GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY'
echo 'echo "YOUR_GEMINI_KEY2" | npx wrangler secret put GEMINI_API_KEY2'
echo 'echo "YOUR_GEMINI_KEY3" | npx wrangler secret put GEMINI_API_KEY3'
echo 'echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY'
echo ""
echo "# For STAGE1 environment:"
echo 'echo "YOUR_ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD --env stage1'
echo 'echo "YOUR_GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY --env stage1'
echo 'echo "YOUR_GEMINI_KEY2" | npx wrangler secret put GEMINI_API_KEY2 --env stage1'
echo 'echo "YOUR_GEMINI_KEY3" | npx wrangler secret put GEMINI_API_KEY3 --env stage1'
echo 'echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY --env stage1'
echo ""
echo "# For STAGE2 environment:"
echo 'echo "YOUR_ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD --env stage2'
echo 'echo "YOUR_GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY --env stage2'
echo 'echo "YOUR_GEMINI_KEY2" | npx wrangler secret put GEMINI_API_KEY2 --env stage2'
echo 'echo "YOUR_GEMINI_KEY3" | npx wrangler secret put GEMINI_API_KEY3 --env stage2'
echo 'echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY --env stage2'
echo ""

echo "=================================="
echo "Get Free API Keys:"
echo "=================================="
echo "Gemini: https://aistudio.google.com/app/apikey"
echo "Groq: https://console.groq.com/keys"
echo ""

echo "=================================="
echo "Interactive Setup"
echo "=================================="
echo ""
read -p "Would you like to set secrets now? (y/n): " response

if [[ "$response" == "y" || "$response" == "Y" ]]; then
    echo ""
    echo "Setting secrets for DEFAULT environment..."
    echo ""

    read -sp "Enter ADMIN_PASSWORD: " adminPassword
    echo ""
    echo "$adminPassword" | npx wrangler secret put ADMIN_PASSWORD

    read -p "Enter GEMINI_API_KEY: " geminiKey
    echo "$geminiKey" | npx wrangler secret put GEMINI_API_KEY

    read -p "Enter GEMINI_API_KEY2 (or press Enter to skip): " geminiKey2
    if [[ -n "$geminiKey2" ]]; then
        echo "$geminiKey2" | npx wrangler secret put GEMINI_API_KEY2
    fi

    read -p "Enter GEMINI_API_KEY3 (or press Enter to skip): " geminiKey3
    if [[ -n "$geminiKey3" ]]; then
        echo "$geminiKey3" | npx wrangler secret put GEMINI_API_KEY3
    fi

    read -p "Enter GROQ_API_KEY (or press Enter to skip): " groqKey
    if [[ -n "$groqKey" ]]; then
        echo "$groqKey" | npx wrangler secret put GROQ_API_KEY
    fi

    echo ""
    read -p "Set secrets for STAGE1 environment too? (y/n): " setStage1
    if [[ "$setStage1" == "y" || "$setStage1" == "Y" ]]; then
        echo "$adminPassword" | npx wrangler secret put ADMIN_PASSWORD --env stage1
        echo "$geminiKey" | npx wrangler secret put GEMINI_API_KEY --env stage1
        [[ -n "$geminiKey2" ]] && echo "$geminiKey2" | npx wrangler secret put GEMINI_API_KEY2 --env stage1
        [[ -n "$geminiKey3" ]] && echo "$geminiKey3" | npx wrangler secret put GEMINI_API_KEY3 --env stage1
        [[ -n "$groqKey" ]] && echo "$groqKey" | npx wrangler secret put GROQ_API_KEY --env stage1
    fi

    echo ""
    read -p "Set secrets for STAGE2 environment too? (y/n): " setStage2
    if [[ "$setStage2" == "y" || "$setStage2" == "Y" ]]; then
        echo "$adminPassword" | npx wrangler secret put ADMIN_PASSWORD --env stage2
        echo "$geminiKey" | npx wrangler secret put GEMINI_API_KEY --env stage2
        [[ -n "$geminiKey2" ]] && echo "$geminiKey2" | npx wrangler secret put GEMINI_API_KEY2 --env stage2
        [[ -n "$geminiKey3" ]] && echo "$geminiKey3" | npx wrangler secret put GEMINI_API_KEY3 --env stage2
        [[ -n "$groqKey" ]] && echo "$groqKey" | npx wrangler secret put GROQ_API_KEY --env stage2
    fi

    echo ""
    echo "✓ Secrets set successfully!"
else
    echo ""
    echo "Skipping interactive setup. Use the commands above to set secrets manually."
fi

echo ""
echo "=================================="
echo "Verification Complete"
echo "=================================="
