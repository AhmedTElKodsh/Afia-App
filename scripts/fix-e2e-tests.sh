#!/bin/bash

# Script to fix and run E2E tests
# This script helps diagnose and fix common E2E test issues

echo "🔧 Fixing E2E Tests..."
echo ""

# Step 1: Check if dev servers are running
echo "📡 Checking dev servers..."
if curl -s http://127.0.0.1:5173 > /dev/null 2>&1; then
    echo "✅ Vite dev server is running on port 5173"
else
    echo "❌ Vite dev server is NOT running on port 5173"
    echo "   Starting Vite dev server..."
    npm run dev -- --host 127.0.0.1 --port 5173 &
    VITE_PID=$!
    sleep 5
fi

if curl -s http://127.0.0.1:8787/health > /dev/null 2>&1; then
    echo "✅ Worker dev server is running on port 8787"
else
    echo "❌ Worker dev server is NOT running on port 8787"
    echo "   Starting Worker dev server..."
    cd worker && npx wrangler dev --config "./wrangler.toml" --port 8787 --local &
    WORKER_PID=$!
    cd ..
    sleep 5
fi

echo ""
echo "🧪 Running E2E tests..."
echo ""

# Step 2: Run tests with increased timeouts
npm run test:e2e -- --timeout=90000

# Capture exit code
TEST_EXIT_CODE=$?

# Step 3: Cleanup
if [ ! -z "$VITE_PID" ]; then
    echo "🛑 Stopping Vite dev server..."
    kill $VITE_PID 2>/dev/null
fi

if [ ! -z "$WORKER_PID" ]; then
    echo "🛑 Stopping Worker dev server..."
    kill $WORKER_PID 2>/dev/null
fi

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed. Check the output above for details."
    echo ""
    echo "💡 Common fixes:"
    echo "   1. Increase timeouts in playwright.config.ts"
    echo "   2. Check if dev servers are running properly"
    echo "   3. Clear browser cache: npx playwright clean"
    echo "   4. Update Playwright: npm install -D @playwright/test@latest"
fi

exit $TEST_EXIT_CODE
