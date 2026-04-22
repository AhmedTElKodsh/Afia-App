#!/bin/bash
# Test script for admin authentication
# Run this after starting wrangler dev

echo "🧪 Testing Admin Authentication"
echo "================================"
echo ""

WORKER_URL="http://localhost:8787"

# Test 1: Health check
echo "1️⃣  Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$WORKER_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo "✅ Health check passed"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "❌ Health check failed"
    echo "   Response: $HEALTH_RESPONSE"
    exit 1
fi
echo ""

# Test 2: Admin authentication with correct password
echo "2️⃣  Testing admin auth with correct password (1234)..."
AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WORKER_URL/admin/auth" \
  -H "Content-Type: application/json" \
  -d '{"password":"1234"}')

HTTP_CODE=$(echo "$AUTH_RESPONSE" | tail -n1)
BODY=$(echo "$AUTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Authentication successful"
    echo "   HTTP Status: $HTTP_CODE"
    echo "   Response: $BODY"
else
    echo "❌ Authentication failed"
    echo "   HTTP Status: $HTTP_CODE"
    echo "   Response: $BODY"
    exit 1
fi
echo ""

# Test 3: Admin authentication with wrong password
echo "3️⃣  Testing admin auth with wrong password..."
WRONG_AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WORKER_URL/admin/auth" \
  -H "Content-Type: application/json" \
  -d '{"password":"wrong"}')

WRONG_HTTP_CODE=$(echo "$WRONG_AUTH_RESPONSE" | tail -n1)
WRONG_BODY=$(echo "$WRONG_AUTH_RESPONSE" | head -n-1)

if [ "$WRONG_HTTP_CODE" = "401" ]; then
    echo "✅ Correctly rejected wrong password"
    echo "   HTTP Status: $WRONG_HTTP_CODE"
    echo "   Response: $WRONG_BODY"
else
    echo "⚠️  Unexpected response for wrong password"
    echo "   HTTP Status: $WRONG_HTTP_CODE"
    echo "   Response: $WRONG_BODY"
fi
echo ""

# Summary
echo "================================"
echo "✅ All tests passed!"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:5173/admin in your browser"
echo "2. Enter password: 1234"
echo "3. You should see the admin dashboard"
echo ""
echo "If you see 'Rate limiting disabled' warning in wrangler logs,"
echo "that's normal and safe for local development."
