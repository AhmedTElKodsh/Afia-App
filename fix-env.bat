@echo off
echo Killing Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Killing VS Code processes...
taskkill /F /IM Code.exe 2>nul
timeout /t 2 /nobreak >nul

echo Deleting node_modules...
rmdir /s /q node_modules
if exist node_modules (
    echo ERROR: node_modules still exists. Close all programs and run this script again.
    pause
    exit /b 1
)

echo Installing dependencies...
call npm ci

echo Verifying installation...
call npm run validate

echo.
echo Done! Environment fixed.
pause
