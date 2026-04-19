@echo off
REM Verify upload results

echo ============================================================
echo Verifying Upload Results
echo ============================================================
echo.

REM Change to scripts directory
cd /d "%~dp0"

node verify-upload.js

echo.
pause
