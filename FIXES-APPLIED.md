# Fixes Applied - 2026-04-28

## 1. Admin Password Authentication Issue

**Problem:** Admin login showing "Network error. Please check your connection." despite `ADMIN_PASSWORD` being set in Cloudflare Worker.

**Root Cause:** `VITE_PROXY_URL` not set in afia-app Pages environment variables, causing frontend to default to `http://localhost:8787` in production.

**Solution:**
1. Set `VITE_PROXY_URL` = `https://afia-worker.savola.workers.dev` in Cloudflare Pages → afia-app → Settings → Environment variables (Production)
2. Redeploy Pages site to apply changes

**Files Changed:** None (configuration only)

---

## 2. Stage-1-LLM-Only Branch Deploying to Preview Instead of Production

**Problem:** Deployments from `stage-1-llm-only` branch showing as "Preview" environment instead of "Production".

**Root Cause:** GitHub Actions workflow only treated `master` branch as production, all other branches deployed as preview.

**Solution:** Updated `.github/workflows/ci-cd.yml` to treat both `master` and `stage-1-llm-only` as production branches.

**Files Changed:**
- `.github/workflows/ci-cd.yml` (lines 406, 417)

**Changes:**
```yaml
# Before:
BRANCH="${{ github.ref == 'refs/heads/master' && 'master' || github.ref_name }}"

# After:
BRANCH="${{ (github.ref == 'refs/heads/master' || github.ref == 'refs/heads/stage-1-llm-only') && 'master' || github.ref_name }}"
```

**Next Steps:**
- Push changes to `stage-1-llm-only` branch
- Next deployment will go to Production environment
