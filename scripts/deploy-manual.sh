#!/bin/bash

# Manual Deployment Script for Afia Oil Tracker
# Only deploy when app is fully tested and ready

set -e  # Exit on any error

echo "🚀 Afia Oil Tracker - Manual Deployment"
echo "========================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from project root${NC}"
    exit 1
fi

# Confirmation prompt
echo -e "${YELLOW}⚠️  This will deploy to production Cloudflare endpoints${NC}"
echo "   Worker: https://afia-worker.savona.workers.dev"
echo "   Pages: https://afia-app.pages.dev"
echo ""
read -p "Are you sure you want to deploy? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "📋 Step 1/5: Running tests..."
echo "=============================="

# Run unit tests
npm test
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Unit tests failed. Aborting deployment.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Unit tests passed${NC}"
echo ""

# Run E2E tests (if worker is running)
echo "🧪 Checking if E2E tests should run..."
if curl -s http://localhost:8787/health > /dev/null 2>&1; then
    echo "Worker detected at localhost:8787, running E2E tests..."
    npm run test:e2e
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ E2E tests failed. Aborting deployment.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ E2E tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Worker not running locally, skipping E2E tests${NC}"
    echo "   (E2E tests will run in production after deployment)"
fi

echo ""
echo "🔧 Step 2/5: Deploying Worker..."
echo "================================="

cd worker

# Check if wrangler is configured
if [ ! -f "wrangler.toml" ]; then
    echo -e "${RED}❌ wrangler.toml not found${NC}"
    exit 1
fi

# Deploy worker
npx wrangler deploy --env stage1
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Worker deployment failed${NC}"
    exit 1
fi

cd ..

echo -e "${GREEN}✅ Worker deployed successfully${NC}"
echo ""

echo "📦 Step 3/5: Building PWA..."
echo "============================="

# Build the frontend
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build complete${NC}"
echo ""

echo "🌐 Step 4/5: Deploying Pages..."
echo "================================"

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=afia-app --branch=master
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Pages deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pages deployed successfully${NC}"
echo ""

echo "🧪 Step 5/5: Smoke Testing..."
echo "=============================="

# Test worker health endpoint
echo "Testing Worker health endpoint..."
WORKER_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://afia-worker.savona.workers.dev/health)
if [ "$WORKER_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Worker health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Worker health check returned: $WORKER_HEALTH${NC}"
fi

# Test pages
echo "Testing Pages deployment..."
PAGES_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://afia-app.pages.dev)
if [ "$PAGES_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Pages health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Pages health check returned: $PAGES_STATUS${NC}"
fi

echo ""
echo "======================================"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "======================================"
echo ""
echo "🔗 Production URLs:"
echo "   Worker: https://afia-worker.savona.workers.dev"
echo "   Pages:  https://afia-app.pages.dev"
echo ""
echo "📊 Next Steps:"
echo "   1. Test QR code with production URL"
echo "   2. Test camera functionality on mobile"
echo "   3. Monitor worker logs: cd worker && npx wrangler tail"
echo "   4. Check for errors in browser console"
echo ""
echo "📝 To rollback if needed:"
echo "   cd worker && npx wrangler rollback"
echo ""
