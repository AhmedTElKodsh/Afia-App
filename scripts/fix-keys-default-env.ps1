# Fix API Keys - Set for Default Environment
# This script sets API keys for the DEFAULT worker environment (no --env flag)

Write-Host "🔧 Fixing API Keys Environment" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Problem: Keys were set with --env stage1, but worker uses default environment" -ForegroundColor Yellow
Write-Host "Solution: Setting keys for DEFAULT environment (no --env flag)" -ForegroundColor Green
Write-Host ""
Write-Host "Press Enter to continue or Ctrl+C to cancel..."
Read-Host

Set-Location worker

Write-Host ""
Write-Host "🔑 Setting Gemini API Keys" -ForegroundColor Cyan
Write-Host ""

# Gemini Key 1 (Required)
Write-Host "Enter your first Gemini API key:" -ForegroundColor Yellow
$GEMINI_KEY_1 = Read-Host -AsSecureString
$GEMINI_KEY_1_Plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($GEMINI_KEY_1))

if ([string]::IsNullOrWhiteSpace($GEMINI_KEY_1_Plain)) {
    Write-Host "❌ Error: Gemini API key is required!" -ForegroundColor Red
    exit 1
}

Write-Host "Setting GEMINI_API_KEY (default environment)..." -ForegroundColor Gray
$GEMINI_KEY_1_Plain | npx wrangler secret put GEMINI_API_KEY
Write-Host "✅ GEMINI_API_KEY set successfully" -ForegroundColor Green

# Gemini Key 2 (Optional)
Write-Host ""
Write-Host "Enter your second Gemini API key (press Enter to skip):" -ForegroundColor Yellow
$GEMINI_KEY_2 = Read-Host -AsSecureString
$GEMINI_KEY_2_Plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($GEMINI_KEY_2))

if (-not [string]::IsNullOrWhiteSpace($GEMINI_KEY_2_Plain)) {
    Write-Host "Setting GEMINI_API_KEY2 (default environment)..." -ForegroundColor Gray
    $GEMINI_KEY_2_Plain | npx wrangler secret put GEMINI_API_KEY2
    Write-Host "✅ GEMINI_API_KEY2 set successfully" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipped GEMINI_API_KEY2" -ForegroundColor Gray
}

# Gemini Key 3 (Optional)
Write-Host ""
Write-Host "Enter your third Gemini API key (press Enter to skip):" -ForegroundColor Yellow
$GEMINI_KEY_3 = Read-Host -AsSecureString
$GEMINI_KEY_3_Plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($GEMINI_KEY_3))

if (-not [string]::IsNullOrWhiteSpace($GEMINI_KEY_3_Plain)) {
    Write-Host "Setting GEMINI_API_KEY3 (default environment)..." -ForegroundColor Gray
    $GEMINI_KEY_3_Plain | npx wrangler secret put GEMINI_API_KEY3
    Write-Host "✅ GEMINI_API_KEY3 set successfully" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipped GEMINI_API_KEY3" -ForegroundColor Gray
}

# Gemini Key 4 (Optional)
Write-Host ""
Write-Host "Enter your fourth Gemini API key (press Enter to skip):" -ForegroundColor Yellow
$GEMINI_KEY_4 = Read-Host -AsSecureString
$GEMINI_KEY_4_Plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($GEMINI_KEY_4))

if (-not [string]::IsNullOrWhiteSpace($GEMINI_KEY_4_Plain)) {
    Write-Host "Setting GEMINI_API_KEY4 (default environment)..." -ForegroundColor Gray
    $GEMINI_KEY_4_Plain | npx wrangler secret put GEMINI_API_KEY4
    Write-Host "✅ GEMINI_API_KEY4 set successfully" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipped GEMINI_API_KEY4" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🔑 Setting Fallback Provider Keys (Optional)" -ForegroundColor Cyan
Write-Host ""

# Groq Key (Optional)
Write-Host "Enter your Groq API key (press Enter to skip):" -ForegroundColor Yellow
$GROQ_KEY = Read-Host -AsSecureString
$GROQ_KEY_Plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($GROQ_KEY))

if (-not [string]::IsNullOrWhiteSpace($GROQ_KEY_Plain)) {
    Write-Host "Setting GROQ_API_KEY (default environment)..." -ForegroundColor Gray
    $GROQ_KEY_Plain | npx wrangler secret put GROQ_API_KEY
    Write-Host "✅ GROQ_API_KEY set successfully" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipped GROQ_API_KEY" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ API Keys Fixed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Verifying configuration..." -ForegroundColor Cyan
npx wrangler secret list

Write-Host ""
Write-Host "🎉 Done! Your API keys are now set for the correct environment." -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Security Note:" -ForegroundColor Yellow
Write-Host "Go to Cloudflare Dashboard and delete the PLAINTEXT 'GEMINI_API_Key3' variable" -ForegroundColor Yellow
Write-Host "It should be a SECRET, not plaintext!" -ForegroundColor Yellow
Write-Host ""
Write-Host "🧪 Test the app now - analysis should work!" -ForegroundColor Green
Write-Host ""
