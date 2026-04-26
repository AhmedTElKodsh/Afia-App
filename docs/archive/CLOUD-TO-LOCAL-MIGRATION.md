# Cloud to Local Development Migration Guide

## 🎯 Context

You were previously deploying directly to Cloudflare for testing, but switched to local development to avoid:
- ⚠️ Rate limiting from frequent deployments
- ⚠️ Getting blocked due to repetitive uploads in short periods
- ⚠️ Slower iteration cycles

This is the **correct approach** for active development! However, secrets configured in Cloudflare (via `wrangler secret put`) don't automatically transfer to local development.

## 🔐 Missing Secrets Checklist

When you ran `wrangler secret put` in production, these secrets were stored in Cloudflare's secure vault. For local development, you need to recreate them in `worker/.dev.vars`:

### Required Secrets

| Secret Name | Production Location | Local Location | Status |
|-------------|-------------------|----------------|--------|
| `ADMIN_PASSWORD` | Cloudflare Secrets | `worker/.dev.vars` | ✅ Fixed |
| `GEMINI_API_KEY` | Cloudflare Secrets | `worker/.dev.vars` | ⚠️ Needs your key |
| `GEMINI_API_KEY2` | Cloudflare Secrets | `worker/.dev.vars` | ⚠️ Optional |
| `GEMINI_API_KEY3` | Cloudflare Secrets | `worker/.dev.vars` | ⚠️ Optional |
| `GROQ_API_KEY` | Cloudflare Secrets | `worker/.dev.vars` | ⚠️ Needs your key |
| `SUPABASE_SERVICE_KEY` | Cloudflare Secrets | `worker/.dev.vars` | ⚠️ Needs your key |

### How to Retrieve Your Production Secrets

Unfortunately, Cloudflare doesn't allow you to **read** secrets once they're set (security feature). You have two options:

#### Option 1: Use Your Original Keys (Recommended)
If you still have the API keys you used when setting up production:
1. Open your password manager or notes where you stored them
2. Copy them to `worker/.dev.vars`

#### Option 2: List What's Configured (Verification Only)
```bash
cd worker
wrangler secret list --env stage1
```
This shows **which** secrets are set, but not their values.

#### Option 3: Generate New Keys for Local Dev
If you can't find the original keys, generate new ones for local development:

**Gemini API Key:**
1. Go to: https://aistudio.google.com/app/apikey
2. Create a new API key
3. Copy to `worker/.dev.vars`

**Groq API Key:**
1. Go to: https://console.groq.com/keys
2. Create a new API key
3. Copy to `worker/.dev.vars`

**Supabase Service Key:**
1. Go to: https://supabase.com/dashboard/project/anfgqdgcbvmyegbfvvfh/settings/api
2. Copy the `service_role` key (not the `anon` key!)
3. Copy to `worker/.dev.vars`

## 📝 Complete `.dev.vars` Template

Update your `worker/.dev.vars` file with actual values:

```env
# Supabase Configuration
SUPABASE_URL="https://anfgqdgcbvmyegbfvvfh.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ACTUAL_KEY_HERE"

# Gemini API Keys (3 keys for rotation/fallback)
GEMINI_API_KEY="AIzaSyYOUR_PRIMARY_KEY_HERE"
GEMINI_API_KEY2="AIzaSyYOUR_FALLBACK_KEY_1_HERE"
GEMINI_API_KEY3="AIzaSyYOUR_FALLBACK_KEY_2_HERE"

# Groq API Key (fallback if all Gemini keys fail)
GROQ_API_KEY="gsk_YOUR_GROQ_KEY_HERE"

# Admin password for local development
ADMIN_PASSWORD="1234"

# Optional: Backblaze B2 (if using object storage)
# B2_ACCOUNT_ID=""
# B2_APPLICATION_KEY=""
# B2_BUCKET_ID=""
# B2_DOWNLOAD_URL=""

# Optional: Upstash Redis (if using edge state)
# UPSTASH_REDIS_REST_URL=""
# UPSTASH_REDIS_REST_TOKEN=""
```

## 🔄 Migration Steps

### Step 1: Verify Current Setup
```bash
# Check what secrets are configured in production
cd worker
wrangler secret list --env stage1
```

### Step 2: Update Local Configuration
```bash
# Edit worker/.dev.vars with your actual API keys
# (Already created with ADMIN_PASSWORD, now add the others)
```

### Step 3: Test Local Worker
```bash
cd worker
wrangler dev
```

