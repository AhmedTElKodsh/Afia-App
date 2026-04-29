# Fix: API Keys Environment Mismatch

## Problem Identified

Your API keys were set with `--env stage1` but your worker is deployed to the **default environment**.

From your screenshot, the worker URL is: `afia-worker.savola.workers.dev` (default environment)

But the keys were set for: `afia-worker` with `--env stage1` flag

## Solution: Set Keys for Default Environment

You need to set the API keys **without** the `--env stage1` flag:

### Quick Fix (Run these commands):

```bash
cd worker

# Set Gemini API keys for DEFAULT environment (no --env flag)
echo "YOUR_GEMINI_KEY_1" | npx wrangler secret put GEMINI_API_KEY
echo "YOUR_GEMINI_KEY_2" | npx wrangler secret put GEMINI_API_KEY2
echo "YOUR_GEMINI_KEY_3" | npx wrangler secret put GEMINI_API_KEY3
echo "YOUR_GEMINI_KEY_4" | npx wrangler secret put GEMINI_API_KEY4

# Set fallback keys
echo "YOUR_GROQ_KEY" | npx wrangler secret put GROQ_API_KEY
```

### Important Notes:

1. **Remove the `--env stage1` flag** - this is the key difference
2. The default environment is what's actually deployed and running
3. After setting the keys, they take effect immediately (no redeployment needed)

### Security Issue to Fix:

I noticed in your screenshot that `GEMINI_API_Key3` is set as **Plaintext** instead of **Secret**. This exposes your API key. You should:

1. Delete that plaintext variable
2. Set it as a secret instead:
   ```bash
   echo "YOUR_KEY" | npx wrangler secret put GEMINI_API_KEY3
   ```

## Verification

After setting the keys, verify they're configured:

```bash
cd worker
npx wrangler secret list
```

You should see:
- GEMINI_API_KEY
- GEMINI_API_KEY2 (if set)
- GEMINI_API_KEY3 (if set)
- GEMINI_API_KEY4 (if set)
- GROQ_API_KEY (if set)

## Alternative: Use Stage1 Environment

If you want to use the stage1 environment instead:

1. Update your app's `VITE_PROXY_URL` to point to the stage1 worker
2. The stage1 worker URL would be different from the default
3. Keep the keys as they are (with `--env stage1`)

But the **easier solution** is to set keys for the default environment as shown above.
