# Debug Admin Dashboard Error

## Issue
Admin login works, but dashboard shows "Something went wrong" error.

## Root Cause
The `/admin/scans` endpoint is failing when trying to query Supabase.

## Possible Causes

### 1. Supabase `scans` table doesn't exist
The worker expects a `scans` table in Supabase with this schema:
```sql
CREATE TABLE scans (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP,
  sku TEXT,
  llm_fallback_prediction JSONB,
  client_metadata JSONB,
  local_model_prediction JSONB,
  local_model_result FLOAT,
  local_model_confidence FLOAT,
  local_model_version TEXT,
  local_model_inference_ms INTEGER,
  llm_fallback_used BOOLEAN
);
```

### 2. Supabase credentials are wrong
Check if `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct.

### 3. RLS (Row Level Security) is blocking the query
The service role key should bypass RLS, but check if policies are configured correctly.

## Debug Steps

### Step 1: Check Browser Console
1. Open https://afia-app.pages.dev/
2. Press `F12` to open DevTools
3. Go to **Console** tab
4. Login to admin
5. Look for error messages - should show the actual error

### Step 2: Test the API directly
```bash
# Get your admin token first (login via UI, then check sessionStorage)
# Or use this curl command to get a token:
curl -X POST https://afia-worker.savola.workers.dev/admin/auth \
  -H 'Content-Type: application/json' \
  -d '{"password":"YOUR_PASSWORD"}'

# Then test the scans endpoint:
curl https://afia-worker.savola.workers.dev/admin/scans \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Expected responses:
- **Success:** `{"scans":[]}`
- **Supabase error:** `{"error":"Failed to fetch scans","code":"INTERNAL_ERROR"}`
- **Auth error:** `{"error":"Unauthorized","code":"UNAUTHORIZED"}`

### Step 3: Check Supabase
1. Go to: https://supabase.com/dashboard/project/anfgqdgcbvmyegbfvvfh
2. Click **Table Editor**
3. Check if `scans` table exists
4. If not, you need to create it (see schema above)

### Step 4: Check Worker Logs
1. Go to: https://dash.cloudflare.com/
2. Navigate to: **Workers & Pages** → **afia-worker**
3. Click **Logs** tab (Real-time Logs)
4. Try admin login again
5. Look for error messages in the logs

## Quick Fix

If the `scans` table doesn't exist, create it in Supabase:

```sql
-- Create scans table
CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sku TEXT NOT NULL,
  llm_fallback_prediction JSONB,
  client_metadata JSONB,
  local_model_prediction JSONB,
  local_model_result FLOAT,
  local_model_confidence FLOAT,
  local_model_version TEXT,
  local_model_inference_ms INTEGER,
  llm_fallback_used BOOLEAN DEFAULT false
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);

-- Enable RLS (but service role bypasses it)
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Allow service role to read/write
CREATE POLICY "Service role can do anything" ON scans
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

## Expected Behavior

Once fixed:
- Admin dashboard should load successfully
- Show empty state: "No scans yet"
- After scanning bottles, they'll appear in the dashboard
