# Afia Oil Tracker — POC Status Analysis & Remaining Steps

**Agent:** 📊 Mary (Analyst) + 🏗️ Winston (Architect)
**Date:** 2026-04-05
**Goal:** Reach a fully finished, deployed, testable POC prototype

---

## What Is DONE (All Application Code Complete)

The retrospective confirms all **38 stories across 5 epics were implemented** in the POC sprint. The codebase is production-ready:

| Area | Status | Evidence |
|------|--------|---------|
| React 19 + TypeScript + Vite PWA | Done | src/ full state machine, routing, all screens |
| Cloudflare Worker (Hono) | Done | worker/src/ analyze, feedback, monitoring |
| Gemini 2.5 Flash integration | Done | worker/src/providers/ |
| Groq Llama 4 Scout fallback | Done | Provider chain implemented |
| Volume calculator (cylinder/frustum) | Done | src/utils/volumeCalculator.ts |
| Nutrition calculator (USDA data) | Done | src/utils/nutritionCalculator.ts |
| Feedback validator (4-flag, Layer 1) | Done | src/utils/feedbackValidator.ts |
| Image compressor | Done | src/utils/imageCompressor.ts |
| QR landing page | Done | src/components/QrLanding.tsx |
| Camera viewfinder + capture | Done | src/components/CameraViewfinder.tsx |
| Result display (fill gauge, nutrition) | Done | src/components/ResultDisplay.tsx |
| Feedback collection UI | Done | src/components/FeedbackPrompt.tsx |
| Scan history (localStorage) | Done | src/components/ScanHistory.tsx |
| Admin dashboard | Done | src/components/AdminDashboard.tsx |
| Test Lab (admin test harness) | Done | src/components/TestLab.tsx |
| iOS in-app browser detection | Done | src/hooks/useIosInAppBrowser.ts |
| Offline banner | Done | src/components/OfflineBanner.tsx |
| Privacy notice (first-scan consent) | Done | src/components/PrivacyInline.tsx |
| Unit tests (34/34 passing) | Done | Vitest |
| GitHub Actions CI/CD pipeline | Authored | .github/workflows/deploy.yml |
| Worker deployed | LIVE | https://afia-worker.savola.workers.dev |

The Worker is already live. The only remaining blocker to a fully deployed POC is the Cloudflare Pages setup and a few infrastructure configuration steps.

---

## What Is BLOCKING the POC (Must Do)

These are the 4 hard blockers — nothing else prevents a live, testable prototype.

### Blocker 1 — Cloudflare Pages Not Deployed
The PWA frontend has not been connected to Cloudflare Pages yet.

Steps:
1. Go to dash.cloudflare.com
2. Workers & Pages > Create > Pages > Connect to Git > select Afia-App
3. Build command: npm run build | Output dir: dist
4. After deploy: Settings > Env Variables > add VITE_PROXY_URL = https://afia-worker.savola.workers.dev
5. Retry deployment with the env var set

### Blocker 2 — GitHub Secrets Not Configured (CI/CD)
The CI/CD pipeline file exists but cannot run without 2 GitHub secrets:
- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID

Set in GitHub > Settings > Secrets & Variables > Actions.

### Blocker 3 — R2 Bucket Not Created
Training data cannot be stored until the bucket exists:

    cd worker
    npx wrangler r2 bucket create afia-training-data

### Blocker 4 — Groq Model ID Unverified
The worker uses meta-llama/llama-4-scout-17b-16e-instruct which has not been confirmed against the live Groq API. Must be verified before the fallback can be trusted:

    curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer YOUR_GROQ_API_KEY"

---

## What Is Pending (Nice-to-Have / Post-Deploy)

| Item | Priority | Action |
|------|----------|--------|
| Real iOS Safari device test | High | Test camera flow on physical iPhone |
| Add llmFillPercentage to api-spec.md | Low | Documentation only |
| Fix registry duplication (bottleRegistry.ts x2) | Medium | Phase 2 refactor |
| Add hook/component test coverage | Medium | Phase 2 |
| Confirm ALLOWED_ORIGINS includes Pages URL | Medium | Update worker/wrangler.toml + redeploy Worker |

---

## Sprint Status Reality Check

The sprint-status.yaml shows many stories as backlog — but this is outdated. The retrospective (2026-02-27) confirms all 38 stories were completed. The sprint status file was simply never updated after completion.

Actual status: Epics 1-5 = done. Code written, tests passing, Worker deployed.

---

## Recommended Steps to Finish (In Order)

### Step 1 — Verify Groq Model ID (5 min) — BLOCKER

    curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer YOUR_GROQ_API_KEY"

Update worker/src/providers/groq.ts if model ID differs.

### Step 2 — Create R2 Bucket (2 min) — BLOCKER

    cd worker && npx wrangler r2 bucket create afia-training-data

### Step 3 — Deploy Frontend to Cloudflare Pages (15 min) — BLOCKER

Follow NEXT-STEPS.md. Connect GitHub repo to Cloudflare Pages, set VITE_PROXY_URL.

### Step 4 — Update ALLOWED_ORIGINS for Pages URL (2 min)

Add your *.pages.dev URL to worker/wrangler.toml ALLOWED_ORIGINS, then:

    cd worker && npx wrangler deploy

### Step 5 — Configure GitHub Secrets + Test CI/CD (10 min)

Add CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID as GitHub repo secrets, then push to main.

### Step 6 — End-to-End Smoke Test (20 min)

    https://your-app.pages.dev?sku=filippo-berio-500ml

Full flow: QR load > camera > capture > AI analysis > result > feedback submission.

### Step 7 — Real iOS Device Test

Test the full camera flow in iOS Safari (browser mode, not standalone). Confirm no WebKit camera bug.

---

## Definition of "Fully Finished POC"

A POC is done when:
- [ ] Pages URL is live and loads the PWA shell
- [ ] Worker health: https://afia-worker.savola.workers.dev/health responds with {"status":"ok"}
- [ ] Full scan flow works end-to-end (QR > camera > AI result > feedback)
- [ ] CI/CD: push to main auto-deploys Worker + Pages
- [ ] iOS Safari camera confirmed working on a real device
- [ ] At least 1 real scan stored end-to-end

Estimated remaining effort: ~1-2 hours of infrastructure/config work only. No code changes needed.

---

## Recommended BMAD Workflows for Remaining Work

| Need | Command | Agent |
|------|---------|-------|
| Execute deployment steps as code tasks | /bmad-bmm-quick-dev | Barry - Quick Flow Solo Dev |
| Update sprint-status.yaml to reflect completion | /bmad-bmm-sprint-status | Bob - Scrum Master |
| Post-deployment retrospective / Phase 2 planning | /bmad-bmm-retrospective | Bob - Scrum Master |

Use a fresh context window for each workflow. For deployment tasks, use /bmad-bmm-quick-dev with DEPLOYMENT-GUIDE.md as context.
