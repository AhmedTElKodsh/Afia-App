# Verify and Set Secrets for Afia Worker
# This script ensures all required secrets are set in Cloudflare Workers

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Afia Worker Secrets Verification" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if wrangler is available
try {
    $wranglerVersion = node_modules/.bin/wrangler --version 2>&1
    Write-Host "✓ Wrangler found: $wranglerVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Wrangler not found. Installing..." -ForegroundColor Red
    npm install -g wrangler
}

Write-Host ""
Write-Host "Checking secrets for DEFAULT environment (stage1 production)..." -ForegroundColor Yellow
Write-Host ""

# List current secrets in default environment
Write-Host "Current secrets in DEFAULT environment:" -ForegroundColor Cyan
node_modules/.bin/wrangler secret list 2>&1

Write-Host ""
Write-Host "Current secrets in STAGE1 environment:" -ForegroundColor Cyan
node_modules/.bin/wrangler secret list --env stage1 2>&1

Write-Host ""
Write-Host "Current secrets in STAGE2 environment:" -ForegroundColor Cyan
node_modules/.bin/wrangler secret list --env stage2 2>&1

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Required Secrets Checklist:" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "For DEFAULT environment (used by stage-1-llm-only branch):" -ForegroundColor Yellow
Write-Host "  □ ADMIN_PASSWORD" -ForegroundColor White
Write-Host "  □ GEMINI_API_KEY" -ForegroundColor White
Write-Host "  □ GEMINI_API_KEY2" -ForegroundColor White
Write-Host "  □ GEMINI_API_KEY3" -ForegroundColor White
Write-Host "  □ GROQ_API_KEY" -ForegroundColor White
Write-Host ""
Write-Host "For STAGE1 environment:" -ForegroundColor Yellow
Write-Host "  □ ADMIN_PASSWORD" -ForegroundColor White
Write-Host "  □ GEMINI_API_KEY" -ForegroundColor White
Write-Host "  □ GEMINI_API_KEY2" -ForegroundColor White
Write-Host "  □ GEMINI_API_KEY3" -ForegroundColor White
Write-Host "  □ GROQ_API_KEY" -ForegroundColor White
Write-Host ""
Write-Host "For STAGE2 environment:" -ForegroundColor Yellow
Write-Host "  □ ADMIN_PASSWORD" -ForegroundColor White
Write-Host "  □ GEMINI_API_KEY" -ForegroundColor White
Write-Host "  □ GEMINI_API_KEY2" -ForegroundColor White
Write-Host "  □ GEMINI_API_KEY3" -ForegroundColor White
Write-Host "  □ GROQ_API_KEY" -ForegroundColor White
Write-Host ""

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "To set secrets, run these commands:" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "# For DEFAULT environment (stage-1-llm-only production):" -ForegroundColor Yellow
Write-Host 'echo "YOUR_ADMIN_PASSWORD" | node_modules/.bin/wrangler secret put ADMIN_PASSWORD' -ForegroundColor White
Write-Host 'echo "YOUR_GEMINI_KEY" | node_modules/.bin/wrangler secret put GEMINI_API_KEY' -ForegroundColor White
Write-Host 'echo "YOUR_GEMINI_KEY2" | node_modules/.bin/wrangler secret put GEMINI_API_KEY2' -ForegroundColor White
Write-Host 'echo "YOUR_GEMINI_KEY3" | node_modules/.bin/wrangler secret put GEMINI_API_KEY3' -ForegroundColor White
Write-Host 'echo "YOUR_GROQ_KEY" | node_modules/.bin/wrangler secret put GROQ_API_KEY' -ForegroundColor White
Write-Host ""
Write-Host "# For STAGE1 environment:" -ForegroundColor Yellow
Write-Host 'echo "YOUR_ADMIN_PASSWORD" | node_modules/.bin/wrangler secret put ADMIN_PASSWORD --env stage1' -ForegroundColor White
Write-Host 'echo "YOUR_GEMINI_KEY" | node_modules/.bin/wrangler secret put GEMINI_API_KEY --env stage1' -ForegroundColor White
Write-Host 'echo "YOUR_GEMINI_KEY2" | node_modules/.bin/wrangler secret put GEMINI_API_KEY2 --env stage1' -ForegroundColor White
Write-Host 'echo "YOUR_GEMINI_KEY3" | node_modules/.bin/wrangler secret put GEMINI_API_KEY3 --env stage1' -ForegroundColor White
Write-Host 'echo "YOUR_GROQ_KEY" | node_modules/.bin/wrangler secret put GROQ_API_KEY --env stage1' -ForegroundColor White
Write-Host ""
Write-Host "# For STAGE2 environment:" -ForegroundColor Yellow
Write-Host 'echo "YOUR_ADMIN_PASSWORD" | node_modules/.bin/wrangler secret put ADMIN_PASSWORD --env stage2' -ForegroundColor White
Write-Host 'echo "YOUR_GEMINI_KEY" | node_modules/.bin/wrangler secret put GEMINI_API_KEY --env stage2' -ForegroundColor White
Write-Host 'echo "YOUR_GEMINI_KEY2" | node_modules/.bin/wrangler secret put GEMINI_API_KEY2 --env stage2' -ForegroundColor White
Write-Host 'echo "YOUR_GEMINI_KEY3" | node_modules/.bin/wrangler secret put GEMINI_API_KEY3 --env stage2' -ForegroundColor White
Write-Host 'echo "YOUR_GROQ_KEY" | node_modules/.bin/wrangler secret put GROQ_API_KEY --env stage2' -ForegroundColor White
Write-Host ""

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Get Free API Keys:" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Gemini: https://aistudio.google.com/app/apikey" -ForegroundColor White
Write-Host "Groq: https://console.groq.com/keys" -ForegroundColor White
Write-Host ""

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Interactive Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
$response = Read-Host "Would you like to set secrets now? (y/n)"

