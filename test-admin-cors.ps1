#!/usr/bin/env pwsh
# Test Admin Authentication CORS and Configuration

$WORKER_URL = "https://afia-worker.savola.workers.dev"
$PAGES_URL = "https://afia-app.pages.dev"
$PASSWORD = "1234"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Admin Authentication Diagnostic Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Worker Health Check
Write-Host "[Test 1] Worker Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$WORKER_URL/health" -Method GET -UseBasicParsing
    Write-Host "✓ Worker is online (Status: $($response.StatusCode))" -ForegroundColor Green
    Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Worker health check failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: CORS Preflight (OPTIONS request with Origin header)
Write-Host "[Test 2] CORS Preflight Check..." -ForegroundColor Yellow
try {
    $headers = @{
        "Origin" = $PAGES_URL
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "Content-Type"
    }
    $response = Invoke-WebRequest -Uri "$WORKER_URL/admin/auth" -Method OPTIONS -Headers $headers -UseBasicParsing

    $allowOrigin = $response.Headers["Access-Control-Allow-Origin"]
    $allowMethods = $response.Headers["Access-Control-Allow-Methods"]
    $allowHeaders = $response.Headers["Access-Control-Allow-Headers"]

    Write-Host "✓ CORS Preflight successful (Status: $($response.StatusCode))" -ForegroundColor Green
    Write-Host "  Access-Control-Allow-Origin: $allowOrigin" -ForegroundColor Gray
    Write-Host "  Access-Control-Allow-Methods: $allowMethods" -ForegroundColor Gray
    Write-Host "  Access-Control-Allow-Headers: $allowHeaders" -ForegroundColor Gray

    if ($allowOrigin -ne $PAGES_URL) {
        Write-Host "⚠ WARNING: Origin mismatch!" -ForegroundColor Yellow
        Write-Host "  Expected: $PAGES_URL" -ForegroundColor Yellow
        Write-Host "  Got: $allowOrigin" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ CORS Preflight failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host "  This means the worker is rejecting requests from $PAGES_URL" -ForegroundColor Red
}
Write-Host ""

# Test 3: Admin Auth without Origin (should work)
Write-Host "[Test 3] Admin Auth (no Origin header)..." -ForegroundColor Yellow
try {
    $body = @{ password = $PASSWORD } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$WORKER_URL/admin/auth" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing

    $data = $response.Content | ConvertFrom-Json
    Write-Host "✓ Authentication successful (no Origin)" -ForegroundColor Green
    Write-Host "  Token received: $($data.token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    $errorResponse = $_.Exception.Response
    $statusCode = $errorResponse.StatusCode.value__

    if ($statusCode -eq 401) {
        Write-Host "✗ Authentication failed: Invalid password" -ForegroundColor Red
        Write-Host "  The ADMIN_PASSWORD in the worker is not '1234'" -ForegroundColor Red
    } elseif ($statusCode -eq 503) {
        Write-Host "✗ Authentication failed: ADMIN_PASSWORD not configured" -ForegroundColor Red
        Write-Host "  The ADMIN_PASSWORD secret is not set in the worker" -ForegroundColor Red
    } else {
        Write-Host "✗ Authentication failed (Status: $statusCode)" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
    }
}
Write-Host ""

# Test 4: Admin Auth with Origin header (simulating browser request)
Write-Host "[Test 4] Admin Auth (with Origin header)..." -ForegroundColor Yellow
try {
    $headers = @{
        "Origin" = $PAGES_URL
        "Content-Type" = "application/json"
    }
    $body = @{ password = $PASSWORD } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$WORKER_URL/admin/auth" -Method POST -Headers $headers -Body $body -UseBasicParsing

    $allowOrigin = $response.Headers["Access-Control-Allow-Origin"]
    $data = $response.Content | ConvertFrom-Json

    Write-Host "✓ Authentication successful (with Origin)" -ForegroundColor Green
    Write-Host "  Token received: $($data.token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host "  Access-Control-Allow-Origin: $allowOrigin" -ForegroundColor Gray

    if ($allowOrigin -ne $PAGES_URL) {
        Write-Host "⚠ WARNING: CORS header mismatch!" -ForegroundColor Yellow
        Write-Host "  Expected: $PAGES_URL" -ForegroundColor Yellow
        Write-Host "  Got: $allowOrigin" -ForegroundColor Yellow
    }
} catch {
    $errorResponse = $_.Exception.Response
    $statusCode = $errorResponse.StatusCode.value__

    if ($statusCode -eq 403) {
        Write-Host "✗ Request blocked by CORS/CSRF protection" -ForegroundColor Red
        Write-Host "  The worker is rejecting requests from $PAGES_URL" -ForegroundColor Red
        Write-Host ""
        Write-Host "  FIX: Add $PAGES_URL to ALLOWED_ORIGINS" -ForegroundColor Yellow
        Write-Host "  1. Go to Cloudflare Dashboard" -ForegroundColor White
        Write-Host "  2. Workers & Pages → afia-worker → Settings → Variables" -ForegroundColor White
        Write-Host "  3. Add/Edit ALLOWED_ORIGINS variable:" -ForegroundColor White
        Write-Host "     https://afia-app.pages.dev,http://localhost:5173" -ForegroundColor Cyan
    } elseif ($statusCode -eq 401) {
        Write-Host "✗ Authentication failed: Invalid password" -ForegroundColor Red
    } elseif ($statusCode -eq 503) {
        Write-Host "✗ Authentication failed: ADMIN_PASSWORD not configured" -ForegroundColor Red
    } else {
        Write-Host "✗ Request failed (Status: $statusCode)" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Diagnostic Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If Test 3 passed but Test 4 failed:" -ForegroundColor White
Write-Host "  → CORS is blocking browser requests from $PAGES_URL" -ForegroundColor Yellow
Write-Host "  → Fix: Update ALLOWED_ORIGINS in Cloudflare Dashboard" -ForegroundColor Yellow
Write-Host ""
Write-Host "If Test 3 failed with 401 (Unauthorized):" -ForegroundColor White
Write-Host "  → ADMIN_PASSWORD is set but doesn't match '1234'" -ForegroundColor Yellow
Write-Host "  → Fix: Update the password in the script or reset in Cloudflare" -ForegroundColor Yellow
Write-Host ""
Write-Host "If Test 3 failed with 503 (Not Configured):" -ForegroundColor White
Write-Host "  → ADMIN_PASSWORD secret is not set in the worker" -ForegroundColor Yellow
Write-Host "  → Fix: Run: cd worker && echo '1234' | npx wrangler secret put ADMIN_PASSWORD" -ForegroundColor Yellow
Write-Host ""
