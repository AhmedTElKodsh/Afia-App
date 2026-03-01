# Deployment Guide — Safi Oil Tracker

**Version:** POC v1

---

## Prerequisites

- Node.js 18+ and npm
- Git
- Cloudflare account (free tier)
- GitHub account
- Gemini API key (free tier from Google AI Studio)
- Groq API key (free tier from Groq Console)

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd safi-oil-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create `.env` file in project root:

```env
# Cloudflare Worker API URL (local dev)
VITE_PROXY_URL=http://localhost:8787

# LLM API Keys (for Worker)
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

**⚠️ NEVER commit `.env` to git!** Add to `.gitignore`.

### 4. Run Development Server

**Terminal 1 - PWA Dev Server:**

```bash
npm run dev
```

App runs at `http://localhost:5173`

**Terminal 2 - Worker Dev Server:**

```bash
npm run worker:dev
```

Worker runs at `http://localhost:8787`

### 5. Test Locally

1. Open `http://localhost:5173?sku=filippo-berio-500ml`
2. Click "Start Scan"
3. Allow camera access
4. Capture photo of oil bottle
5. Verify result displays

---

## Cloudflare Setup

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Create R2 Bucket

```bash
wrangler r2 bucket create safi-oil-tracker-data
```

### 4. Create KV Namespace (for rate limiting)

```bash
wrangler kv:namespace create RATE_LIMIT
```

Note the namespace ID from output.

### 5. Update wrangler.toml

```toml
name = "safi-oil-tracker-worker"
main = "worker/index.ts"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "safi-oil-tracker-data"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "<your-kv-namespace-id>"

[vars]
ALLOWED_ORIGINS = "https://safi-oil-tracker.pages.dev,http://localhost:5173"
```

### 6. Set Worker Secrets

```bash
wrangler secret put GEMINI_API_KEY
# Paste your Gemini API key when prompted

wrangler secret put GROQ_API_KEY
# Paste your Groq API key when prompted
```

**⚠️ Secrets are encrypted and never visible after setting!**

---

## GitHub Actions CI/CD Setup

### 1. Get Cloudflare API Token

1. Go to Cloudflare Dashboard → My Profile → API Tokens
2. Create Token → "Edit Cloudflare Workers" template
3. Copy the token

### 2. Add GitHub Secrets

In your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Add these secrets:
   - `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
   - `GEMINI_API_KEY` - Your Gemini API key
   - `GROQ_API_KEY` - Your Groq API key

### 3. Create GitHub Actions Workflow

File: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build PWA
        run: npm run build
        env:
          VITE_PROXY_URL: https://safi-oil-tracker-worker.<your-subdomain>.workers.dev

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: safi-oil-tracker
          directory: dist

      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
```

---

## Production Deployment

### 1. Push to Main Branch

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

### 2. Monitor GitHub Actions

1. Go to GitHub repository → Actions tab
2. Watch the deployment workflow
3. Verify all steps pass

### 3. Verify Deployment

**PWA:**

- URL: `https://safi-oil-tracker.pages.dev`
- Test: `https://safi-oil-tracker.pages.dev?sku=filippo-berio-500ml`

**Worker:**

- URL: `https://safi-oil-tracker-worker.<your-subdomain>.workers.dev`
- Test: `curl https://safi-oil-tracker-worker.<your-subdomain>.workers.dev/health`

### 4. Custom Domain (Optional)

1. Cloudflare Dashboard → Pages → safi-oil-tracker → Custom domains
2. Add your domain (e.g., `safi.yourdomain.com`)
3. Update DNS records as instructed
4. Update `ALLOWED_ORIGINS` in wrangler.toml

---

## Monitoring & Debugging

### View Worker Logs

```bash
wrangler tail
```

### View R2 Bucket Contents

```bash
wrangler r2 object list safi-oil-tracker-data --prefix images/
wrangler r2 object list safi-oil-tracker-data --prefix metadata/
```

