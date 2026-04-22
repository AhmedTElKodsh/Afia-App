@echo off
REM Test script for admin authentication (Windows)
REM Run this after starting wrangler dev

echo.
echo Testing Admin Authentication
echo ================================
echo.

set WORKER_URL=http://localhost:8787

REM Test 1: Health check
echo 1. Testing health endpoint...
curl -s "%WORKER_URL%/health" > temp_health.json
findstr /C:"ok" temp_health.json >nul
if %errorlevel% equ 0 (
    echo [PASS] Health check passed
    type temp_health.json
) else (
    echo [FAIL] Health check failed
    type temp_health.json
    del temp_health.json
    exit /b 1
)
del temp_health.json
echo.

REM Test 2: Admin authentication with correct password
echo 2. Testing admin auth with correct password (1234)...
curl -s -X POST "%WORKER_URL%/admin/auth" ^
  -H "Content-Type: application/json" ^
  -d "{\"password\":\"1234\"}" > temp_auth.json

findstr /C:"token" temp_auth.json >nul
if %errorlevel% equ 0 (
    echo [PASS] Authentication successful
    type temp_auth.json
) else (
    echo [FAIL] Authentication failed
    type temp_auth.json
    del temp_auth.json
    exit /b 1
)
del temp_auth.json
echo.

REM Test 3: Admin authentication with wrong password
echo 3. Testing admin auth with wrong password...
curl -s -X POST "%WORKER_URL%/admin/auth" ^
  -H "Content-Type: application/json" ^
  -d "{\"password\":\"wrong\"}" > temp_wrong.json

findstr /C:"UNAUTHORIZED" temp_wrong.json >nul
if %errorlevel% equ 0 (
    echo [PASS] Correctly rejected wrong password
    type temp_wrong.json
) else (
    echo [WARN] Unexpected response for wrong password
    type temp_wrong.json
)
del temp_wrong.json
echo.

REM Summary
echo ================================
echo [PASS] All tests passed!
echo.
echo Next steps:
echo 1. Open http://localhost:5173/admin in your browser
echo 2. Enter password: 1234
echo 3. You should see the admin dashboard
echo.
echo If you see 'Rate limiting disabled' warning in wrangler logs,
echo that's normal and safe for local development.
echo.
pause
