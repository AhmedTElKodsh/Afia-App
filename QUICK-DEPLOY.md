# 🚀 Quick Deploy - Afia Oil Tracker

## One-Command Deploy (PowerShell)

```powershell
.\deploy-setup.ps1
```

## Manual Deploy (5 Commands)

```bash
cd worker
npm ci
echo "YOUR_GEMINI_API_KEY_1" | npx wrangler secret put GEMINI_API_KEY
echo "YOUR_GEMINI_API_KEY_2" | npx wrangler secret put GEMINI_API_KEY2
echo "YOUR_GEMINI_API_KEY_3" | npx wrangler secret put GEMINI_API_KEY3
echo "YOUR_GROQ_API_KEY" | npx wrangler secret put GROQ_API_KEY
npx wrangler deploy
```

## After Worker Deploy

1. **Copy Worker URL** from output
2. **Create Pages project**: https://dash.cloudflare.com → Workers & Pages → Create → Pages → Connect Git
3. **Set Pages env var**: `VITE_PROXY_URL` = Worker URL
4. **Get Cloudflare tokens**: https://dash.cloudflare.com/profile/api-tokens
5. **Add GitHub secrets**: Settings → Secrets → Actions
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
6. **Push to main**: `git push origin main`

## Test

```bash
# Health check
curl https://YOUR-WORKER-URL.workers.dev/health

# Visit PWA
https://Afia-oil-tracker.pages.dev?sku=filippo-berio-500ml
```

## API Keys Summary

- ✅ Gemini: 3 keys configured (load distribution)
- ✅ Groq: 1 key configured (fallback)
- ✅ Model verified: `meta-llama/llama-4-scout-17b-16e-instruct`
- ⚠️ R2: Disabled (no credit card required)

## Status

- [x] Code complete (38 stories)
- [x] Tests passing (75/75)
- [x] Registry fixed (shared module)
- [ ] Worker deployed
- [ ] Pages deployed
- [ ] CI/CD enabled
- [ ] QA testing

See `DEPLOYMENT-GUIDE.md` for detailed instructions.
