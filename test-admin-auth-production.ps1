# Admin Authentication Production Test Script (PowerShell)
# Tests the admin authentication flow against production worker

$WORKER_URL = "https://afia-worker.savola.workers.dev"
$PAGES_URL = "https://afia-app.pages.dev"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Admin Auth Production Test" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if worker is reachable
Write-Host "Test 1: Checking if worker is reachable..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$WORKER_URL/model/version" -Method GET -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Worker is reachable (HTTP $($response.StatusCode))" -ForegroundColor Green
        Write-Host "  Response: $($response.Content)"
    }
} catch {
    Write-Host "✗ Worker is NOT reachable" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  This is likely the problem!" -ForegroundColor Red
}
Write-Host ""

# Test 2: Check CORS preflight
Write-Host "Test 2: Testing CORS preflight from Pages origin..." -ForegroundColor Yellow
try {
    $headers = @{
        "Origin" = $PAGES_URL
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "Content-Type"
    }
    $response = Invoke-WebRequest -Uri "$WORKER_URL/admin/auth" -Method OPTIONS -Headers $headers -UseBasicParsing
    if ($response.StatusCode -eq 204 -or $response.StatusCode -eq 200) {
        Write-Host "✓ CORS preflight successful (HTTP $($response.StatusCode))" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ CORS preflight failed" -ForegroundColor Red
    Write-Host "  Worker may not allow requests from $PAGES_URL" -ForegroundColor Red
}
Write-Host ""

# Test 3: Test auth endpoint with wrong password
Write-Host "Test 3: Testing auth endpoint with wrong password..." -ForegroundColor Yellow
try {
    $body = @{
        password = "wrong_password_test"
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
        "Origin" = $PAGES_URL
    }

    $response = Invoke-WebRequest -Uri "$WORKER_URL/admin/auth" -Method POST -Body $body -Headers $headers -UseBasicParsing
    Write-Host "✗ Unexpected success (HTTP $($response.StatusCode))" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✓ Auth endpoint working correctly (HTTP 401)" -ForegroundColor Green
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody"
    } else {
        Write-Host "✗ Unexpected response (HTTP $($_.Exception.Response.StatusCode))" -ForegroundColor Red
    }
}
Write-Host ""

# Test 4: Test auth endpoint with missing password
Write-Host "Test 4: Testing auth endpoint with missing password..." -ForegroundColor Yellow
try {
    $body = @{} | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
        "Origin" = $PAGES_URL
    }

    $response = Invoke-WebRequest -Uri "$WORKER_URL/admin/auth" -Method POST -Body $body -Headers $headers -UseBasicParsing
    Write-Host "✗ Unexpected success (HTTP $($response.StatusCode))" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✓ Validation working correctly (HTTP 400)" -ForegroundColor Green
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody"
    } else {
        Write-Host "✗ Unexpected response (HTTP $($_.Exception.Response.StatusCode))" -ForegroundColor Red
    }
}
Write-Host ""

# Summary
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If all tests passed:" -ForegroundColor White
Write-Host "  → The worker is configured correctly" -ForegroundColor White
Write-Host "  → The issue is likely with the frontend configuration" -ForegroundColor White
Write-Host "  → Check if VITE_PROXY_URL is set in Cloudflare Pages" -ForegroundColor Yellow
Write-Host ""
Write-Host "If Test 1 failed:" -ForegroundColor White
Write-Host "  → Worker is not deployed or URL is wrong" -ForegroundColor White
Write-Host "  → Deploy the worker: cd worker && npm run deploy" -ForegroundColor Yellow
Write-Host ""
Write-Host "If Test 2 failed:" -ForegroundColor White
Write-Host "  → CORS is not configured for $PAGES_URL" -ForegroundColor White
Write-Host "  → Check ALLOWED_ORIGINS in worker/wrangler.toml" -ForegroundColor Yellow
Write-Host ""
Write-Host "If Test 3 or 4 failed:" -ForegroundColor White
Write-Host "  → Auth endpoint has issues" -ForegroundColor White
Write-Host "  → Check worker logs in Cloudflare dashboard" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. If tests pass, check browser console at $PAGES_URL" -ForegroundColor White
Write-Host "  2. Verify VITE_PROXY_URL in Cloudflare Pages settings" -ForegroundColor White
Write-Host "  3. Redeploy Pages after setting environment variable" -ForegroundColor White
Write-Host ""

# Made with Bob
