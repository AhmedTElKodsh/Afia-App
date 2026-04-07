# Afia App — Known Issues & Technical Debt

## Active SKU Restriction

**The app is hard-locked to a single SKU: `afia-corn-1.5l` (Afia Pure Corn Oil 1.5L).**

All other historical bottles (sunflower 250ml..3.5L) were removed from `shared/bottleRegistry.ts` as part of the POC pilot restriction. Epic 7 (Multi-Bottle Support) is deprecated — its E2E tests have been rewritten to assert the single-SKU behaviour and that legacy QR codes degrade gracefully to the not-supported state. Re-enabling multi-bottle requires adding entries back to the registry and restoring the Epic 7 test suite from git history.

## Code Duplication

### Bottle Registry (Manual Sync Required)
- **Frontend**: `src/data/bottleRegistry.ts`
- **Worker**: `worker/src/bottleRegistry.ts`
- **Risk**: Entries can drift. Frontend returns `undefined` for unknown SKU; worker returns `null`.
- **Planned fix**: Shared package in Phase 2.

### Feedback Validator (Manual Sync Required)
- **Frontend**: `src/utils/feedbackValidator.ts`
- **Worker**: `worker/src/validation/feedbackValidator.ts`
- **Risk**: Identical logic but independently maintained. Validation differences could cause client/server disagreement.
- **Planned fix**: Shared package in Phase 2.

## R2 Storage Disabled for POC

- R2 bucket binding is commented out in `worker/wrangler.toml`
- `storeScan()` and `updateScanWithFeedback()` silently no-op when `TRAINING_BUCKET` is undefined
- **Impact**: No training data is being collected. Feedback is accepted but not persisted.
- **Fix**: Requires Cloudflare credit card to enable R2. Uncomment binding in `wrangler.toml`.

## PWA Limitations

### iOS display: "browser" Workaround
- `display: "browser"` used instead of `"standalone"` due to iOS WebKit getUserMedia bug in standalone mode
- **Impact**: Address bar remains visible, slightly reduced screen real estate
- **Tracking**: Apple WebKit bug — no fix timeline available

### No Offline Scanning
- Camera capture works offline but analysis requires network
- PWA service worker caches shell + bottle images only
- API calls (`/analyze`, `/feedback`) use `NetworkOnly` strategy
- **Design decision**: Offline scanning would require on-device ML model

## Naming Inconsistency

- Project folder: `Afia-App`
- PWA manifest name: `Safi Oil Tracker`
- Worker name: `safi-worker`
- Cloudflare Pages project: `safi-oil-tracker`
- Landing page brand mark: `Safi`
- **Action**: Rename to consistent "Afia" branding across all touchpoints

## Missing Test Coverage

| Area | Status | Notes |
|------|--------|-------|
| Frontend utils | Covered (34 tests) | volumeCalculator, nutritionCalculator, feedbackValidator |
| React components | Not tested | No component rendering tests |
| API client | Not tested | No mock/integration tests for apiClient.ts |
| useCamera hook | Not tested | Complex browser API mocking needed |
| Worker endpoints | Not tested | No integration tests for analyze.ts or feedback.ts |
| LLM providers | Not tested | Would need mock API responses |

## Security Considerations

- No authentication — anyone with a valid SKU URL can scan
- Rate limiting by IP only — can be bypassed via proxies
- Image size validation (4MB) on worker but no image format validation (assumes JPEG)
- `parseLLMResponse` uses `JSON.parse` on LLM output — trusted but could throw on malformed JSON
- Base64 image sent in POST body — large payloads (~1-3MB)

## Performance Notes

- Image compression (800px, JPEG 0.78) reduces upload size significantly
- Gemini API key rotation distributes load across up to 3 keys
- R2 storage is non-blocking (`waitUntil`) — doesn't delay response
- Rate limit KV reads on every request — acceptable latency for Cloudflare KV
- No CDN caching for API responses (all POST, dynamic)

## Minor Issues

- `src/assets/react.svg` is the default Vite asset — unused, can be deleted
- `public/vite.svg` is the default Vite favicon — replaced by PWA icons but file remains
- Worker `bottleRegistry.ts` has slightly different geometry values for `safi-sunflower-1l` (h=260mm, d=75mm) vs frontend (h=275mm, d=80mm)