### Download Scan Metadata

```bash
wrangler r2 object get safi-oil-tracker-data/metadata/<scanId>.json
```

### Check Rate Limit KV

```bash
wrangler kv:key list --namespace-id=<your-kv-namespace-id>
```

### View Cloudflare Analytics

1. Cloudflare Dashboard → Workers & Pages
2. Select safi-oil-tracker-worker
3. View Metrics tab for request counts, latency, errors

---

## Troubleshooting

### Issue: Camera not working on iOS

**Solution:** Ensure `display: "browser"` in manifest and NO `apple-mobile-web-app-capable` meta tag.

### Issue: Worker returns 500 errors

**Check:**

1. Worker secrets are set: `wrangler secret list`
2. R2 bucket binding is correct in wrangler.toml
3. View logs: `wrangler tail`

### Issue: Rate limit too restrictive

**Solution:** Adjust rate limit in Worker code:

```typescript
const RATE_LIMIT = 20; // Increase from 10 to 20 req/min
```

### Issue: Gemini API quota exceeded

**Check:**

1. Gemini free tier: 1,500 requests/day
2. Verify Groq fallback is working
3. View Worker logs for fallback activation

### Issue: Images not storing in R2

**Check:**

1. R2 bucket binding: `wrangler r2 bucket list`
2. Worker has write permissions
3. Image size < 4MB

---

## Rollback Procedure

### Rollback PWA

```bash
# Cloudflare Pages keeps deployment history
# Go to Dashboard → Pages → safi-oil-tracker → Deployments
# Click "Rollback" on previous deployment
```

### Rollback Worker

```bash
# Deploy previous version from git
git checkout <previous-commit>
wrangler deploy
git checkout main
```

---

## Cost Monitoring

**Free Tier Limits:**

- Cloudflare Pages: Unlimited bandwidth, 500 builds/month
- Cloudflare Workers: 100,000 requests/day
- Cloudflare R2: 10GB storage, 1M write ops/month
- Gemini API: 1,500 requests/day
- Groq API: 14,400 requests/day

**Monitor Usage:**

1. Cloudflare Dashboard → Analytics
2. Google AI Studio → Usage
3. Groq Console → Usage

**⚠️ Set up billing alerts if approaching limits!**

---

## Security Checklist

- [ ] API keys stored as Worker secrets (never in code)
- [ ] `.env` file in `.gitignore`
- [ ] Origin validation enabled in Worker
- [ ] Rate limiting configured (10 req/min per IP)
- [ ] R2 bucket not publicly accessible
- [ ] HTTPS enforced for all traffic
- [ ] No PII collected or stored

---

## Post-Deployment Validation

### 1. Smoke Tests

```bash
# Test QR landing page
curl https://safi-oil-tracker.pages.dev?sku=filippo-berio-500ml

# Test Worker health endpoint
curl https://safi-oil-tracker-worker.<subdomain>.workers.dev/health

# Test analyze endpoint (requires valid image)
curl -X POST https://safi-oil-tracker-worker.<subdomain>.workers.dev/analyze \
  -H "Content-Type: application/json" \
  -d '{"sku":"filippo-berio-500ml","imageBase64":"..."}'
```

### 2. End-to-End Test

1. Scan QR code with phone
2. Complete full scan flow
3. Submit feedback
4. Verify data in R2:
   ```bash
   wrangler r2 object list safi-oil-tracker-data --prefix metadata/
   ```

### 3. Performance Test

- Measure photo-to-result latency on 4G network
- Target: p95 < 10 seconds (POC acceptance)
- Use browser DevTools Network tab

---

## Support & Resources

- **Cloudflare Docs:** https://developers.cloudflare.com/
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/
- **Gemini API:** https://ai.google.dev/
- **Groq API:** https://console.groq.com/docs
- **Vite PWA Plugin:** https://vite-pwa-org.netlify.app/
