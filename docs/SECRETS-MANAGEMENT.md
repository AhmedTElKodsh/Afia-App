# Secrets Management Guide

This guide ensures all required API keys and passwords are properly configured in Cloudflare Workers for both **afia-worker** and **afia-app**.

## Overview

The Afia app uses **three deployment environments**:

1. **DEFAULT environment** - Used by `stage-1-llm-only` branch (production)
2. **STAGE1 environment** - Explicit stage1 configuration
3. **STAGE2 environment** - Testing environment with local model

## Required Secrets

All environments require these secrets:

| Secret Name | Purpose | Required |
|------------|---------|----------|
| `ADMIN_PASSWORD` | Admin dashboard authentication | ✅ Yes |
| `GEMINI_API_KEY` | Primary Gemini API key | ✅ Yes |
| `GEMINI_API_KEY2` | Fallback Gemini key #1 | ⚠️ Recommended |
| `GEMINI_API_KEY3` | Fallback Gemini key #2 | ⚠️ Recommended |
| `GROQ_API_KEY` | Groq API fallback | ⚠️ Recommended |

## Quick Setup

### Option 1: Automated Script (Recommended)

**Windows (PowerShell):**
```powershell
cd worker
.\scripts\verify-and-set-secrets.ps1
```

**Linux/Mac (Bash):**
```bash
cd worker
chmod +x scripts/verify-and-set-secrets.sh
./scripts/verify-and-set-secrets.sh
```

### Option 2: Manual Setup

#### Step 1: Set Secrets for DEFAULT Environment

This is the **most important** step as the `stage-1-llm-only` branch deploys to the DEFAULT environment.

```bash
cd worker

# Required secrets
echo "YOUR_ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD
echo "YOUR_GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY

# Recommended fallback keys
echo "YOUR_GEMINI_KEY2" | npx wrangler secret put GEMINI_API_KEY2
echo "YOUR_GEMINI_KEY3" | npx wrangler secret put GEMINI_API_KEY3
echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY
```

#### Step 2: Set Secrets for STAGE1 Environment

```bash
cd worker

echo "YOUR_ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD --env stage1
echo "YOUR_GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY --env stage1
echo "YOUR_GEMINI_KEY2" | npx wrangler secret put GEMINI_API_KEY2 --env stage1
echo "YOUR_GEMINI_KEY3" | npx wrangler secret put GEMINI_API_KEY3 --env stage1
echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY --env stage1
```

#### Step 3: Set Secrets for STAGE2 Environment

```bash
cd worker

echo "YOUR_ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD --env stage2
echo "YOUR_GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY --env stage2
echo "YOUR_GEMINI_KEY2" | npx wrangler secret put GEMINI_API_KEY2 --env stage2
echo "YOUR_GEMINI_KEY3" | npx wrangler secret put GEMINI_API_KEY3 --env stage2
echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY --env stage2
```

## Verify Secrets

Check which secrets are currently set:

```bash
cd worker

# Check DEFAULT environment
npx wrangler secret list

# Check STAGE1 environment
npx wrangler secret list --env stage1

# Check STAGE2 environment
npx wrangler secret list --env stage2
```

## Get Free API Keys

### Gemini API (Google AI Studio)
- **URL:** https://aistudio.google.com/app/apikey
- **Free Tier:** 15 requests/min, 1,500 requests/day per key
- **Recommendation:** Get 3 keys for rotation (multiply limits)

### Groq API
- **URL:** https://console.groq.com/keys
- **Free Tier:** 30 requests/min, 14,400 requests/day
- **Use Case:** Fallback when Gemini keys are exhausted

### OpenRouter (Optional)
- **URL:** https://openrouter.ai/keys
- **Free Tier:** Limited free credits
- **Use Case:** Additional fallback option

### Mistral AI (Optional)
- **URL:** https://console.mistral.ai/api-keys/
- **Free Tier:** Limited
- **Use Case:** Additional fallback option

## GitHub Actions Integration

The CI/CD pipeline automatically uses secrets from GitHub repository settings during deployment.

### Required GitHub Secrets

Go to: **Repository Settings → Secrets and variables → Actions**

Add these secrets:

