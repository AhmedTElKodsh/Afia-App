#!/bin/bash

# Script to run camera outline matching tests with proper setup

echo "=== Afia Camera E2E Tests ==="
echo ""

# Kill any hanging Playwright processes
echo "Cleaning up any hanging processes..."
pkill -f "playwright" 2>/dev/null || true
pkill -f "chromium" 2>/dev/null || true

# Wait a moment
sleep 2

echo ""
echo "Running camera outline matching tests..."
echo ""

# Run tests with increased timeout
npx playwright test tests/e2e/camera-outline-matching.spec.ts --project=chromium --timeout=90000

echo ""
echo "=== Test run complete ==="
