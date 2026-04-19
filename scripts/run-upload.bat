@echo off
REM Quick upload script for Windows

echo ============================================================
echo Afia App - Image Upload to Supabase
echo ============================================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found: 
node --version
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

REM Change to scripts directory
cd /d "%~dp0"

REM Run upload
echo Starting upload...
echo.
node upload-images.js

if errorlevel 1 (
    echo.
    echo ERROR: Upload failed
    pause
    exit /b 1
)

echo.
echo ============================================================
echo Upload Complete!
echo ============================================================
echo.
echo Run verify-upload.bat to check results
echo.
pause
