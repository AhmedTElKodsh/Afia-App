# Secrets Checklist for Afia App

Quick reference to ensure all secrets are properly configured.

## ✅ Verification Checklist

### DEFAULT Environment (stage-1-llm-only production)
- [ ] `ADMIN_PASSWORD` - Admin dashboard authentication
- [ ] `GEMINI_API_KEY` - Primary Gemini API key
- [ ] `GEMINI_API_KEY2` - Fallback Gemini key #1
- [ ] `GEMINI_API_KEY3` - Fallback Gemini key #2
- [ ] `GROQ_API_KEY` - Groq API fallback

### STAGE1 Environment
- [ ] `ADMIN_PASSWORD`
- [ ] `GEMINI_API_KEY`
- [ ] `GEMINI_API_KEY2`
- [ ] `GEMINI_API_KEY3`
- [ ] `GROQ_API_KEY`

### STAGE2 Environment
- [ ] `ADMIN_PASSWORD`
- [ ] `GEMINI_API_KEY`
- [ ] `GEMINI_API_KEY2`
- [ ] `GEMINI_API_KEY3`
- [ ] `GROQ_API_KEY`

### GitHub Repository Secrets
- [ ] `VITE_ADMIN_PASSWORD`
- [ ] `GEMINI_API_KEY`
- [ ] `GEMINI_API_KEY2`
- [ ] `GEMINI_API_KEY3`
- [ ] `GROQ_API_KEY`
- [ ] `CLOUDFLARE_API_TOKEN`
- [ ] `CLOUDFLARE_ACCOUNT_ID`
- [ ] `CLOUDFLARE_RATE_LIMIT_KV_ID`
- [ ] `CLOUDFLARE_RATE_LIMIT_KV_PREVIEW_ID`

## 🚀 Quick Commands

### Verify Current Secrets

```bash
cd worker

# Check DEFAULT environment
npx wrangler secret list

# Check STAGE1 environment
npx wrangler secret list --env stage1

# Check STAGE2 environment
npx wrangler secret list --env stage2
```

### Set All Secrets (DEFAULT)

```bash
cd worker

echo "YOUR_ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD
echo "YOUR_GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY
echo "YOUR_GEMINI_KEY2" | npx wrangler secret put GEMINI_API_KEY2
echo "YOUR_GEMINI_KEY3" | npx wrangler secret put GEMINI_API_KEY3
echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY
```

### Set All Secrets (STAGE1)

```bash
cd worker

echo "YOUR_ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD --env stage1
echo "YOUR_GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY --env stage1
echo "YOUR_GEMINI_KEY2" | npx wrangler secret put GEMINI_API_KEY2 --env stage1
echo "YOUR_GEMINI_KEY3" | npx wrangler secret put GEMINI_API_KEY3 --env stage1
echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY --env stage1
```

### Set All Secrets (STAGE2)

```bash
cd worker

echo "YOUR_ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD --env stage2
echo "YOUR_GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY --env stage2
echo "YOUR_GEMINI_KEY2" | npx wrangler secret put GEMINI_API_KEY2 --env stage2
echo "YOUR_GEMINI_KEY3" | npx wrangler secret put GEMINI_API_KEY3 --env stage2
echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY --env stage2
```

## 🔑 Get API Keys

- **Gemini:** https://aistudio.google.com/app/apikey
- **Groq:** https://console.groq.com/keys
- **OpenRouter:** https://openrouter.ai/keys (optional)
- **Mistral:** https://console.mistral.ai/api-keys/ (optional)

## 📋 Automated Setup

Run the verification script:

**Windows:**
```powershell
cd worker
.\scripts\verify-and-set-secrets.ps1
```

**Linux/Mac:**
```bash
cd worker
chmod +x scripts/verify-and-set-secrets.sh
./scripts/verify-and-set-secrets.sh
```

## 📚 Full Documentation

See [docs/SECRETS-MANAGEMENT.md](docs/SECRETS-MANAGEMENT.md) for complete guide.

## ⚠️ Important Notes

1. **DEFAULT environment is critical** - The `stage-1-llm-only` branch deploys to DEFAULT (not stage1)
2. **Set secrets for ALL environments** - DEFAULT, STAGE1, and STAGE2
3. **Never commit secrets** to Git
4. **Use encrypted secrets** not plaintext variables in Cloudflare Dashboard
5. **GitHub Actions does NOT set Cloudflare secrets** - You must set them manually

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Analysis Failed" | Set API keys in DEFAULT environment (no `--env` flag) |
| "Unauthorized" on Admin | Set `ADMIN_PASSWORD` in DEFAULT environment |
| Secrets not persisting | Set for both DEFAULT and specific environment |
| Rate limit errors | Add multiple Gemini keys (KEY2, KEY3) |

## ✅ Final Verification

After setting all secrets, test:

1. Admin dashboard login: https://afia-app.pages.dev/admin
2. Scan a bottle and verify analysis works
3. Check worker logs: `npx wrangler tail`
4. Verify no "Analysis Failed" errors
