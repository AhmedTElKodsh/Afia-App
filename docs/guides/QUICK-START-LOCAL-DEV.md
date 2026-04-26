# Quick Start: Local Development

## Current Setup ✅

Your project is configured for **local-first development**:
- ✅ GitHub Actions disabled (no automatic Cloudflare deployments)
- ✅ Local worker and frontend working
- ✅ Tests running locally
- ✅ Manual deployment script ready

## Daily Development Workflow

### 1. Start Development Servers

```bash
# Terminal 1: Start Worker
cd worker
npm run dev
# → Worker running at http://localhost:8787

# Terminal 2: Start Frontend
npm run dev
# → Frontend running at http://localhost:5173
```

### 2. Run Tests

```bash
# Terminal 3: Run tests as you develop
npm test                    # Unit tests
npm run test:e2e           # E2E tests (requires worker running)
npm run test:integration   # Integration tests
```

### 3. Test on Mobile (QR Code)

**Find your local IP:**
```bash
ipconfig  # Windows
# Look for IPv4 Address like: 192.168.1.100
```

**Generate QR code with:**
```
http://192.168.1.100:5173/?sku=afia-corn-1.5l
```

**Requirements:**
- Both devices on same WiFi
- Worker accessible at `http://192.168.1.100:8787`
- Frontend accessible at `http://192.168.1.100:5173`

**Alternative: Use ngrok for external testing**
```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 5173
# → Use the ngrok URL in QR code
```

## When to Deploy to Cloudflare

**Deploy only when:**
- ✅ All tests passing
- ✅ Feature complete and tested
- ✅ No critical bugs
- ✅ Ready for production

**How to deploy:**
```bash
# Option 1: Use deployment script (recommended)
./scripts/deploy-manual.sh

# Option 2: Manual commands
cd worker && npx wrangler deploy --env stage1
cd .. && npm run build
npx wrangler pages deploy dist --project-name=afia-app
```

## Testing Checklist

Before deploying to Cloudflare:

### Local Testing
- [ ] Unit tests passing: `npm test`
- [ ] E2E tests passing: `npm run test:e2e`
- [ ] Integration tests passing: `npm run test:integration`
- [ ] Manual desktop testing complete
- [ ] Mobile testing with local IP QR complete
- [ ] Camera functionality works
- [ ] QR scanning works
- [ ] Result display correct
- [ ] Feedback submission works
- [ ] Error handling tested
- [ ] Offline mode tested (PWA)

### After Cloudflare Deployment
- [ ] Worker health: `curl https://afia-worker.savola.workers.dev/health`
- [ ] Pages loading: `https://afia-app.pages.dev`
- [ ] QR code with production URL works
- [ ] Camera on mobile works
- [ ] AI analysis returns results
- [ ] Feedback submission works
- [ ] Rate limiting works
- [ ] No console errors

## Common Commands

```bash
# Development
npm run dev                 # Start frontend
cd worker && npm run dev    # Start worker

# Testing
npm test                    # Unit tests
npm run test:e2e           # E2E tests
npm run test:integration   # Integration tests
npm run test:watch         # Watch mode

# Building
npm run build              # Build for production

# Deployment (manual only)
./scripts/deploy-manual.sh # Deploy everything

# Monitoring (after deployment)
cd worker && npx wrangler tail    # Watch worker logs
npx wrangler metrics              # Check metrics
```

## Troubleshooting

### Worker not accessible on mobile
- Check firewall settings
- Ensure both devices on same WiFi
- Try `http://192.168.1.100:8787/health` from mobile browser

### Tests failing
- Ensure worker is running for E2E tests
- Check `.env.local` configuration
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Camera not working
- Use HTTPS or localhost (HTTP only works on localhost)
- Check browser permissions
- iOS: Must use Safari (not in-app browsers)

### Build errors
- Check environment variables in `.env.local`
- Ensure all dependencies installed: `npm ci`
- Clear build cache: `rm -rf dist && npm run build`

## Project Structure

```
/
├── src/                    # Frontend React app
├── worker/                 # Cloudflare Worker (backend)
├── scripts/                # Deployment scripts
│   └── deploy-manual.sh   # Manual deployment script
├── .github/workflows/      # CI/CD (currently disabled)
│   ├── *.yml.disabled     # Disabled workflows
│   └── README.md          # Workflow documentation
└── _bmad-output/          # BMad artifacts
    └── implementation-artifacts/
        └── LOCAL-DEVELOPMENT-STRATEGY.md  # Full strategy doc
```

## Key Files

- **`.env.local`** - Local environment variables (not committed)
- **`worker/.dev.vars`** - Worker secrets for local dev (not committed)
- **`scripts/deploy-manual.sh`** - Deployment script
- **`LOCAL-DEVELOPMENT-STRATEGY.md`** - Complete strategy documentation

## Next Steps

1. **Continue local development** until app is fully functional
2. **Run comprehensive tests** before any deployment
3. **Deploy manually** when ready using `./scripts/deploy-manual.sh`
4. **Monitor production** for errors after deployment
5. **Re-enable GitHub Actions** (optional, future) with manual triggers only

## Questions?

- **Full strategy:** See `_bmad-output/implementation-artifacts/LOCAL-DEVELOPMENT-STRATEGY.md`
- **Workflow docs:** See `.github/workflows/README.md`
- **Deployment guide:** See `README.md` → Deployment section
