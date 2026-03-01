# Safi Oil Tracker - Deployment Setup Script (PowerShell)
# This script helps set up Worker secrets and deploy to Cloudflare

Write-Host "Safi Oil Tracker - Deployment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to worker directory (handle being run from project root or worker dir)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($scriptPath -notmatch "worker$") {
    Set-Location (Join-Path $scriptPath "worker")
} else {
    # Already in worker directory, stay here
    Write-Host "Already in worker directory" -ForegroundColor Gray
}

Write-Host "Step 1: Installing Worker dependencies..." -ForegroundColor Yellow
npm ci

Write-Host ""
Write-Host "Step 2: Setting Worker secrets..." -ForegroundColor Yellow
Write-Host ""

# Set Gemini API keys
Write-Host "Setting GEMINI_API_KEY..."
"YOUR_GEMINI_API_KEY_1" | npx wrangler secret put GEMINI_API_KEY

Write-Host "Setting GEMINI_API_KEY2..."
"YOUR_GEMINI_API_KEY_2" | npx wrangler secret put GEMINI_API_KEY2

Write-Host "Setting GEMINI_API_KEY3..."
"YOUR_GEMINI_API_KEY_3" | npx wrangler secret put GEMINI_API_KEY3

Write-Host "Setting GROQ_API_KEY..."
"YOUR_GROQ_API_KEY" | npx wrangler secret put GROQ_API_KEY

Write-Host ""
Write-Host "Secrets configured successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Deploying Worker..." -ForegroundColor Yellow
npx wrangler deploy

Write-Host ""
Write-Host "Worker deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy the Worker URL from above"
Write-Host "2. Go to Cloudflare Pages project settings"
Write-Host "3. Add environment variable: VITE_PROXY_URL = YOUR_WORKER_URL"
Write-Host "4. Set GitHub secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID"
Write-Host "5. Push to main branch to trigger CI/CD"
Write-Host ""
Write-Host "Deployment setup complete!" -ForegroundColor Green

# Return to original directory if we changed it
if ($scriptPath -notmatch "worker$") {
    Set-Location $scriptPath
}
