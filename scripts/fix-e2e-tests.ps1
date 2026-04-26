# PowerShell script to fix and run E2E tests
# This script helps diagnose and fix common E2E test issues

Write-Host "🔧 Fixing E2E Tests..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if dev servers are running
Write-Host "📡 Checking dev servers..." -ForegroundColor Yellow

$viteRunning = $false
$workerRunning = $false

try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:5173" -TimeoutSec 2 -ErrorAction SilentlyContinue
    $viteRunning = $true
    Write-Host "✅ Vite dev server is running on port 5173" -ForegroundColor Green
} catch {
    Write-Host "❌ Vite dev server is NOT running on port 5173" -ForegroundColor Red
    Write-Host "   Note: Playwright will start it automatically" -ForegroundColor Gray
}

try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8787/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
    $workerRunning = $true
    Write-Host "✅ Worker dev server is running on port 8787" -ForegroundColor Green
} catch {
    Write-Host "❌ Worker dev server is NOT running on port 8787" -ForegroundColor Red
    Write-Host "   Note: Playwright will start it automatically" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🧪 Running E2E tests..." -ForegroundColor Cyan
Write-Host ""

# Step 2: Run tests with increased timeouts
npm run test:e2e

# Capture exit code
$testExitCode = $LASTEXITCODE

Write-Host ""
if ($testExitCode -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Some tests failed. Check the output above for details." -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Common fixes:" -ForegroundColor Yellow
    Write-Host "   1. Increase timeouts in playwright.config.ts"
    Write-Host "   2. Check if dev servers are running properly"
    Write-Host "   3. Clear browser cache: npx playwright clean"
    Write-Host "   4. Update Playwright: npm install -D @playwright/test@latest"
    Write-Host "   5. Kill any hanging processes on ports 5173 or 8787"
}

exit $testExitCode
