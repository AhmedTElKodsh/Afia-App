# Quick Secrets Setup Guide

## ⚠️ Important: Run from Correct Directory

The verification script is located in the **root** `scripts/` directory, not in `worker/scripts/`.

## ✅ Correct Commands

### Option 1: Run from Worker Directory (where you are now)

```powershell
# Windows PowerShell
..\scripts\verify-and-set-secrets.ps1

# Or with full path
& "D:\AI Projects\Freelance\Afia-App\scripts\verify-and-set-secrets.ps1"
```

```bash
# Linux/Mac
../scripts/verify-and-set-secrets.sh
```

### Option 2: Run from Project Root

```powershell
# First, go to project root
cd ..

# Then run the script
.\scripts\verify-and-set-secrets.ps1
```

```bash
# Linux/Mac
cd ..
chmod +x scripts/verify-and-set-secrets.sh
./scripts/verify-and-set-secrets.sh
```

## 🔧 Manual Setup (If Script Doesn't Work)

If you prefer to set secrets manually:

```powershell
# IMPORTANT: Navigate to the worker directory first!
cd D:\AI Projects\Freelance\Afia-App\worker

# For DEFAULT environment (stage-1-llm-only production)
echo "YOUR_ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD
echo "YOUR_GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY
echo "YOUR_GEMINI_KEY2" | npx wrangler secret put GEMINI_API_KEY2
echo "YOUR_GEMINI_KEY3" | npx wrangler secret put GEMINI_API_KEY3
echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY

# For STAGE1 environment
echo "YOUR_ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD --env stage1
echo "YOUR_GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY --env stage1
echo "YOUR_GEMINI_KEY2" | npx wrangler secret put GEMINI_API_KEY2 --env stage1
echo "YOUR_GEMINI_KEY3" | npx wrangler secret put GEMINI_API_KEY3 --env stage1
echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY --env stage1

# For STAGE2 environment
echo "YOUR_ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD --env stage2
echo "YOUR_GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY --env stage2
echo "YOUR_GEMINI_KEY2" | npx wrangler secret put GEMINI_API_KEY2 --env stage2
echo "YOUR_GEMINI_KEY3" | npx wrangler secret put GEMINI_API_KEY3 --env stage2
echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY --env stage2
```

## 🔍 Verify Secrets

**IMPORTANT: You MUST be in the `worker` directory to run wrangler commands!**

```powershell
# First, navigate to the worker directory
cd D:\AI Projects\Freelance\Afia-App\worker

# Check DEFAULT environment
npx wrangler secret list

# Check STAGE1 environment
npx wrangler secret list --env stage1

# Check STAGE2 environment
npx wrangler secret list --env stage2
```

## 🔑 Get Free API Keys

- **Gemini:** https://aistudio.google.com/app/apikey
- **Groq:** https://console.groq.com/keys

## 📚 Full Documentation

See [docs/SECRETS-MANAGEMENT.md](docs/SECRETS-MANAGEMENT.md) for complete guide.
