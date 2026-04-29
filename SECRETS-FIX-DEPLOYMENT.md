# Fix: Secrets Require Deployment First

## ⚠️ Issue

When trying to set secrets, you get this error:
```
Secret edit failed. You attempted to modify a secret, but the latest version of your Worker isn't currently deployed.
```

## ✅ Solution: Two Options

### Option 1: Deploy Worker First, Then Set Secrets (Recommended)

This is the safest approach - deploy the worker, then add secrets.

```powershell
# Navigate to worker directory
cd D:\AI Projects\Freelance\Afia-App\worker

# Deploy to DEFAULT environment (stage-1-llm-only production)
npx wrangler deploy

# Now set secrets for DEFAULT environment
echo "YOUR_ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD --env=""
echo "YOUR_GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY --env=""
echo "YOUR_GEMINI_KEY2" | npx wrangler secret put GEMINI_API_KEY2 --env=""
echo "YOUR_GEMINI_KEY3" | npx wrangler secret put GEMINI_API_KEY3 --env=""
echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY --env=""

# Deploy to STAGE1 environment
npx wrangler deploy --env stage1

# Set secrets for STAGE1
echo "YOUR_ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD --env stage1
echo "YOUR_GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY --env stage1
echo "YOUR_GEMINI_KEY2" | npx wrangler secret put GEMINI_API_KEY2 --env stage1
echo "YOUR_GEMINI_KEY3" | npx wrangler secret put GEMINI_API_KEY3 --env stage1
echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY --env stage1

# Deploy to STAGE2 environment
npx wrangler deploy --env stage2

# Set secrets for STAGE2
echo "YOUR_ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD --env stage2
echo "YOUR_GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY --env stage2
echo "YOUR_GEMINI_KEY2" | npx wrangler secret put GEMINI_API_KEY2 --env stage2
echo "YOUR_GEMINI_KEY3" | npx wrangler secret put GEMINI_API_KEY3 --env stage2
echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY --env stage2
```

### Option 2: Use Versions Secret Put (Advanced)

This allows setting secrets without deploying:

```powershell
# For DEFAULT environment
echo "YOUR_ADMIN_PASSWORD" | npx wrangler versions secret put ADMIN_PASSWORD
echo "YOUR_GEMINI_KEY" | npx wrangler versions secret put GEMINI_API_KEY
echo "YOUR_GEMINI_KEY2" | npx wrangler versions secret put GEMINI_API_KEY2
echo "YOUR_GEMINI_KEY3" | npx wrangler versions secret put GEMINI_API_KEY3
echo "YOUR_GROQ_KEY" | npx wrangler versions secret put GROQ_API_KEY

# For STAGE1 environment
echo "YOUR_ADMIN_PASSWORD" | npx wrangler versions secret put ADMIN_PASSWORD --env stage1
echo "YOUR_GEMINI_KEY" | npx wrangler versions secret put GEMINI_API_KEY --env stage1
echo "YOUR_GEMINI_KEY2" | npx wrangler versions secret put GEMINI_API_KEY2 --env stage1
echo "YOUR_GEMINI_KEY3" | npx wrangler versions secret put GEMINI_API_KEY3 --env stage1
echo "YOUR_GROQ_KEY" | npx wrangler versions secret put GROQ_API_KEY --env stage1

# For STAGE2 environment
echo "YOUR_ADMIN_PASSWORD" | npx wrangler versions secret put ADMIN_PASSWORD --env stage2
echo "YOUR_GEMINI_KEY" | npx wrangler versions secret put GEMINI_API_KEY --env stage2
echo "YOUR_GEMINI_KEY2" | npx wrangler versions secret put GEMINI_API_KEY2 --env stage2
echo "YOUR_GEMINI_KEY3" | npx wrangler versions secret put GEMINI_API_KEY3 --env stage2
echo "YOUR_GROQ_KEY" | npx wrangler versions secret put GROQ_API_KEY --env stage2
```

### Option 3: Use Cloudflare Dashboard (Easiest)

1. Go to **Cloudflare Dashboard**: https://dash.cloudflare.com/
2. Navigate to **Workers & Pages**
3. Select **afia-worker**
4. Go to **Settings → Variables and Secrets**
5. Click **Add variable** → Select **Secret**
6. Add each secret:
   - `ADMIN_PASSWORD`
   - `GEMINI_API_KEY`
   - `GEMINI_API_KEY2`
   - `GEMINI_API_KEY3`
   - `GROQ_API_KEY`
7. Click **Deploy** to apply changes

**Note:** Dashboard secrets apply to the DEFAULT environment. For stage1/stage2, use CLI.

## 🔍 Verify Secrets After Setting

```powershell
# Check DEFAULT environment
npx wrangler secret list

# Check STAGE1 environment
npx wrangler secret list --env stage1

# Check STAGE2 environment
npx wrangler secret list --env stage2
```

## 🔑 Get Your Free API Keys

- **Gemini:** https://aistudio.google.com/app/apikey (15 req/min, 1,500 req/day per key)
- **Groq:** https://console.groq.com/keys (30 req/min, 14,400 req/day)

## ⚠️ Important Notes

1. **Use `--env=""` for DEFAULT environment** - This explicitly targets the top-level environment
2. **Deploy before setting secrets** - Or use `wrangler versions secret put`
3. **GitHub Actions will deploy automatically** - When you push to stage-1-llm-only branch
4. **Secrets persist across deployments** - Once set, they remain until you change them

## 🎯 Recommended Workflow

1. **Let GitHub Actions deploy first** (it's already configured)
2. **Then set secrets using Option 1** (deploy + set secrets)
3. **Or use Cloudflare Dashboard** (easiest for DEFAULT environment)

## 📚 Related Documentation

- [SECRETS-MANAGEMENT.md](docs/SECRETS-MANAGEMENT.md) - Complete guide
- [QUICK-SECRETS-SETUP.md](QUICK-SECRETS-SETUP.md) - Quick reference
- [GitHub Actions Workflow](.github/workflows/ci-cd.yml) - Auto-deployment
