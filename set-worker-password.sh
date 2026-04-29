#!/bin/bash
# Set ADMIN_PASSWORD for afia-worker to match afia-app

echo "========================================="
echo "Set Worker Admin Password"
echo "========================================="
echo ""
echo "This will set the ADMIN_PASSWORD for afia-worker"
echo "to match the password in afia-app (1234)"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

cd worker
echo "1234" | npx wrangler secret put ADMIN_PASSWORD

echo ""
echo "✓ Password updated successfully!"
echo ""
echo "Now test the admin login:"
echo "1. Go to: https://afia-app.pages.dev/?admin=true"
echo "2. Enter password: 1234"
echo "3. You should be able to log in"
echo ""
