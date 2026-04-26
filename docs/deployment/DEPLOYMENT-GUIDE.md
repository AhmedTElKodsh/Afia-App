# Afia Oil Tracker - Deployment Guide

## ✅ Pre-Deployment Checklist

- [x] All 38 stories implemented
- [x] 75 unit tests passing
- [x] Registry duplication fixed (shared module)
- [x] Groq model verified: `meta-llama/llama-4-scout-17b-16e-instruct`
- [x] API keys available
- [ ] Cloudflare account created
- [ ] GitHub repo pushed to main

---

## 🎉 DEPLOYMENT SUCCESS!

Your Worker is now live at: **https://Afia-worker.savola.workers.dev**

### ✅ Completed Steps

- [x] Worker dependencies installed
- [x] All 4 API key secrets configured (3 Gemini + 1 Groq)
- [x] Worker deployed to Cloudflare
- [x] Worker URL: `https://Afia-worker.savola.workers.dev`

### 📋 Next Steps

Now you need to:

1. **Create Cloudflare Pages Project** (if not already done)
2. **Set Pages Environment Variable**
3. **Set GitHub Secrets for CI/CD**
4. **Test the deployment**

---

## 🚀 Quick Start (Automated)

### Option 1: PowerShell (Windows)

```powershell
.\deploy-setup.ps1
```

### Option 2: Bash (Linux/Mac/Git Bash)

```bash
chmod +x deploy-setup.sh
./deploy-setup.sh
```

This script will:

1. Install Worker dependencies
2. Set all API key secrets
3. Deploy the Worker to Cloudflare

---

## 📋 Manual Deployment Steps

### Step 1: Install Worker Dependencies

```bash
cd worker
npm ci
```

### Step 2: Set Worker Secrets

Run these commands one by one:

```bash
# Gemini API Keys (3 keys for load distribution)
echo "YOUR_GEMINI_API_KEY_1" | npx wrangler secret put GEMINI_API_KEY
echo "YOUR_GEMINI_API_KEY_2" | npx wrangler secret put GEMINI_API_KEY2
echo "YOUR_GEMINI_API_KEY_3" | npx wrangler secret put GEMINI_API_KEY3

# Groq API Key (fallback provider)
echo "YOUR_GROQ_API_KEY" | npx wrangler secret put GROQ_API_KEY
```

### Step 3: Deploy Worker

```bash
npx wrangler deploy
```

**Save the Worker URL** from the output (e.g., `https://Afia-worker.YOUR_SUBDOMAIN.workers.dev`)

### Step 4: Create Cloudflare Pages Project

1. Go to https://dash.cloudflare.com
2. Click **Workers & Pages** → **Create application** → **Pages**
3. Click **Connect to Git**
4. Select your GitHub repository
5. Configure build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. Click **Save and Deploy**

### Step 5: Set Pages Environment Variable

1. In your Pages project → **Settings** → **Environment variables**
2. Click **Add variable**
3. Add:
   - **Variable name**: `VITE_PROXY_URL`
   - **Value**: Your Worker URL from Step 3
4. Apply to both **Production** and **Preview**
5. Click **Save**
6. Go to **Deployments** → Click **⋯** on latest deployment → **Retry deployment**

### Step 6: Set GitHub Secrets (for CI/CD)

#### Get Cloudflare API Token:

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use template **Edit Cloudflare Workers** OR create custom with:
   - Account → Workers Scripts → Edit
   - Account → Account Settings → Read
4. Click **Continue to summary** → **Create Token**
5. **Copy the token** (shown only once!)

#### Get Cloudflare Account ID:

1. Go to https://dash.cloudflare.com
2. Select any site or go to Workers & Pages
3. Look at URL or right sidebar for **Account ID**
4. Copy the ID

#### Add to GitHub:

1. Go to your GitHub repo
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add two secrets:
   - Name: `CLOUDFLARE_API_TOKEN`, Value: (paste token)
   - Name: `CLOUDFLARE_ACCOUNT_ID`, Value: (paste ID)

### Step 7: Enable CI/CD

Push any change to trigger the pipeline:

```bash
git add .
git commit -m "Enable CI/CD deployment"
git push origin main
```

The GitHub Actions workflow will:

1. Run all 75 tests
2. Type-check Worker code
3. Build PWA
4. Deploy Worker
5. Deploy Pages

---

## 🧪 Testing Your Deployment

### Test Worker Directly

```bash
# Health check
curl https://YOUR-WORKER-URL.workers.dev/health

# Test analyze endpoint (replace with your Worker URL)
curl -X POST https://YOUR-WORKER-URL.workers.dev/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "filippo-berio-500ml",
    "imageBase64": "YOUR_BASE64_IMAGE_HERE"
  }'
```

### Test PWA

1. Visit your Pages URL: `https://Afia-oil-tracker.pages.dev`
2. Try with test SKU: `?sku=filippo-berio-500ml`
3. Grant camera permissions
4. Complete a full scan flow
5. Check browser console for errors

---

## 📊 Monitoring

### View Worker Logs

```bash
cd worker
npx wrangler tail
```

### View Pages Deployment Logs

1. Go to Cloudflare Dashboard → Pages
2. Select your project
3. Click **Deployments** → Select deployment → **View build log**

### Check Rate Limiting

The Worker has rate limiting (10 req/min per IP). Test with:

```bash
# Run this 11 times quickly to trigger rate limit
for i in {1..11}; do
  curl -X POST https://YOUR-WORKER-URL.workers.dev/analyze \
    -H "Content-Type: application/json" \
    -d '{"sku":"filippo-berio-500ml","imageBase64":"test"}'
  echo ""
done
```

You should see a 429 error on the 11th request.

---

## 🔧 Troubleshooting

### Worker deployment fails

**Error**: "Authentication error"

- Run `npx wrangler login` to authenticate

**Error**: "KV namespace not found"

- The KV namespace IDs in `wrangler.toml` are already configured
- If you created new namespaces, update the IDs in `wrangler.toml`

### Pages build fails

**Error**: "VITE_PROXY_URL not set"

- Make sure you set the environment variable in Pages settings
- Redeploy after setting the variable

**Error**: "Build command failed"

- Check that `package.json` has `"build": "vite build"`
- Verify all dependencies are in `package.json`

### Camera not working

**iOS Safari**:

- PWA must be served over HTTPS (Cloudflare Pages provides this)
- Camera permissions must be granted
- In-app browsers (Instagram, Facebook) may block camera

**Desktop**:

- Grant camera permissions when prompted
- Check browser console for errors

### API calls failing

**CORS errors**:

- Check that your Pages URL is in `ALLOWED_ORIGINS` in `wrangler.toml`
- Update and redeploy Worker if needed

**Rate limit errors**:

- Wait 1 minute between bursts of requests
- Rate limit is 10 requests per minute per IP

---

## 📝 Post-Deployment Tasks

### 1. Test on Real iOS Device (Optional)

Since you don't have an iOS device, you can use:

**BrowserStack** (100 min/month free):

1. Sign up at browserstack.com
2. Go to **Live** → Select iOS device
3. Enter your Pages URL
4. Test camera and full scan flow

**Alternative**: Ask a friend with iPhone to test

### 2. Monitor First Week

- Check Worker logs for errors
- Monitor rate limiting effectiveness
- Collect user feedback
- Track AI provider usage (Gemini vs Groq fallback)

### 3. Future Enhancements (Post-POC)

- [ ] Enable R2 bucket (requires credit card)
- [ ] Add analytics (Cloudflare Analytics)
- [ ] Set up custom domain
- [ ] Add more bottle SKUs
- [ ] Implement training data review dashboard

---

## 🎯 Success Criteria

Your deployment is successful when:

- ✅ Worker health check returns `{"status":"ok"}`
- ✅ Pages loads without errors
- ✅ Camera permissions work
- ✅ Full scan flow completes
- ✅ Results are displayed correctly
- ✅ Feedback submission works
- ✅ Rate limiting triggers at 11th request
- ✅ CI/CD pipeline runs on push to main

---

## 📞 Support

If you encounter issues:

1. Check Worker logs: `npx wrangler tail`
2. Check browser console for client errors
3. Verify all secrets are set: `npx wrangler secret list`
4. Check GitHub Actions logs for CI/CD issues

---

## 🎉 You're Done!

Your Afia Oil Tracker POC is now live and ready for testing!

**Next**: Complete comprehensive QA testing of all 38 stories.