| Secret Name | Description |
|------------|-------------|
| `VITE_ADMIN_PASSWORD` | Admin password for frontend build |
| `GEMINI_API_KEY` | Primary Gemini API key |
| `GEMINI_API_KEY2` | Fallback Gemini key #1 |
| `GEMINI_API_KEY3` | Fallback Gemini key #2 |
| `GROQ_API_KEY` | Groq API key |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token for deployment |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

### How GitHub Actions Uses Secrets

During deployment, the workflow:

1. **Integration Tests:** Creates `.dev.vars` file with secrets for local testing
2. **Build:** Injects `VITE_ADMIN_PASSWORD` into the frontend build
3. **Deploy Worker:** Deploys to Cloudflare (uses secrets already set in Cloudflare)
4. **Deploy Pages:** Deploys frontend with embedded admin password

**Important:** GitHub Actions does NOT set Cloudflare Worker secrets. You must set them manually using the steps above.

## Cloudflare Dashboard Method

You can also set secrets via the Cloudflare Dashboard:

1. Go to **Cloudflare Dashboard**
2. Navigate to **Workers & Pages**
3. Select **afia-worker**
4. Go to **Settings → Variables and Secrets**
5. Click **Add variable** → Select **Secret**
6. Add each secret:
   - Name: `ADMIN_PASSWORD`, Value: your password
   - Name: `GEMINI_API_KEY`, Value: your key
   - etc.

**Note:** Secrets set in the dashboard apply to the DEFAULT environment. For stage1/stage2, use the CLI method.

## Environment Variables vs Secrets

### Environment Variables (Public)
Set in `wrangler.toml` - visible in code:
- `ALLOWED_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `STAGE`
- `ENABLE_LOCAL_MODEL`

### Secrets (Private)
Set via CLI or dashboard - encrypted:
- `ADMIN_PASSWORD`
- `GEMINI_API_KEY`
- `GEMINI_API_KEY2`
- `GEMINI_API_KEY3`
- `GROQ_API_KEY`

## Troubleshooting

### "Analysis Failed" Error
**Cause:** API keys not set in the correct environment.

**Solution:**
```bash
cd worker
# Set for DEFAULT environment (no --env flag)
echo "YOUR_GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY
```

### "Unauthorized" on Admin Dashboard
**Cause:** `ADMIN_PASSWORD` not set or mismatch.

**Solution:**
```bash
cd worker
echo "YOUR_ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD
```

### Secrets Not Persisting
**Cause:** Setting secrets with `--env` flag when DEFAULT is needed.

**Solution:** Always set secrets for BOTH DEFAULT and the specific environment:
```bash
# Set for DEFAULT (used by stage-1-llm-only)
echo "KEY" | npx wrangler secret put GEMINI_API_KEY

# Also set for stage1
echo "KEY" | npx wrangler secret put GEMINI_API_KEY --env stage1
```

## Security Best Practices

1. **Never commit secrets** to Git
2. **Use different passwords** for development and production
3. **Rotate API keys** regularly
4. **Use multiple Gemini keys** to avoid rate limits
5. **Monitor API usage** in provider dashboards
6. **Set secrets as encrypted** (not plaintext variables)

## Rate Limiting Strategy

The app uses a fallback chain to handle rate limits:

1. **GEMINI_API_KEY** (Primary)
2. **GEMINI_API_KEY2** (Fallback 1)
3. **GEMINI_API_KEY3** (Fallback 2)
4. **GROQ_API_KEY** (Final fallback)

With 3 Gemini keys:
- **45 requests/min** (15 × 3)
- **4,500 requests/day** (1,500 × 3)

## Verification Checklist

After setting secrets, verify:

- [ ] DEFAULT environment has all 5 secrets
- [ ] STAGE1 environment has all 5 secrets
- [ ] STAGE2 environment has all 5 secrets
- [ ] GitHub repository has all required secrets
- [ ] Admin dashboard login works
- [ ] Image analysis works (no "Analysis Failed" error)
- [ ] Secrets are encrypted (not plaintext variables)

## Support

If you encounter issues:

1. Run verification script: `./scripts/verify-and-set-secrets.sh`
2. Check secret list: `npx wrangler secret list`
3. Review worker logs: `npx wrangler tail`
4. Check Cloudflare Dashboard for plaintext variables (should be secrets)

## Related Documentation

- [API Keys Setup Guide](../QUICK-START-API-KEYS.md)
- [GitHub Actions Workflow](../.github/workflows/ci-cd.yml)
- [Worker Configuration](../worker/wrangler.toml)
