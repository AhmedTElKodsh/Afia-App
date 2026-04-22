@echo off
setlocal enabledelayedexpansion

REM ============================================================================
REM Afia Oil Tracker - Local Development Startup Script (Windows)
REM ============================================================================

echo.
echo 🚀 Starting Afia Oil Tracker local development...
echo.

REM ============================================================================
REM STEP 1: Configuration Files Setup
REM ============================================================================

REM Check for worker/.dev.vars
if not exist "worker\.dev.vars" (
    echo ⚠️  Missing worker\.dev.vars - copying from example...
    copy "worker\.dev.vars.example" "worker\.dev.vars" >nul
    echo ✅ Created worker\.dev.vars
    echo    💡 Tip: Mock mode enabled by default (no API keys required)
    echo.
)

REM Check for .env.local
if not exist ".env.local" (
    echo ⚠️  Missing .env.local - copying from example...
    copy ".env.example" ".env.local" >nul
    echo ✅ Created .env.local
    echo.
)

REM Verify mock mode is enabled
findstr /C:"ENABLE_MOCK_LLM=\"true\"" "worker\.dev.vars" >nul
if %errorlevel% equ 0 (
    echo ✅ Mock mode enabled - no API keys required
) else (
    echo ⚠️  Mock mode disabled - real API keys will be required
    echo    To enable mock mode, set ENABLE_MOCK_LLM="true" in worker\.dev.vars
)
echo.

REM ============================================================================
REM STEP 2: Dependencies Installation
REM ============================================================================

REM Check if frontend dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing frontend dependencies...
    call npm install
    echo ✅ Frontend dependencies installed
    echo.
) else (
    echo ✅ Frontend dependencies already installed
)

REM Check if worker dependencies are installed
if not exist "worker\node_modules" (
    echo 📦 Installing worker dependencies...
    cd worker
    call npm install
    cd ..
    echo ✅ Worker dependencies installed
    echo.
) else (
    echo ✅ Worker dependencies already installed
)

echo.
echo ✅ Setup complete!
echo.

REM ============================================================================
REM STEP 3: Start Services
REM ============================================================================

echo Starting services...
echo   - Worker: http://localhost:8787
echo   - Frontend: http://localhost:5173
echo   - Admin: http://localhost:5173/admin (password: 1234)
echo.
echo Press Ctrl+C to stop all services
echo.

REM Start Worker in background
echo 🔧 Starting Cloudflare Worker...
cd worker
start /B cmd /c "wrangler dev > ..\worker.log 2>&1"
cd ..
echo    Logs: worker.log

REM Wait for Worker to start with timeout
echo ⏳ Waiting for Worker to start...
set WORKER_READY=0
for /L %%i in (1,1,30) do (
    curl -s http://localhost:8787/health >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Worker ready at http://localhost:8787
        set WORKER_READY=1
        goto :worker_started
    )
    timeout /t 1 /nobreak >nul
)

:worker_started
if !WORKER_READY! equ 0 (
    echo ⚠️  Worker did not respond within 30 seconds
    echo    Check worker.log for errors
    echo.
)

REM Start Frontend in background
echo 🎨 Starting Frontend...
start /B cmd /c "npm run dev > frontend.log 2>&1"
echo    Logs: frontend.log

REM Wait for Frontend to start with timeout
echo ⏳ Waiting for Frontend to start...
set FRONTEND_READY=0
for /L %%i in (1,1,30) do (
    curl -s http://localhost:5173 >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Frontend ready at http://localhost:5173
        set FRONTEND_READY=1
        goto :frontend_started
    )
    timeout /t 1 /nobreak >nul
)

:frontend_started
if !FRONTEND_READY! equ 0 (
    echo ⚠️  Frontend did not respond within 30 seconds
    echo    Check frontend.log for errors
    echo.
)

echo.
echo 🎉 All services running!
echo.
echo 📝 Logs:
echo   - Worker: type worker.log
echo   - Frontend: type frontend.log
echo.
echo 🔗 Quick Links:
echo   - App: http://localhost:5173
echo   - Admin: http://localhost:5173/admin
echo   - Worker Health: http://localhost:8787/health
echo.
echo 💡 Tips:
echo   - Mock mode is enabled by default (no API keys needed)
echo   - Admin password: 1234
echo   - Press Ctrl+C to stop (you may need to manually kill processes)
echo.
echo 📊 Monitoring logs... (Press Ctrl+C to stop)
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Keep the window open and show instructions
echo To view logs in real-time, open new terminals and run:
echo   - Worker logs: powershell -command "Get-Content worker.log -Wait"
echo   - Frontend logs: powershell -command "Get-Content frontend.log -Wait"
echo.
echo Services are running in the background.
echo Close this window or press Ctrl+C to stop monitoring.
echo.

REM Wait indefinitely (user can Ctrl+C to exit)
pause >nul
