# Quick Start: Fix "Analysis Failed" Error

## Problem
The app shows "Analysis Failed" because API keys are not configured.

## Solution (5 minutes)

### Step 1: Get a Free Gemini API Key
1. Visit: https://aistudio.google.com/app/apikey
2. Sign in with Google
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

### Step 2: Set the API Key

**Windows PowerShell:**
```powershell
cd worker
echo "YOUR_GEMINI_KEY_HERE" | npx wrangler secret put GEMINI_API_KEY --env stage1
```

**Linux/Mac/Git Bash:**
```bash
cd worker
echo "YOUR_GEMINI_KEY_HERE" | npx wrangler secret put GEMINI_API_KEY --env stage1
```

Replace `YOUR_GEMINI_KEY_HERE` with your actual key.

### Step 3: Test
1. Open the app: https://afia-app.pages.dev
2. Scan a bottle QR code
3. Take a photo
4. Analysis should now work! ✅

## Alternative: Use Setup Script

**Windows:**
```powershell
.\scripts\setup-api-keys.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/setup-api-keys.sh
./scripts/setup-api-keys.sh
```

The script will guide you through setting up all API keys interactively.

## Need Help?

See full documentation: [docs/API-KEYS-SETUP.md](docs/API-KEYS-SETUP.md)

## Optional: Add More Keys for Better Performance

Get additional free API keys:
- **Groq** (recommended): https://console.groq.com/keys
- **OpenRouter**: https://openrouter.ai/keys
- **More Gemini keys**: Create 2-3 keys to increase rate limits

Set them the same way:
```bash
cd worker
echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY --env stage1
echo "YOUR_GEMINI_KEY_2" | npx wrangler secret put GEMINI_API_KEY2 --env stage1
```

## Verify Setup

Check which keys are configured:
```bash
cd worker
npx wrangler secret list --env stage1
```

You should see your keys listed (values are hidden for security).
