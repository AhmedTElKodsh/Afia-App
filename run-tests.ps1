# Run E2E tests with better error reporting
Write-Host "Starting E2E test run..." -ForegroundColor Cyan

# Run tests and capture output
$output = npm run test:e2e -- --reporter=list 2>&1

# Display output
$output | ForEach-Object { Write-Host $_ }

# Check for failures
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nTests failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
} else {
    Write-Host "`nAll tests passed!" -ForegroundColor Green
    exit 0
}
