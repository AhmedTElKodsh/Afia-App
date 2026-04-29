# API Keys Setup Guide

This guide will help you configure the API keys required for the Afia App's image analysis feature.

## Overview

The Afia App uses AI providers to analyze oil bottle images. The system supports multiple providers with automatic fallback:

1. **Gemini API** (Primary) - Google's Gemini 2.5 Flash model
2. **Groq API** (Fallback) - Fast inference with Llama Vision
3. **OpenRouter API** (Fallback) - Access to multiple models
4. **Mistral API** (Fallback) - Mistral's vision models

## Quick Setup

### Option 1: Automated Setup (Recommended)

**For Windows (PowerShell):**
```powershell
.\scripts\setup-api-keys.ps1
```

**For Linux/Mac (Bash):**
```bash
chmod +x scripts/setup-api-keys.sh
./scripts/setup-api-keys.sh
```

### Option 2: Manual Setup

#### Step 1: Get Your API Keys

1. **Gemini API** (Required)
   - Visit: https://aistudio.google.com/app/apikey
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the key (starts with `AIza...`)
   - **Tip:** Create 2-3 keys for better rate limits

2. **Groq API** (Optional but recommended)
   - Visit: https://console.groq.com/keys
   - Sign up for free account
   - Create a new API key
   - Copy the key (starts with `gsk_...`)

3. **OpenRouter API** (Optional)
   - Visit: https://openrouter.ai/keys
   - Sign up for free account
   - Create a new API key
   - Copy the key

4. **Mistral API** (Optional)
   - Visit: https://console.mistral.ai/api-keys/
   - Sign up for free account
   - Create a new API key
   - Copy the key

#### Step 2: Set Keys in Cloudflare Worker

Navigate to the worker directory:
```bash
cd worker
```

Set the Gemini API keys (at least one required):
```bash
# Primary key (required)
echo "YOUR_GEMINI_KEY_1" | npx wrangler secret put GEMINI_API_KEY --env stage1

# Additional keys for rotation (optional)
echo "YOUR_GEMINI_KEY_2" | npx wrangler secret put GEMINI_API_KEY2 --env stage1
echo "YOUR_GEMINI_KEY_3" | npx wrangler secret put GEMINI_API_KEY3 --env stage1
echo "YOUR_GEMINI_KEY_4" | npx wrangler secret put GEMINI_API_KEY4 --env stage1
```

Set fallback provider keys (optional):
```bash
# Groq (recommended fallback)
echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY --env stage1

# OpenRouter (optional)
echo "YOUR_OPENROUTER_KEY" | npx wrangler secret put OPENROUTER_API_KEY --env stage1

# Mistral (optional)
echo "YOUR_MISTRAL_KEY" | npx wrangler secret put MISTRAL_API_KEY --env stage1
```

#### Step 3: Verify Setup

List configured secrets:
```bash
npx wrangler secret list --env stage1
```

You should see your configured keys listed (values are hidden for security).

## Rate Limits & Quotas

### Gemini API (Free Tier)
- **Rate Limit:** 15 requests per minute
- **Daily Quota:** 1,500 requests per day
- **Strategy:** Use multiple keys to multiply limits

### Groq API (Free Tier)
- **Rate Limit:** 30 requests per minute
- **Daily Quota:** 14,400 requests per day
- **Models:** Llama 3.2 Vision (11B/90B)

### OpenRouter (Free Tier)
- **Rate Limit:** Varies by model
- **Credits:** Free credits available
- **Models:** Multiple vision models available

### Mistral API (Free Tier)
- **Rate Limit:** Varies by plan
- **Models:** Pixtral vision models

## Fallback Strategy

The system automatically tries providers in this order:

1. **Gemini** (tries all configured keys in rotation)
2. **Groq** (if Gemini fails)
3. **OpenRouter** (if Groq fails)
4. **Mistral** (if OpenRouter fails)

If all providers fail, the user sees: "Image analysis temporarily unavailable. Please try again."

## Testing

### Test with Mock Mode (No API Keys Required)

Enable mock mode for testing without API keys:
```bash
cd worker
echo "true" | npx wrangler secret put ENABLE_MOCK_LLM --env stage1
```

Disable mock mode:
```bash
echo "false" | npx wrangler secret put ENABLE_MOCK_LLM --env stage1
```

### Test with Real API

1. Scan a bottle QR code with the app
2. Take a photo of the bottle
3. Check if analysis completes successfully
4. Verify results in the admin dashboard

## Troubleshooting

### "Analysis Failed" Error

**Possible causes:**
1. No API keys configured
2. API keys are invalid or expired
3. Rate limit exceeded
4. Network connectivity issues

**Solutions:**
1. Verify keys are set: `npx wrangler secret list --env stage1`
2. Check API key validity in provider dashboards
3. Wait a few minutes if rate limited
4. Add more Gemini keys or enable fallback providers

### "All AI providers failed" Error

**Possible causes:**
1. All configured providers are rate limited
2. Network issues with provider APIs
3. Invalid image format

**Solutions:**
1. Enable mock mode temporarily for testing
2. Add more API keys
3. Check image format (should be JPEG/PNG base64)

### Checking Logs

View worker logs:
```bash
cd worker
npx wrangler tail --env stage1
```

Look for error messages like:
- `Gemini API error 429` - Rate limited
- `Gemini API error 401` - Invalid API key
- `All Gemini API keys failed` - All keys exhausted

## Security Best Practices

1. **Never commit API keys to Git**
   - Keys are stored as Cloudflare Worker secrets
   - Never add keys to `.env` files in the repository

2. **Rotate keys regularly**
   - Generate new keys every few months
   - Update secrets using wrangler CLI

3. **Monitor usage**
   - Check provider dashboards regularly
   - Set up usage alerts if available

4. **Use multiple keys**
   - Distribute load across multiple Gemini keys
   - Reduces risk of hitting rate limits

## GitHub Actions Setup

For CI/CD, add these secrets to your GitHub repository:

1. Go to: `Settings` → `Secrets and variables` → `Actions`
2. Add these secrets:
   - `GEMINI_API_KEY`
   - `GEMINI_API_KEY2` (optional)
   - `GEMINI_API_KEY3` (optional)
   - `GROQ_API_KEY` (optional)

The CI/CD workflow will automatically use these for testing.

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review worker logs: `npx wrangler tail --env stage1`
3. Test with mock mode to isolate API issues
4. Verify API keys in provider dashboards

## Additional Resources

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Groq API Documentation](https://console.groq.com/docs)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Mistral API Documentation](https://docs.mistral.ai/)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
