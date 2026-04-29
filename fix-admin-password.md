# Fix Admin Password Mismatch

## Problem
The `ADMIN_PASSWORD` in **afia-worker** doesn't match the password in **afia-app** (1234).

## Solution

### Option 1: Set Worker Password to "1234" (Match Pages)

1. **Via Cloudflare Dashboard:**
   - Go to: https://dash.cloudflare.com/
   - Navigate to: **Workers & Pages** → **afia-worker** → **Settings** → **Variables and Secrets**
   - Find the `ADMIN_PASSWORD` secret
   - Click **Edit** → Enter `1234` → **Save**

2. **Via Wrangler CLI:**
   ```bash
   cd worker
   echo "1234" | npx wrangler secret put ADMIN_PASSWORD
   ```

### Option 2: Update Pages Password to Match Worker

If you want to use a different password (more secure):

1. **Find the current worker password:**
   - Check your password manager or where you stored it
   - Or reset it using Option 1 above

2. **Update afia-app (Pages) password:**
   - Go to: https://dash.cloudflare.com/
   - Navigate to: **Workers & Pages** → **afia-app** → **Settings** → **Environment Variables**
   - Find `ADMIN_PASSWORD` under **Production** environment
   - Click **Edit** → Enter the same password as worker → **Save**
   - **Redeploy** the Pages app for changes to take effect

## Verification

After updating, test the admin login:

1. Go to: https://afia-app.pages.dev/?admin=true
2. Enter the password (should be the same in both worker and pages)
3. You should be able to log in successfully

## Security Note

The password "1234" is weak and only suitable for testing. For production:

1. Generate a strong password:
   ```bash
   # Generate a random 32-character password
   openssl rand -base64 32
   ```

2. Update both worker and pages with the strong password
3. Store it securely in your password manager

## Current Configuration

Based on your screenshots:

- **afia-app** (Pages): `ADMIN_PASSWORD` = `1234` (Plaintext variable)
- **afia-worker** (Worker): `ADMIN_PASSWORD` = `????` (Secret - different from 1234)

**Action Required:** Make both passwords match!
