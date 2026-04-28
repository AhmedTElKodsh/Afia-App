#!/bin/bash
# Set ADMIN_PASSWORD secret for afia-worker

echo "Setting ADMIN_PASSWORD for afia-worker (stage1)..."
cd worker
npx wrangler secret put ADMIN_PASSWORD --env stage1

echo ""
echo "✅ Done! The secret is now set for afia-worker."
echo ""
echo "Test it:"
echo "curl -X POST https://afia-worker.savola.workers.dev/admin/auth \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"password\":\"YOUR_PASSWORD\"}'"
