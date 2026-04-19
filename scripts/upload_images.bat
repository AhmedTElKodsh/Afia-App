@echo off
REM Batch script to upload training images to Supabase
REM Windows-friendly wrapper

echo ============================================================
echo Afia App - Training Images Upload
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo WARNING: .env file not found
    echo.
    echo Please create a .env file with:
    echo   SUPABASE_URL=https://your-project.supabase.co
    echo   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
    echo.
    pause
    exit /b 1
)

REM Install dependencies if needed
echo [1/4] Checking dependencies...
pip show supabase >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r scripts/requirements-upload.txt
)
echo.

REM Setup storage bucket
echo [2/4] Setting up Supabase Storage...
python scripts/setup_supabase_storage.py
if errorlevel 1 (
    echo ERROR: Failed to setup storage
    pause
    exit /b 1
)
echo.

REM Upload images
echo [3/4] Uploading images...
python scripts/organize_and_upload_images.py
if errorlevel 1 (
    echo ERROR: Upload failed
    pause
    exit /b 1
)
echo.

REM Verify upload
echo [4/4] Verifying upload...
python scripts/verify_upload.py
echo.

echo ============================================================
echo Upload Complete!
echo ============================================================
echo.
echo Check upload_manifest.json for details
echo.
pause
