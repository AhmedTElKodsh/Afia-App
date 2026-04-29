#!/bin/bash

# Admin Authentication Production Test Script
# Tests the admin authentication flow against production worker

WORKER_URL="https://afia-worker.savola.workers.dev"
PAGES_URL="https://afia-app.pages.dev"

echo "================================"
echo "Admin Auth Production Test"
echo "================================"
echo ""

# Test 1: Check if worker is reachable
echo "Test 1: Checking if worker is reachable..."
WORKER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/model/version")
if [ "$WORKER_STATUS" = "200" ]; then
    echo "✓ Worker is reachable (HTTP $WORKER_STATUS)"
    VERSION=$(curl -s "$WORKER_URL/model/version")
    echo "  Response: $VERSION"
else
    echo "✗ Worker is NOT reachable (HTTP $WORKER_STATUS)"
    echo "  This is likely the problem!"
fi
echo ""

# Test 2: Check CORS preflight
echo "Test 2: Testing CORS preflight from Pages origin..."
CORS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X OPTIONS "$WORKER_URL/admin/auth" \
    -H "Origin: $PAGES_URL" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type")

if [ "$CORS_STATUS" = "204" ] || [ "$CORS_STATUS" = "200" ]; then
    echo "✓ CORS preflight successful (HTTP $CORS_STATUS)"
else
    echo "✗ CORS preflight failed (HTTP $CORS_STATUS)"
    echo "  Worker may not allow requests from $PAGES_URL"
fi
echo ""

# Test 3: Test auth endpoint with wrong password
echo "Test 3: Testing auth endpoint with wrong password..."
AUTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST "$WORKER_URL/admin/auth" \
    -H "Content-Type: application/json" \
    -H "Origin: $PAGES_URL" \
    -d '{"password":"wrong_password_test"}')

HTTP_CODE=$(echo "$AUTH_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$AUTH_RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "401" ]; then
    echo "✓ Auth endpoint working correctly (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
else
    echo "✗ Unexpected response (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
fi
echo ""

# Test 4: Test auth endpoint with missing password
echo "Test 4: Testing auth endpoint with missing password..."
MISSING_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST "$WORKER_URL/admin/auth" \
    -H "Content-Type: application/json" \
    -H "Origin: $PAGES_URL" \
    -d '{}')

HTTP_CODE=$(echo "$MISSING_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$MISSING_RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "400" ]; then
    echo "✓ Validation working correctly (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
else
    echo "✗ Unexpected response (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
fi
echo ""

# Summary
echo "================================"
echo "Summary"
echo "================================"
echo ""
echo "If all tests passed:"
echo "  → The worker is configured correctly"
echo "  → The issue is likely with the frontend configuration"
echo "  → Check if VITE_PROXY_URL is set in Cloudflare Pages"
echo ""
echo "If Test 1 failed:"
echo "  → Worker is not deployed or URL is wrong"
echo "  → Deploy the worker: cd worker && npm run deploy"
echo ""
echo "If Test 2 failed:"
echo "  → CORS is not configured for $PAGES_URL"
echo "  → Check ALLOWED_ORIGINS in worker/wrangler.toml"
echo ""
echo "If Test 3 or 4 failed:"
echo "  → Auth endpoint has issues"
echo "  → Check worker logs in Cloudflare dashboard"
echo ""
echo "Next steps:"
echo "  1. If tests pass, check browser console at $PAGES_URL"
echo "  2. Verify VITE_PROXY_URL in Cloudflare Pages settings"
echo "  3. Redeploy Pages after setting environment variable"
echo ""

# Made with Bob
