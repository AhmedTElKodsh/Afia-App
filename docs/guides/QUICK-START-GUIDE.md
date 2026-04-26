# Quick Start Guide - BMad Help Local Development

## 🎯 What Was Fixed

### Issues Resolved
1. ✅ **Missing admin password configuration** - Added `ADMIN_PASSWORD="1234"` to worker environment
2. ✅ **400 Bad Request error** - Fixed rate limiting middleware to work without KV namespace in local development
3. ✅ **Missing environment variables** - Created proper `.dev.vars` and updated `.env.local`
4. ✅ **Admin authentication not working** - Configured both client and server-side authentication
5. ✅ **KV namespace dependency** - Made rate limiting and lockout protection optional for local development

## 🚀 Quick Start (Windows)

### Option 1: Use the Startup Script (Easiest)
```bash
start-local-dev.bat
```

This will:
- Check and create required configuration files
- Install dependencies
- Start the Cloudflare Worker on port 8787
- Start the frontend on port 5173

### Option 2: Manual Start
```bash
# Terminal 1 - Start the worker
cd worker
wrangler dev

# Terminal 2 - Start the frontend
npm run dev
```

## 🔐 Admin Access

1. Open your browser to: `http://localhost:5173/admin`
2. Enter password: **`1234`**
3. You should now have access to the admin dashboard

## 📋 Configuration Files Created/Updated

### ✅ `worker/.dev.vars` (Created)
```env
ADMIN_PASSWORD="1234"
SUPABASE_URL="https://anfgqdgcbvmyegbfvvfh.supabase.co"
# ... other API keys
```

### ✅ `.env.local` (Updated)
```env
VITE_ADMIN_PASSWORD="1234"
VITE_PROXY_URL="http://localhost:8787"
# ... other variables
```

### ✅ `worker/src/index.ts` (Fixed)
- Modified rate limiting middleware to support local development
- Added fallback IP address for local testing
- Maintains security for production deployments

## 🧪 Testing the Setup

### 1. Test Worker Health
```bash
curl http://localhost:8787/health
```
Expected response:
```json
{"status":"ok","requestId":"..."}
```

### 2. Test Admin Authentication
```bash
curl -X POST http://localhost:8787/admin/auth \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 127.0.0.1" \
  -d "{\"password\":\"1234\"}"
```
Expected response:
```json
{"token":"...","expiresAt":...}
```

### 3. Test in Browser
1. Navigate to `http://localhost:5173/admin`
2. Enter password: `1234`
3. Should see admin dashboard

## 🎓 Using BMad Help

Now that your environment is set up, you can use the BMad Help system:

### Via Command
```bash
/bmad-help
```

### Via Natural Language
Just ask:
- "What should I do next?"
- "What workflows are available?"
- "Help me understand where I am"
- "Show me the next steps"

### What BMad Help Does
- ✅ Analyzes your current progress
- ✅ Recommends next workflow steps
- ✅ Shows available commands and agents
- ✅ Guides you through the BMad methodology
- ✅ Detects completed artifacts
- ✅ Provides context-aware suggestions

## 📚 BMad Workflow Overview

The BMad methodology follows these phases:

### 1. Analysis Phase
- **Brainstorm Project** (BP) - Generate ideas
- **Market Research** (MR) - Analyze competition
- **Domain Research** (DR) - Deep dive into industry
- **Technical Research** (TR) - Evaluate technical approaches
- **Create Brief** (CB) - Define product concept

### 2. Planning Phase
- **Create PRD** (CP) - ⚠️ **REQUIRED** - Product Requirements Document
- **Validate PRD** (VP) - Quality check
- **Edit PRD** (EP) - Refinements
- **Create UX** (CU) - User experience design

### 3. Solutioning Phase
- **Create Architecture** (CA) - ⚠️ **REQUIRED** - Technical design
- **Create Epics and Stories** (CE) - ⚠️ **REQUIRED** - Break down work
- **Check Implementation Readiness** (IR) - ⚠️ **REQUIRED** - Validate alignment

### 4. Implementation Phase
- **Sprint Planning** (SP) - ⚠️ **REQUIRED** - Create sprint plan
- **Sprint Status** (SS) - Check progress
- **Create Story** (CS) - ⚠️ **REQUIRED** - Prepare story
- **Dev Story** (DS) - ⚠️ **REQUIRED** - Implement
- **Code Review** (CR) - Quality check
- **Retrospective** (ER) - Learn and improve

### Anytime Workflows
- **Quick Dev** (QD) - Fast one-off changes
- **Quick Spec** (QS) - Simple specifications
- **Document Project** (DP) - Generate documentation
- **Write Document** (WD) - Technical writing
- **Correct Course** (CC) - Handle major changes

## 🔧 Troubleshooting

### Worker not starting?
```bash
cd worker
npm install
wrangler dev
```

### Getting "Rate limiting disabled" warning?
This is **normal and safe** for local development. The worker will work without KV namespace. See `LOCAL-DEV-KV-FIX.md` for details.

### Frontend not connecting to worker?
Check `.env.local` has:
```env
VITE_PROXY_URL="http://localhost:8787"
```

### Admin password not working?
1. Check `worker/.dev.vars` has `ADMIN_PASSWORD="1234"`
2. Restart the worker: `Ctrl+C` then `wrangler dev`
3. Check `.env.local` has `VITE_ADMIN_PASSWORD="1234"`

### Still getting 400 errors?
The rate limiting fix should handle this. If not:
1. Verify `worker/src/index.ts` has the updated rate limiting code
2. Restart the worker
3. Check browser console for CORS errors

## ⚠️ Production Security

**IMPORTANT**: The password "1234" is for LOCAL DEVELOPMENT ONLY!

For production:
```bash
# Set strong password via Wrangler secrets
wrangler secret put ADMIN_PASSWORD --env stage1
# Enter a strong password when prompted (min 16 characters)

# Set GitHub secret
# Go to: Settings > Secrets and variables > Actions
# Add: VITE_ADMIN_PASSWORD with a strong value
```

## 📖 Next Steps

1. ✅ Start the development environment
2. ✅ Test admin access with password "1234"
3. ✅ Run `/bmad-help` to see available workflows
4. 🎯 Start with **Create PRD** (CP) if beginning a new project
5. 🎯 Or use **Quick Dev** (QD) for simple changes

## 📞 Need Help?

- Run `/bmad-help` for workflow guidance
- Check `BMAD-HELP-LOCAL-FIX.md` for detailed technical information
- Review the BMad Help CSV catalog at `_bmad/_config/bmad-help.csv`

## 🎉 You're Ready!

Your BMad Help system is now fully configured and ready to use. Start by running:

```bash
/bmad-help
```

Or simply ask: "What should I do next?"

Happy building! 🚀