Expected output:
```
⛅️ wrangler 3.x.x
-------------------
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

### Step 4: Test API Endpoints

**Test Health:**
```bash
curl http://localhost:8787/health
```

**Test Admin Auth:**
```bash
curl -X POST http://localhost:8787/admin/auth \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 127.0.0.1" \
  -d '{"password":"1234"}'
```

**Test Analyze (requires valid Gemini key):**
```bash
curl -X POST http://localhost:8787/analyze \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 127.0.0.1" \
  -d '{
    "imageBase64": "data:image/jpeg;base64,/9j/4AAQ...",
    "sku": "test-sku"
  }'
```

### Step 5: Start Frontend
```bash
# In a new terminal
npm run dev
```

## 🚨 Common Issues After Migration

### Issue 1: "GEMINI_API_KEY is not defined"
**Cause:** Missing or invalid Gemini API key in `.dev.vars`

**Fix:**
1. Get a valid key from https://aistudio.google.com/app/apikey
2. Add to `worker/.dev.vars`: `GEMINI_API_KEY="AIzaSy..."`
3. Restart wrangler: `Ctrl+C` then `wrangler dev`

### Issue 2: "SUPABASE_SERVICE_KEY is not defined"
**Cause:** Missing Supabase service role key

**Fix:**
1. Get from: https://supabase.com/dashboard/project/anfgqdgcbvmyegbfvvfh/settings/api
2. Copy the **service_role** key (starts with `eyJhbGciOiJIUzI1NiI...`)
3. Add to `worker/.dev.vars`: `SUPABASE_SERVICE_KEY="eyJ..."`
4. Restart wrangler

### Issue 3: "Admin authentication not configured"
**Cause:** `ADMIN_PASSWORD` not set in `.dev.vars`

**Fix:** ✅ Already fixed! It's set to "1234"

### Issue 4: Rate limiting errors
**Cause:** Too many requests during testing

**Fix:** ✅ Already fixed! Local rate limiting is more lenient

## 📊 Development vs Production Comparison

| Aspect | Production (Cloudflare) | Local Development |
|--------|------------------------|-------------------|
| Secrets Storage | `wrangler secret put` | `worker/.dev.vars` |
| IP Detection | `CF-Connecting-IP` header | Fallback to `127.0.0.1` |
| Rate Limiting | Strict (30 req/min) | Lenient (same limits but local) |
| CORS | Strict origin checking | Includes `localhost:5173` |
| Deployment | `wrangler deploy` | `wrangler dev` |
| Logs | `wrangler tail` | Console output |
| KV Storage | Production namespace | Preview namespace |
| Admin Password | Strong (16+ chars) | "1234" (dev only!) |

## 🎯 When to Use Each Environment

### Use Local Development When:
- ✅ Actively coding and testing
- ✅ Making frequent changes
- ✅ Debugging issues
- ✅ Testing new features
- ✅ Avoiding rate limits

### Use Production Deployment When:
- ✅ Feature is complete and tested locally
- ✅ Ready for real-world testing
- ✅ Need to test with actual users
- ✅ Validating performance at scale
- ✅ Final QA before release

## 🔐 Security Reminders

### ⚠️ NEVER Commit These Files:
- `worker/.dev.vars` (contains secrets)
- `.env.local` (may contain sensitive data)
- Any file with API keys or passwords

### ✅ Safe to Commit:
- `worker/.dev.vars.example` (template without real values)
- `wrangler.toml` (configuration without secrets)
- `.env.example` (template files)

### 🔒 Production Security Checklist:
- [ ] Use strong admin password (16+ characters)
- [ ] Rotate API keys regularly
- [ ] Use separate keys for dev/staging/production
- [ ] Enable 2FA on all service accounts
- [ ] Monitor API usage for anomalies
- [ ] Set up alerts for failed auth attempts

## 📚 Related Documentation

- **Quick Start:** `QUICK-START-GUIDE.md`
- **Technical Details:** `BMAD-HELP-LOCAL-FIX.md`
- **Deployment Guide:** `_bmad-output/planning-artifacts/docs/deployment-guide.md`
- **Architecture:** `_bmad-output/planning-artifacts/architecture.md`

## 🎉 Next Steps

1. ✅ Update `worker/.dev.vars` with your actual API keys
2. ✅ Test the worker locally: `cd worker && wrangler dev`
3. ✅ Test the frontend: `npm run dev`
4. ✅ Verify admin access with password "1234"
5. ✅ Run `/bmad-help` to continue your workflow

Once you're ready to deploy back to production:
```bash
cd worker
wrangler deploy --env stage1
```

Remember: Local development is your friend during active development. Deploy to production only when features are stable and tested! 🚀