if ($response -eq "y" -or $response -eq "Y") {
    Write-Host ""
    Write-Host "Setting secrets for DEFAULT environment..." -ForegroundColor Yellow
    Write-Host ""

    $adminPassword = Read-Host "Enter ADMIN_PASSWORD" -AsSecureString
    $adminPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPassword))
    echo $adminPasswordPlain | node_modules/.bin/wrangler secret put ADMIN_PASSWORD

    $geminiKey = Read-Host "Enter GEMINI_API_KEY"
    echo $geminiKey | node_modules/.bin/wrangler secret put GEMINI_API_KEY

    $geminiKey2 = Read-Host "Enter GEMINI_API_KEY2 (or press Enter to skip)"
    if ($geminiKey2) {
        echo $geminiKey2 | node_modules/.bin/wrangler secret put GEMINI_API_KEY2
    }

    $geminiKey3 = Read-Host "Enter GEMINI_API_KEY3 (or press Enter to skip)"
    if ($geminiKey3) {
        echo $geminiKey3 | node_modules/.bin/wrangler secret put GEMINI_API_KEY3
    }

    $groqKey = Read-Host "Enter GROQ_API_KEY (or press Enter to skip)"
    if ($groqKey) {
        echo $groqKey | node_modules/.bin/wrangler secret put GROQ_API_KEY
    }

    Write-Host ""
    $setStage1 = Read-Host "Set secrets for STAGE1 environment too? (y/n)"
    if ($setStage1 -eq "y" -or $setStage1 -eq "Y") {
        echo $adminPasswordPlain | node_modules/.bin/wrangler secret put ADMIN_PASSWORD --env stage1
        echo $geminiKey | node_modules/.bin/wrangler secret put GEMINI_API_KEY --env stage1
        if ($geminiKey2) { echo $geminiKey2 | node_modules/.bin/wrangler secret put GEMINI_API_KEY2 --env stage1 }
        if ($geminiKey3) { echo $geminiKey3 | node_modules/.bin/wrangler secret put GEMINI_API_KEY3 --env stage1 }
        if ($groqKey) { echo $groqKey | node_modules/.bin/wrangler secret put GROQ_API_KEY --env stage1 }
    }

    Write-Host ""
    $setStage2 = Read-Host "Set secrets for STAGE2 environment too? (y/n)"
    if ($setStage2 -eq "y" -or $setStage2 -eq "Y") {
        echo $adminPasswordPlain | node_modules/.bin/wrangler secret put ADMIN_PASSWORD --env stage2
        echo $geminiKey | node_modules/.bin/wrangler secret put GEMINI_API_KEY --env stage2
        if ($geminiKey2) { echo $geminiKey2 | node_modules/.bin/wrangler secret put GEMINI_API_KEY2 --env stage2 }
        if ($geminiKey3) { echo $geminiKey3 | node_modules/.bin/wrangler secret put GEMINI_API_KEY3 --env stage2 }
        if ($groqKey) { echo $groqKey | node_modules/.bin/wrangler secret put GROQ_API_KEY --env stage2 }
    }

    Write-Host ""
    Write-Host "✓ Secrets set successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Skipping interactive setup. Use the commands above to set secrets manually." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Verification Complete" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
