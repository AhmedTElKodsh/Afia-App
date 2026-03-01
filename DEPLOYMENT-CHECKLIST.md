# ✅ Deployment Checklist - Safi Oil Tracker POC

## Pre-Deployment ✅

- [x] All 38 stories implemented
- [x] 75 unit tests passing (34 original + 41 new)
- [x] Registry duplication fixed (shared module)
- [x] API spec updated (llmFillPercentage in /feedback)
- [x] Groq model verified: `meta-llama/llama-4-scout-17b-16e-instruct`
- [x] API keys collected and ready
- [x] R2 gracefully disabled (no credit card needed)
- [x] KV namespace configured in wrangler.toml

## Deployment Steps

### Phase 1: Worker Deployment

- [ ] Navigate to worker directory: `cd worker`
- [ ] Install dependencies: `npm ci`
- [ ] Set GEMINI_API_KEY secret
- [ ] Set GEMINI_API_KEY2 secret
- [ ] Set GEMINI_API_KEY3 secret
- [ ] Set GROQ_API_KEY secret
- [ ] Deploy Worker: `npx wrangler deploy`
- [ ] Copy Worker URL from output
- [ ] Test health endpoint: `curl https://YOUR-WORKER-URL/health`

**Quick Option**: Run `.\deploy-setup.ps1` (does all above automatically)

### Phase 2: Pages Deployment

- [ ] Go to Cloudflare Dashboard
- [ ] Create Pages project (Workers & Pages → Create → Pages)
- [ ] Connect to GitHub repository
- [ ] Configure build:
  - Framework: Vite
  - Build command: `npm run build`
  - Output directory: `dist`
- [ ] Deploy initial version
- [ ] Go to Settings → Environment variables
- [ ] Add `VITE_PROXY_URL` = Worker URL
- [ ] Apply to Production and Preview
- [ ] Redeploy Pages project
- [ ] Copy Pages URL
- [ ] Test PWA: Visit `https://YOUR-PAGES-URL?sku=filippo-berio-500ml`

### Phase 3: CI/CD Setup

- [ ] Get Cloudflare API Token:
  - Visit: https://dash.cloudflare.com/profile/api-tokens
  - Create token with "Edit Cloudflare Workers" permissions
  - Copy token (shown only once!)
- [ ] Get Cloudflare Account ID:
  - Visit: https://dash.cloudflare.com
  - Copy Account ID from sidebar or URL
- [ ] Add GitHub secrets:
  - Go to repo Settings → Secrets and variables → Actions
  - Add `CLOUDFLARE_API_TOKEN`
  - Add `CLOUDFLARE_ACCOUNT_ID`
- [ ] Test CI/CD:
  - Make a small change (e.g., update README)
  - Commit and push to main
  - Check GitHub Actions tab for workflow run
  - Verify all jobs pass (test, build, deploy-worker, deploy-pages)

## Post-Deployment Testing

### Worker Tests

- [ ] Health check returns `{"status":"ok"}`
- [ ] Rate limiting works (11th request returns 429)
- [ ] CORS headers present in responses
- [ ] Gemini API calls succeed
- [ ] Groq fallback works (test by using invalid Gemini key temporarily)

### PWA Tests

- [ ] Pages loads without errors
- [ ] Camera permissions prompt appears
- [ ] Camera starts successfully
- [ ] Scan button works
- [ ] Results display correctly
- [ ] Feedback submission works
- [ ] Privacy notice appears on first scan
- [ ] Privacy notice persists after acceptance
- [ ] Offline detection works (disable network)
- [ ] iOS in-app browser detection works (if testing on iOS)

### Full Flow Tests

- [ ] Test with `filippo-berio-500ml` SKU
- [ ] Test with `bertolli-750ml` SKU
- [ ] Test with `safi-sunflower-1l` SKU
- [ ] Test with invalid SKU (should show error)
- [ ] Test feedback: "about_right"
- [ ] Test feedback: "too_high" with correction
- [ ] Test feedback: "too_low" with correction
- [ ] Test feedback: "way_off" with correction
- [ ] Verify response times are reasonable (<5s)
- [ ] Check browser console for errors

### CI/CD Tests

- [ ] Push to main triggers workflow
- [ ] All tests pass in CI
- [ ] Worker deploys successfully
- [ ] Pages deploys successfully
- [ ] Preview deployments work on PRs
- [ ] Preview URLs are commented on PRs

## Known Limitations (POC)

- ⚠️ R2 storage disabled (no training data persistence)
- ⚠️ No real iOS device testing yet (use BrowserStack if needed)
- ⚠️ Rate limiting is per-IP (not per-user)
- ⚠️ No analytics dashboard
- ⚠️ No custom domain

## Success Criteria

Your POC deployment is successful when:

1. ✅ Worker is live and responding
2. ✅ PWA is accessible via Pages URL
3. ✅ Camera works in browser
4. ✅ Full scan flow completes end-to-end
5. ✅ Feedback submission works
6. ✅ Rate limiting triggers correctly
7. ✅ CI/CD pipeline runs on push
8. ✅ No console errors during normal usage

## Next Steps After Deployment

1. **Comprehensive QA Testing**: Use QA agent to test all 38 stories
2. **iOS Testing**: Use BrowserStack or ask friend with iPhone
3. **Performance Monitoring**: Check Worker analytics in Cloudflare
4. **User Feedback**: Share with stakeholders for feedback
5. **Phase 2 Planning**: Plan R2 enablement and additional features

## Troubleshooting

If something fails, check:

1. Worker logs: `cd worker && npx wrangler tail`
2. Browser console for client errors
3. GitHub Actions logs for CI/CD issues
4. Cloudflare Pages deployment logs
5. Verify all secrets are set: `npx wrangler secret list`

## Support Resources

- Deployment Guide: `DEPLOYMENT-GUIDE.md`
- Quick Reference: `QUICK-DEPLOY.md`
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- API Spec: `_bmad-output/planning-artifacts/docs/api-spec.md`
- Retrospective: `_bmad-output/planning-artifacts/poc-retrospective-2026-02-27.md`

---

**Ready to deploy?** Run `.\deploy-setup.ps1` to get started! 🚀
