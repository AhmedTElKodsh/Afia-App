# 🚀 Afia Oil Tracker - Deployment Guide

**Complete guide to deploying Afia Oil Tracker to production**

---

## 📋 Prerequisites

Before deploying, ensure you have:

- [ ] Cloudflare account (free tier sufficient)
- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] API keys for:
  - Google Gemini (https://makersuite.google.com/app/apikey)
  - Groq (https://console.groq.com/keys)

---

## 🔧 Step 1: Environment Setup

### 1.1 Clone Repository

```bash
git clone <repository-url>
cd Afia-App
```

### 1.2 Install Dependencies

```bash
# Install app dependencies
npm install

# Install Worker dependencies
cd worker
npm install
cd ..
```

### 1.3 Create .env File

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Admin password for dashboard
VITE_ADMIN_PASSWORD=your_secure_password_here

# Worker API URL (update after deployment)
VITE_PROXY_URL=https://afia-worker.<your-subdomain>.workers.dev
```

---

## ☁️ Step 2: Deploy Cloudflare Worker

### 2.1 Login to Cloudflare

```bash
cd worker
npx wrangler login
```

This opens browser for OAuth. Grant permissions.

### 2.2 Create R2 Bucket (Optional)

For storing scan images:

```bash
npx wrangler r2 bucket create afia-oil-images
```

**Note:** R2 requires credit card on file. For POC, you can skip this.

### 2.3 Create KV Namespace

For rate limiting:

```bash
npx wrangler kv:namespace create RATE_LIMIT_KV
```

Copy the returned namespace ID.

### 2.4 Update wrangler.toml

Edit `worker/wrangler.toml`:

```toml
name = "afia-worker"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# R2 bucket (if created)
# [[r2_buckets]]
# binding = "TRAINING_BUCKET"
# bucket_name = "afia-oil-images"

# KV namespace (paste your ID)
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "your-namespace-id-here"
preview_id = "your-preview-id-here"

# Environment variables
[vars]
ALLOWED_ORIGINS = "https://afia-oil-tracker.pages.dev,http://localhost:5173"
```

### 2.5 Set API Secrets

```bash
npx wrangler secret put GEMINI_API_KEY
# Enter your Gemini API key when prompted

npx wrangler secret put GROQ_API_KEY
# Enter your Groq API key when prompted
```

### 2.6 Deploy Worker

```bash
npx wrangler deploy
```

**Expected Output:**
```
Deployed afia-worker triggers
  https://afia-worker.<subdomain>.workers.dev
```

**Copy this URL** - You'll need it for the PWA deployment.

### 2.7 Test Worker

```bash
curl https://afia-worker.<subdomain>.workers.dev/health
```

**Expected Response:**
```json
{"status":"ok"}
```

---

## 🌐 Step 3: Deploy PWA to Cloudflare Pages

### Option A: GitHub Integration (Recommended)

#### 3.1 Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

#### 3.2 Connect to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages**
3. Click **Create a project**
4. Select **Connect to Git**
5. Choose your repository: `afia-oil-tracker`
6. Configure build:
   - **Production branch:** `main`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
7. Click **Save and Deploy**

#### 3.3 Set Environment Variables

In Cloudflare Pages Dashboard:

1. Go to **Settings** → **Environment variables**
2. Add variables:
   - `VITE_ADMIN_PASSWORD` = your_secure_password
   - `VITE_PROXY_URL` = `https://afia-worker.<subdomain>.workers.dev`
3. Click **Save**
4. Trigger redeploy

### Option B: Manual Deploy

#### 3.1 Build Project

```bash
npm run build
```

#### 3.2 Install Wrangler (if not installed)

```bash
npm install -g wrangler
```

#### 3.3 Deploy to Pages

```bash
wrangler pages deploy dist --project-name=afia-oil-tracker
```

---

## 🔗 Step 4: Update Configuration

### 4.1 Update ALLOWED_ORIGINS

Edit `worker/wrangler.toml`:

```toml
[vars]
ALLOWED_ORIGINS = "https://afia-oil-tracker.pages.dev,https://your-custom-domain.com"
```

Redeploy Worker:

```bash
npx wrangler deploy
```

### 4.2 Update PWA Environment Variables

In Cloudflare Pages Dashboard:

1. Go to **Settings** → **Environment variables**
2. Update `VITE_PROXY_URL` with Worker URL
3. Trigger redeploy

---

## ✅ Step 5: Verification

### 5.1 Test PWA

1. Open your Pages URL: `https://afia-oil-tracker.pages.dev`
2. Verify app loads
3. Accept privacy notice
4. Select a bottle

### 5.2 Test Scan Flow

1. Tap "Start Scan"
2. Grant camera permission
3. Take photo
4. Wait for analysis
5. View results

### 5.3 Test Admin Dashboard

1. Tap ⚙️ Admin tab
2. Enter password
3. View metrics
4. Check bottle registry

### 5.4 Test History

1. Complete 2-3 scans
2. Go to History tab
3. Verify scans appear
4. Check trends chart

---

## 🔒 Step 6: Security Hardening

### 6.1 Change Default Password

Update `.env`:

```env
VITE_ADMIN_PASSWORD=<strong_unique_password>
```

### 6.2 Enable Rate Limiting

Already configured in Worker (10 req/min/IP).

### 6.3 Review CORS Settings

Ensure `ALLOWED_ORIGINS` only includes your domains:

```toml
[vars]
ALLOWED_ORIGINS = "https://afia-oil-tracker.pages.dev"
```

### 6.4 Rotate API Keys

Regularly rotate Gemini and Groq API keys:

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GROQ_API_KEY
```

---

## 📊 Step 7: Monitoring

### Cloudflare Analytics

1. **Worker Analytics:**
   - Dashboard → Workers → afia-worker
   - View requests, errors, latency

2. **Pages Analytics:**
   - Dashboard → Pages → afia-oil-tracker
   - View deployments, bandwidth

### Set Up Alerts

1. Go to **Workers** → **afia-worker**
2. Click **Triggers**
3. Set up alerts for:
   - Error rate > 5%
   - Latency p95 > 5s
   - Requests > 100,000/day

---

## 🎯 Step 8: Generate QR Codes

### For Each Bottle

Create QR codes linking to your app with SKU parameter:

**Format:**
```
https://afia-oil-tracker.pages.dev/?sku=filippo-berio-500ml
```

### QR Code Generation

**Option 1: Online Generator**
1. Go to https://qr-code-styling.com/
2. Enter URL
3. Download PNG (300x300px minimum)
4. Print and attach to bottles

**Option 2: Programmatic (Node.js)**

```bash
npm install qrcode
```

```javascript
const QRCode = require('qrcode');

const bottles = [
  { sku: 'filippo-berio-500ml', name: 'Filippo Berio' },
  { sku: 'bertolli-750ml', name: 'Bertolli' },
  { sku: 'afia-sunflower-1l', name: 'Afia' }
];

bottles.forEach(async (bottle) => {
  const url = `https://afia-oil-tracker.pages.dev/?sku=${bottle.sku}`;
  await QRCode.toFile(`qr-${bottle.sku}.png`, url);
});
```

---

## 📱 Step 9: Mobile Testing

### iOS Testing

1. **Safari (Required)**
   - Open app in Safari
   - Test camera activation
   - Verify PWA install prompt
   - Test offline mode

2. **Add to Home Screen**
   - Tap Share button
   - "Add to Home Screen"
   - Verify icon and name

### Android Testing

1. **Chrome**
   - Open app in Chrome
   - Test camera
   - Verify PWA install prompt

2. **Install PWA**
   - Tap menu (⋮)
   - "Install app"
   - Verify home screen icon

---

## 🐛 Troubleshooting

### Worker Deployment Fails

**Error:** "Invalid API key"

**Solution:**
```bash
npx wrangler login
```

### PWA Build Fails

**Error:** "Module not found"

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Camera Not Working

**Issue:** iOS WebKit camera bug

**Solution:**
- Ensure `display: "browser"` in PWA manifest
- Remove `apple-mobile-web-app-capable` meta tag
- Use Safari (not Chrome on iOS)

### Rate Limiting Not Working

**Check:**
1. KV namespace ID correct in wrangler.toml
2. KV namespace deployed
3. Worker logs show KV operations

---

## 📈 Post-Deployment Checklist

- [ ] Worker deployed and responding
- [ ] PWA deployed and accessible
- [ ] Camera works on iOS and Android
- [ ] AI analysis returns results
- [ ] History saves scans
- [ ] Trends chart displays
- [ ] Admin dashboard accessible
- [ ] QR codes generated
- [ ] API keys secured
- [ ] Rate limiting active
- [ ] Analytics configured
- [ ] Alerts set up

---

## 🎉 You're Live!

Your Afia Oil Tracker is now deployed to production!

**Next Steps:**
1. Share app URL with users
2. Print and attach QR codes to bottles
3. Monitor analytics
4. Collect user feedback
5. Plan future enhancements

---

## 📞 Support

**Issues?**
- Check logs in Cloudflare Dashboard
- Review Worker logs for API errors
- Check Pages deployment logs

**Need Help?**
- Documentation: See USER-GUIDE.md
- Issues: Open GitHub issue
- Email: support@afia-oil-tracker.com

---

**Last Updated:** March 6, 2026  
**Version:** 1.0.0
