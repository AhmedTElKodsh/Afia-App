# Setup API Keys for Afia Worker (PowerShell)
# This script helps you configure all required API keys for the LLM providers

Write-Host "🔐 Afia Worker - API Keys Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will help you set up API keys for:"
Write-Host "  1. Gemini API (Primary - 3 keys for rotation)"
Write-Host "  2. Groq API (Fallback)"
Write-Host "  3. OpenRouter API (Fallback)"
Write-Host "  4. Mistral API (Fallback)"
Write-Host ""
Write-Host "📝 Get your free API keys from:" -ForegroundColor Yellow
Write-Host "  - Gemini: https://aistudio.google.com/app/apikey"
Write-Host "  - Groq: https://console.groq.com/keys"
Write-Host "  - OpenRouter: https://openrouter.ai/keys"
Write-Host "  - Mistral: https://console.mistral.ai/api-keys/"
Write-Host ""
Write-Host "Press Enter to continue or Ctrl+C to cancel..."
Read-Host

Set-Location worker

Write-Host ""
Write-Host "🔑 Setting up Gemini API Keys (Primary Provider)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Gemini Key 1 (Required)
Write-Host "Enter your first Gemini API key (required):" -ForegroundColor Yellow
$GEMINI_KEY_1 = Read-Host -AsSecureString
$GEMINI_KEY_1_Plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($GEMINI_KEY_1))

if ([string]::IsNullOrWhiteSpace($GEMINI_KEY_1_Plain)) {
    Write-Host "❌ Error: Gemini API key is required!" -ForegroundColor Red
    exit 1
}

$GEMINI_KEY_1_Plain | npx wrangler secret put GEMINI_API_KEY --env stage1
Write-Host "✅ GEMINI_API_KEY set successfully" -ForegroundColor Green

# Gemini Key 2 (Optional)
Write-Host ""
Write-Host "Enter your second Gemini API key (optional, press Enter to skip):" -ForegroundColor Yellow
$GEMINI_KEY_2 = Read-Host -AsSecureString
$GEMINI_KEY_2_Plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($GEMINI_KEY_2))

if (-not [string]::IsNullOrWhiteSpace($GEMINI_KEY_2_Plain)) {
    $GEMINI_KEY_2_Plain | npx wrangler secret put GEMINI_API_KEY2 --env stage1
    Write-Host "✅ GEMINI_API_KEY2 set successfully" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipped GEMINI_API_KEY2" -ForegroundColor Gray
}

# Gemini Key 3 (Optional)
Write-Host ""
Write-Host "Enter your third Gemini API key (optional, press Enter to skip):" -ForegroundColor Yellow
$GEMINI_KEY_3 = Read-Host -AsSecureString
$GEMINI_KEY_3_Plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($GEMINI_KEY_3))

if (-not [string]::IsNullOrWhiteSpace($GEMINI_KEY_3_Plain)) {
    $GEMINI_KEY_3_Plain | npx wrangler secret put GEMINI_API_KEY3 --env stage1
    Write-Host "✅ GEMINI_API_KEY3 set successfully" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipped GEMINI_API_KEY3" -ForegroundColor Gray
}

# Gemini Key 4 (Optional)
Write-Host ""
Write-Host "Enter your fourth Gemini API key (optional, press Enter to skip):" -ForegroundColor Yellow
$GEMINI_KEY_4 = Read-Host -AsSecureString
$GEMINI_KEY_4_Plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($GEMINI_KEY_4))

if (-not [string]::IsNullOrWhiteSpace($GEMINI_KEY_4_Plain)) {
    $GEMINI_KEY_4_Plain | npx wrangler secret put GEMINI_API_KEY4 --env stage1
    Write-Host "✅ GEMINI_API_KEY4 set successfully" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipped GEMINI_API_KEY4" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🔑 Setting up Fallback Provider Keys (Optional)" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Groq Key (Optional)
Write-Host "Enter your Groq API key (optional, press Enter to skip):" -ForegroundColor Yellow
$GROQ_KEY = Read-Host -AsSecureString
$GROQ_KEY_Plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($GROQ_KEY))

if (-not [string]::IsNullOrWhiteSpace($GROQ_KEY_Plain)) {
    $GROQ_KEY_Plain | npx wrangler secret put GROQ_API_KEY --env stage1
    Write-Host "✅ GROQ_API_KEY set successfully" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipped GROQ_API_KEY" -ForegroundColor Gray
}

# OpenRouter Key (Optional)
Write-Host ""
Write-Host "Enter your OpenRouter API key (optional, press Enter to skip):" -ForegroundColor Yellow
$OPENROUTER_KEY = Read-Host -AsSecureString
$OPENROUTER_KEY_Plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($OPENROUTER_KEY))

if (-not [string]::IsNullOrWhiteSpace($OPENROUTER_KEY_Plain)) {
    $OPENROUTER_KEY_Plain | npx wrangler secret put OPENROUTER_API_KEY --env stage1
    Write-Host "✅ OPENROUTER_API_KEY set successfully" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipped OPENROUTER_API_KEY" -ForegroundColor Gray
}

# Mistral Key (Optional)
Write-Host ""
Write-Host "Enter your Mistral API key (optional, press Enter to skip):" -ForegroundColor Yellow
$MISTRAL_KEY = Read-Host -AsSecureString
$MISTRAL_KEY_Plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($MISTRAL_KEY))

if (-not [string]::IsNullOrWhiteSpace($MISTRAL_KEY_Plain)) {
    $MISTRAL_KEY_Plain | npx wrangler secret put MISTRAL_API_KEY --env stage1
    Write-Host "✅ MISTRAL_API_KEY set successfully" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipped MISTRAL_API_KEY" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ API Keys Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:"
Write-Host "  - Gemini keys configured: Primary provider"
Write-Host "  - Fallback providers: Available if Gemini fails"
Write-Host ""
Write-Host "🚀 Next Steps:"
Write-Host "  1. Test the app by scanning a bottle"
Write-Host "  2. Check the admin dashboard for scan results"
Write-Host "  3. Monitor API usage in the provider dashboards"
Write-Host ""
Write-Host "💡 Tips:"
Write-Host "  - Gemini free tier: 15 requests/minute, 1500 requests/day"
Write-Host "  - Use multiple keys to increase rate limits"
Write-Host "  - Fallback providers activate automatically if Gemini fails"
Write-Host ""
