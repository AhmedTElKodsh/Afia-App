---
title: 'Security & Quality Hardening — Adversarial Review Fixes'
slug: 'security-quality-hardening'
created: '2026-04-18'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['React 19', 'TypeScript 5.9 strict', 'Cloudflare Worker (Hono)', 'Cloudflare KV', 'Supabase (Storage + DB)', 'Vite 7', 'Cloudflare Pages', 'i18next', 'Vitest', 'Playwright']
files_to_modify:
  - public/_headers
  - src/App.tsx
  - src/components/admin/ModelVersionManager.tsx
  - src/components/admin/ModelVersionManager.test.tsx
  - src/api/apiClient.ts
  - worker/src/adminAuth.ts
  - package.json
files_to_create:
  - DEPLOYMENT.md
  - worker/src/__tests__/adminAuth.test.ts
files_to_delete:
  - DEPLOYMENT-CHECKLIST.md
  - DEPLOYMENT-GUIDE.md
  - DEPLOYMENT-INSTRUCTIONS.md
code_patterns:
  - 'KV timestamp-list sliding window (worker/src/index.ts lines 48-111)'
  - 'sessionStorage admin session key: afia_admin_session'
  - 'AudioContext close: setTimeout(() => audioCtx.close(), 200)'
  - 'Auth lockout inline in handleAdminAuth, not middleware'
  - 'import.meta.env.DEV guard for test-only code'
test_patterns:
  - 'Vitest — vi.fn(), vi.mock(), vi.spyOn()'
  - 'sessionStorage mock: vi.spyOn(window.sessionStorage, "getItem")'
---

# Tech-Spec: Security & Quality Hardening — Adversarial Review Fixes

**Created:** 2026-04-18

## Overview

### Problem Statement

An adversarial review identified 12 issues across security, correctness, and code quality. Critical findings: admin token read from wrong storage (component silently always receives empty string, breaking model version management), no brute-force protection on `/admin/auth`, `AudioContext` leaking on every camera capture, test hooks compiled into production, misplaced production dependencies, and weak CSP headers. One finding (image storage bloat) was based on incomplete code reading — images are already correctly stored in Supabase Storage, not DB rows.

### Solution

Fix 10 in-scope items directly in code with zero new dependencies and zero new Cloudflare bindings. Consolidate 3 deployment docs into 1. Harden CSP headers without nonce complexity. Add KV-backed auth lockout inline in the auth handler.

### Scope

**In Scope:**
1. `public/_headers` — harden CSP: keep `X-Frame-Options: DENY`, add `frame-ancestors 'none'` to CSP, add `upgrade-insecure-requests`, tighten `connect-src` from `*.workers.dev` to exact Worker URL
2. `src/components/admin/ModelVersionManager.tsx` — fix `localStorage.getItem('adminToken')` → `sessionStorage.getItem('afia_admin_session')` (pre-existing bug: component silently broken in production)
3. `src/App.tsx` — add JSDoc to `hasValidAdminSession()` documenting it's expiry-only client gate; server enforces HMAC
4. `worker/src/adminAuth.ts` — add 5-failure/15-min KV timestamp-list lockout inline at top of `handleAdminAuth`
5. `src/App.tsx` — close `AudioContext` via `setTimeout(() => audioCtx.close(), 200)` in `handleCapture`
6. `src/App.tsx` — remove dead unreachable line: `{isAdminMode && <BottleSelector onBottleChange={setSelectedSku} />}` inside `else` branch of IDLE case
7. `src/App.tsx` — wrap test hooks `useEffect` in `if (import.meta.env.DEV)` guard
8. `package.json` — move `playwright` and `sharp` from `dependencies` to `devDependencies`
9. `src/api/apiClient.ts` — replace `any[]` on `getAdminScans` and `getAdminExport` with typed interfaces
10. Consolidate `DEPLOYMENT-CHECKLIST.md` + `DEPLOYMENT-GUIDE.md` + `DEPLOYMENT-INSTRUCTIONS.md` → `DEPLOYMENT.md`; delete originals

**Out of Scope:**
- CSP nonce implementation (Pages Functions complexity not justified — deferred)
- `console.log` cleanup (ESLint `no-console` enforced in prod builds already)
- Supabase → R2 image migration (images already correctly in Supabase Storage — separate initiative)
- `getGlobalScans` `any` map callback fix in `supabaseClient.ts` (Worker-side, separate concern)

## Context for Development

### Investigation Findings

- **`sharp` confirmed**: Used only in `scripts/augment-training-data.js` and `scripts/augment-existing-data.js`. Not in `worker/package.json`. Moving to `devDependencies` at root is correct.
- **`public/_headers` is the source**: Vite copies it to `dist/` on build. Never edit `dist/_headers`.
- **`ModelVersionManager` bug severity**: `localStorage.getItem('adminToken')` key is NEVER set anywhere in the codebase. Component has always returned empty string → every `/admin/model/versions` call fails with 401 silently. This is a pre-existing functional bug, not just a security issue.
- **Auth lockout placement**: Must be inline at top of `handleAdminAuth`, not as a middleware. Middleware adds overhead to all routes.
- **Unknown IP behaviour**: If `CF-Connecting-IP` is absent, the global rate-limit middleware returns HTTP 400 before `handleAdminAuth` is invoked — the `'unknown'` fallback in `handleAdminAuth` is technically unreachable dead code. Keep it anyway as a defensive safety net in case middleware order changes. All "unknown" requests would share one lockout bucket — acceptable.
- **Keep `X-Frame-Options: DENY`**: Redundancy with `frame-ancestors 'none'` is intentional — legacy iOS WebViews and some proxies only respect `X-Frame-Options`.
- **`DEPLOYMENT-INSTRUCTIONS.md`** is the canonical base (newest, Afia branding). Other two are stale Afia-era docs.

### Codebase Patterns

- **KV timestamp-list pattern** (`worker/src/index.ts` L48-111): `get(key)` → `JSON.parse` → filter to window → length check → push timestamp → `put(key, JSON.stringify(...), { expirationTtl })`. Auth lockout follows exactly this pattern.
- **Admin session keys**: `SESSION_KEY = "afia_admin_session"`, `SESSION_EXPIRES_KEY = "afia_admin_session_expires"` in both `App.tsx` and `AdminDashboard.tsx`.
- **TypeScript strict**: `unknown` not `any`, `import type` for type-only imports, all params typed.
- **`useCallback` in App.tsx**: All handlers are memoized. Guard additions inside a `useEffect` body do not affect `useCallback` deps.
- **AudioContext vendor prefix**: `window.AudioContext || window.webkitAudioContext` — preserve this.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `public/_headers` | Source CSP/headers — L1 is the only `Content-Security-Policy` line |
| `src/App.tsx` | L40-47 `hasValidAdminSession`, L187 `handleAnalyze`, L317-361 `handleCapture` AudioContext, L404-413 test hooks useEffect, L497-515 IDLE case else branch |
| `src/components/AdminDashboard.tsx` | L45-46 session key constants — reference for correct key names |
| `src/components/admin/ModelVersionManager.tsx` | L33-35 `getAdminToken()` — fix target |
| `src/components/admin/ModelVersionManager.test.tsx` | Mock update target |
| `src/api/apiClient.ts` | L130 `getAdminScans`, L164 `getAdminExport` — `any[]` return types |
| `worker/src/adminAuth.ts` | L22 `handleAdminAuth` — lockout goes here, before password check |
| `worker/src/index.ts` | L48-111 — rate limiting pattern to replicate for lockout |
| `package.json` | L33 `playwright`, L39 `sharp` in wrong section |
| `DEPLOYMENT-INSTRUCTIONS.md` | Canonical base for new `DEPLOYMENT.md` |

### Technical Decisions

- **CSP `connect-src`**: Hardcode production Worker URL. Add comment in `_headers` explaining the hardcoded URL and where to update it on Worker redeploy.
- **Auth lockout key**: `auth_lockout:{ip}` in `RATE_LIMIT_KV`. Window: 900s. Limit: 5. TTL: 900s. Clear on success.
- **`AdminScan` interface**: Define in `src/api/apiClient.ts` with fields matching what `AdminDashboard` actually consumes from the response (check usages in `AdminDashboard.tsx`).
- **Deployment docs**: Delete originals after `DEPLOYMENT.md` is complete. Git history preserves them.
- **`hasValidAdminSession` rename**: No rename — comment only (default applied).

---

## Implementation Plan

### Tasks

Tasks are ordered by: Worker changes first (no build required), then client fixes, then docs/config last.

- [ ] **Task 1: Add auth brute-force lockout to Worker**
  - File: `worker/src/adminAuth.ts`
  - Action: Implement the following sequence inside `handleAdminAuth`. This is the authoritative execution order — no contradiction between Action and Notes:
    1. Parse JSON body → return 400 if malformed
    2. Validate `body.password` is a non-empty string → return 400 if not
    3. Read `CF-Connecting-IP` header; fall back to `'unknown'` if absent (see Notes on reachability)
    4. Read `` `auth_lockout:${ip}` `` from `c.env.RATE_LIMIT_KV`; parse as JSON array of timestamps; filter to entries within last 900000ms
    5. If filtered length >= 5: **push `Date.now()` to the filtered array and write it back** with `expirationTtl: 900` (extending the lockout window — prevents brute-force via 15-min boundary timing), then return `c.json({ error: "Invalid password", code: "UNAUTHORIZED" }, 401)` — no lockout hint, same message as normal failure
    6. Run HMAC comparison against `adminPassword`
    7. If HMAC fails → append `Date.now()` to filtered array, write back with `expirationTtl: 900` using `` `auth_lockout:${ip}` `` as key → return `c.json({ error: "Invalid password", code: "UNAUTHORIZED" }, 401)`
    8. If HMAC succeeds → `await c.env.RATE_LIMIT_KV.delete(\`auth_lockout:${ip}\`)` → return token response
  - Notes: Reuse the exact JSON parse + filter + push + put pattern from `worker/src/index.ts` L62-76. Key is always a template literal `` `auth_lockout:${ip}` `` — never a string literal. **Timing side-channel awareness**: steps 5 (locked path) and 7 (wrong-password path) now both do a KV write, reducing — but not eliminating — the timing differential vs. the HMAC computation. This is an accepted residual risk; constant-time lockout is not achievable without a dummy HMAC comparison, which is out of scope. The `'unknown'` fallback (step 3) is technically unreachable: the global rate-limit middleware returns HTTP 400 when `CF-Connecting-IP` is absent, before `handleAdminAuth` is invoked. Keep the fallback anyway as a defensive safety net in case middleware order changes.

- [ ] **Task 2: Harden CSP in `public/_headers`**
  - File: `public/_headers`
  - Action: Replace the existing `Content-Security-Policy` line with:
    ```
    Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://YOUR_WORKER_URL; worker-src 'self'; frame-ancestors 'none'; upgrade-insecure-requests
    ```
    Replace `YOUR_WORKER_URL` with the confirmed production Worker URL. **BLOCKING GATE**: Do not merge Task 2 until Ahmed confirms the correct Worker URL. The URL `https://Afia-worker.savola.workers.dev` in `DEPLOYMENT-GUIDE.md` may be stale. Using a wrong URL here causes a self-DoS (all API calls browser-blocked) on production.
  - Also add comment lines above the CSP:
    ```
    # connect-src is hardcoded to the production Worker URL. Update here on Worker redeploy.
    # TODO(security): script-src 'unsafe-inline' and style-src 'unsafe-inline' are known remaining debt.
    # Removing requires nonce injection (Pages Functions) or a full inline-code audit. Track separately.
    ```
  - Keep `X-Frame-Options: DENY` line as-is (redundancy with frame-ancestors is intentional for legacy browser coverage).
  - Notes: `frame-ancestors 'none'` is inside the CSP value string; `X-Frame-Options: DENY` remains as a separate header.

- [ ] **Task 3: Fix `ModelVersionManager` wrong storage key**
  - File: `src/components/admin/ModelVersionManager.tsx`
  - Action: In `getAdminToken()` (L33-35), change:
    ```ts
    // Before
    return localStorage.getItem('adminToken') || '';
    // After
    return sessionStorage.getItem('afia_admin_session') || '';
    ```
  - File: `src/components/admin/ModelVersionManager.test.tsx`
  - Action: **Read the full test file before touching the mock.** Near L22, find the line `Storage.prototype.getItem = vi.fn(() => 'mock-admin-token')` (direct property assignment, not `vi.spyOn`). **Remove this line entirely** — it patches both localStorage and sessionStorage globally and is incompatible with the fix. Replace it with a scoped spy:
    ```ts
    // Remove this line entirely (direct assignment pollutes all storage in test suite):
    // Storage.prototype.getItem = vi.fn(() => 'mock-admin-token');

    // Add this instead — scoped to sessionStorage only:
    vi.spyOn(window.sessionStorage, 'getItem').mockImplementation((key) => {
      if (key === 'afia_admin_session') return 'mock-token';
      return null;
    });
    ```
    Placement rules (read the test file to determine which applies):
    - **If tests use `beforeEach`**: place the `vi.spyOn` inside it; add `afterEach(() => vi.restoreAllMocks())` if not already present.
    - **If mock is currently at module scope** (top of file, no `beforeEach`): add a `beforeEach(() => { vi.spyOn(...) })` block and a matching `afterEach(() => vi.restoreAllMocks())`. Do not replicate the module-scope pattern with the spy — it leaks across test files.
  - Notes: The original `Storage.prototype.getItem = vi.fn()` is a direct property assignment — `vi.restoreAllMocks()` does NOT restore it, only `vi.spyOn` creates a restorable spy. This is why the global patch must be removed, not wrapped. Component behaviour is otherwise unchanged — it still sends the token as `Authorization: Bearer {token}`.

- [ ] **Task 4: Add JSDoc to `hasValidAdminSession` in `App.tsx`**
  - File: `src/App.tsx`
  - Action: Add JSDoc comment immediately above `function hasValidAdminSession()` (approximately L43 — use content search, not line number, since prior insertions shift lines):
  - **Batching note: Tasks 4, 5, 6, and 7 all modify `src/App.tsx`. Even if tracking tasks individually with checkboxes, collect all four changes and apply them to the file in a single edit pass. Within that pass, work in reverse line order (Task 7 ≈ L404 → Task 6 ≈ L497 → Task 5 ≈ L317 → Task 4 ≈ L43) so earlier insertions do not shift later targets. Use content-search to locate each target — do not rely on approximate line numbers alone.**
    ```ts
    /**
     * Client-side session gate — checks token presence and expiry only.
     * Does NOT verify the HMAC signature (ADMIN_PASSWORD is a Worker secret,
     * unavailable client-side). Full cryptographic verification is enforced
     * server-side by verifyAdminSession() in worker/src/admin.ts for every
     * protected endpoint. This check prevents unnecessary UI rendering only.
     */
    ```

- [ ] **Task 5: Fix AudioContext leak in `handleCapture`**
  - File: `src/App.tsx`
  - Action: Inside `handleCapture`, after the second oscillator's `osc2.stop(...)` call (the last line inside the `if (AudioContextCtor)` block, before that block's closing `}`), add:
    ```ts
    setTimeout(() => audioCtx.close(), 200);
    ```
  - Notes: The last oscillator stops at `audioCtx.currentTime + 0.15`. Closing at +200ms gives 50ms buffer after the scheduled stop. Insert inside the `if (AudioContextCtor)` block, NOT at the end of the outer `try` block — `audioCtx` is only defined inside `if (AudioContextCtor)`; placing it in the `try` block risks a ReferenceError if AudioContext construction was skipped. **Batch Tasks 4, 5, 6, and 7 into a single `src/App.tsx` edit pass (see Task 4 batching note).**

- [ ] **Task 6: Remove dead code in IDLE case**
  - File: `src/App.tsx`
  - Action: In the IDLE `switch` case (around L497), find the `else` branch:
    ```tsx
    // Before — the isAdminMode && <BottleSelector> line is unreachable
    ) : (
      <>
        {isAdminMode && <BottleSelector onBottleChange={setSelectedSku} />}
        <QrLanding bottle={bottleContext} onStartScan={handleStartScan} />
      </>
    )}
    ```
    Remove only the `{isAdminMode && <BottleSelector onBottleChange={setSelectedSku} />}` line. Keep `<QrLanding>` and all surrounding JSX intact.
  - Notes: The outer ternary is `isAdminMode ? <TestLab> : <...>`. Inside the `else` branch, `isAdminMode` is always `false`. The `<BottleSelector>` was never rendered. No behaviour change.

- [ ] **Task 7: Guard test hooks behind `import.meta.env.DEV`**
  - File: `src/App.tsx`
  - Action: Find the `useEffect` starting at L404 that registers `window.__AFIA_TEST_MODE__`. Wrap its body in a dev guard:
    ```ts
    // Before
    useEffect(() => {
      if (window.__AFIA_TEST_MODE__) {
        const blankJpeg = '...';
        window.__AFIA_TRIGGER_ANALYZE__ = () => handleAnalyze(blankJpeg);
      }
      return () => {
        delete window.__AFIA_TRIGGER_ANALYZE__;
      };
    }, [handleAnalyze]);

    // After
    useEffect(() => {
      if (!import.meta.env.DEV) return;
      if (window.__AFIA_TEST_MODE__) {
        const blankJpeg = '...';
        window.__AFIA_TRIGGER_ANALYZE__ = () => handleAnalyze(blankJpeg);
      }
      return () => {
        delete window.__AFIA_TRIGGER_ANALYZE__;
      };
    }, [handleAnalyze]);
    ```
  - Notes: The early `return` in a `useEffect` body is valid. In production (`import.meta.env.DEV = false`), the early return means the cleanup function (`delete window.__AFIA_TRIGGER_ANALYZE__`) is never registered — this is intentional and not a cleanup leak, because the assignment never ran either. The `[handleAnalyze]` dependency array is unchanged. Vite DCE (dead code elimination) removes the unreachable branch at build time — this is not tree-shaking (which operates at module level). **Tasks 4, 5, 6, and 7 all modify `src/App.tsx` — batch into a single pass (see Task 4 batching note).**

- [ ] **Task 8: Move `playwright` and `sharp` to `devDependencies`**
  - File: `package.json`
  - Action:
    1. Move `"playwright": "^1.58.2"` from `dependencies` to `devDependencies`
    2. Move `"sharp": "^0.34.5"` from `dependencies` to `devDependencies`
  - Run: `npm install` to update `package-lock.json`
  - Notes: Do NOT remove the `overrides` section. Do NOT change versions. `sharp` is used in `scripts/` (training data tools), not in the PWA bundle or Worker.

- [ ] **Task 9: Type `getAdminScans` and `getAdminExport` in `apiClient.ts`**
  - File: `src/api/apiClient.ts`
  - Action:
    1. Add `AdminScan` interface before `getAdminScans` function:
      ```ts
      export interface AdminScan {
        scanId: string;
        timestamp: string;
        sku: string;
        fillPercentage: number;
        confidence: string;
        aiProvider: string;
        latencyMs: number;
        imageQualityIssues?: string[];
        isContribution?: boolean;
        localModelPrediction?: { percentage: number; confidence: string };
        reasoning?: string;
        localModelResult?: {
          fillPercentage: number;
          confidence: number;
          modelVersion: string;
          inferenceTimeMs: number;
        };
        llmFallbackUsed?: boolean;
      }
      ```
    2. Change `getAdminScans` return type: `Promise<any[]>` → `Promise<AdminScan[]>`
    3. `getAdminExport` hits `/admin/export` which returns training data — a **different shape** from `/admin/scans`. Do NOT reuse `AdminScan`. Instead add a minimal `AdminExport` interface:
      ```ts
      export interface AdminExport {
        scanId: string;
        imageUrl: string;
        sku: string;
        confirmedFillPct?: number;
        labelSource?: string;
        [key: string]: unknown; // export schema unverified — widen until endpoint is implemented
      }
      ```
      Change `getAdminExport` return type to `Promise<AdminExport[]>`. Add a comment: `// TODO: tighten AdminExport fields once /admin/export is implemented (currently 501 Not Implemented)`.
  - Notes: `AdminScan` mirrors `ScanMetadata` from `worker/src/storage/supabaseClient.ts` (client cannot import Worker types directly). Fields match what `getGlobalScans` maps from DB rows. If `AdminDashboard.tsx` accesses additional fields not listed, add them to the interface. Do not conflate the scan list shape with the export/training shape.

- [ ] **Task 10: Consolidate deployment docs into `DEPLOYMENT.md`**
  - Action:
    1. Read `DEPLOYMENT-INSTRUCTIONS.md` in full — this is the canonical base
    2. Read `DEPLOYMENT-GUIDE.md` and `DEPLOYMENT-CHECKLIST.md` — extract any steps/info NOT already in `DEPLOYMENT-INSTRUCTIONS.md`
    3. Create `DEPLOYMENT.md` at project root: `DEPLOYMENT-INSTRUCTIONS.md` content + any unique extracted content, with Afia branding throughout
    4. Delete `DEPLOYMENT-CHECKLIST.md`, `DEPLOYMENT-GUIDE.md`, `DEPLOYMENT-INSTRUCTIONS.md`
  - Notes: Git history preserves deleted files. No `.archived.md` renaming needed. Known unique content in the stale docs to watch for: `DEPLOYMENT-GUIDE.md` contains the live Worker URL (`https://Afia-worker.savola.workers.dev` — **flag this to Ahmed for confirmation before using it in `DEPLOYMENT.md` and Task 2 CSP**, as it may be stale). `DEPLOYMENT-CHECKLIST.md` contains notes about "R2 gracefully disabled" and "KV namespace configured in wrangler.toml" — verify whether these still reflect current state before including.

---

### Acceptance Criteria

- [ ] **AC 1:** Given the file `public/_headers` is inspected, then the `Content-Security-Policy` value contains `frame-ancestors 'none'` and `upgrade-insecure-requests`, `connect-src` specifies the exact production Worker URL (not `*.workers.dev`), a comment above the CSP line explains the hardcoded URL, and `X-Frame-Options: DENY` exists as a separate header line.

- [ ] **AC 2a:** Given an admin is authenticated (sessionStorage contains `afia_admin_session`), when `ModelVersionManager` mounts, then `getAdminToken()` returns the correct token and the `/admin/model/versions` request succeeds with 200.

- [ ] **AC 2b:** Given no active admin session, when `getAdminToken()` is called, then it returns an empty string (no crash).

- [ ] **AC 2c:** Given the updated test file, when `npm test` runs `ModelVersionManager.test.tsx`, then all tests pass.

- [ ] **AC 3:** Given a developer reads `hasValidAdminSession()` in `App.tsx`, when they see the function, then a JSDoc comment above it explains it is expiry-only and server enforces HMAC via `verifyAdminSession()`.

- [ ] **AC 4a:** Given an IP sends 5 failed password attempts to `POST /admin/auth` within 15 minutes, when a 6th attempt arrives, then the Worker returns 401 (identical to a normal failure — no lockout hint) without performing HMAC comparison. **Testability**: unit test must inject a mock for the HMAC comparison function and assert it was NOT called on the 6th attempt — the 401 response body alone is insufficient to distinguish lockout-401 from wrong-password-401.

- [ ] **AC 4b:** Given an IP is locked out, when a correct password is submitted, then the lockout still blocks the request (correct password does not bypass lockout).

- [ ] **AC 4c:** Given a successful login, when the token is issued, then the `auth_lockout:{ip}` KV key is deleted, resetting the failure counter.

- [ ] **AC 4d:** Given `CF-Connecting-IP` header is absent, when `POST /admin/auth` is called, then the global rate-limit middleware returns HTTP 400 before the auth handler runs (the `'unknown'` fallback in `handleAdminAuth` is technically unreachable but kept as a defensive safety net — verify no crash if somehow reached).

- [ ] **AC 5:** Given a user captures a photo, when the shutter sound plays, then an `AudioContext` is created, used, and closed ~200ms after the second oscillator's scheduled stop — preventing context accumulation across multiple captures.

- [ ] **AC 6:** Given the app is in IDLE state with `isAdminMode = false`, when the IDLE JSX renders, then no `<BottleSelector>` component is present in the render tree (removed dead code).

- [ ] **AC 7a:** Given the app is built in production mode (`npm run build`), then Vite DCE removes the unreachable `import.meta.env.DEV` branch. Verification: run `npm run build`, then inspect the output JS bundle(s) in `dist/assets/` — search for the string `__AFIA_TEST_MODE__` within the bundle text. Absence confirms DCE. Note: a grep for the string is a reasonable proxy but not definitive if the minifier renames identifiers — if minification is disabled (e.g., `build.minify: false`), a bundle content search is fully reliable. The DCE mechanism is property of `import.meta.env.DEV` being replaced with `false` at build time, making the branch statically dead; the minifier then strips it.

- [ ] **AC 7b:** Given the app runs in development mode (`npm run dev`), when `window.__AFIA_TEST_MODE__ = true` is set in DevTools, then `window.__AFIA_TRIGGER_ANALYZE__` is registered and callable.

- [ ] **AC 8:** Given `package.json` is inspected, then `playwright` and `sharp` appear under `devDependencies` only, not under `dependencies`. `npm install` completes without errors.

- [ ] **AC 9:** Given TypeScript strict-mode compilation (`npm run build`), when `getAdminScans` return values are used in `AdminDashboard.tsx`, then no `any` type escapes — accessing `.scanId`, `.fillPercentage`, `.confidence`, etc. on `AdminScan` items is type-safe. For `getAdminExport`, return type is `Promise<AdminExport[]>`; fields defined on `AdminExport` are typed; accessing undefined fields yields `unknown` (requires narrowing at call site). `npm run build` completes with zero TypeScript errors.

- [ ] **AC 10:** Given the project root is inspected, then `DEPLOYMENT.md` exists and contains complete deployment instructions for both Worker and PWA. `DEPLOYMENT-CHECKLIST.md`, `DEPLOYMENT-GUIDE.md`, and `DEPLOYMENT-INSTRUCTIONS.md` do not exist.

---

## Additional Context

### Dependencies

- No new npm packages required
- No new Cloudflare KV namespaces or R2 bindings required
- No Supabase schema migrations required
- Production Worker URL needed for Task 2 (CSP hardening) — read from `DEPLOYMENT-INSTRUCTIONS.md`

### Testing Strategy

- **Task 1 (auth lockout):** Write unit test in `worker/src/__tests__/adminAuth.test.ts` — mock `RATE_LIMIT_KV` with a miniflare-compatible mock or plain object mock. Test cases required:
  - 5 failures → locked, 6th attempt returns 401; **mock the HMAC function and assert it was NOT called** on the 6th attempt (response body alone cannot distinguish lockout-401 from wrong-password-401)
  - **AC 4b**: IP is locked (≥5 failures), correct password submitted → still returns 401 (lockout blocks before HMAC runs — assert HMAC mock not called)
  - Successful login clears lockout key (AC 4c) — assert `RATE_LIMIT_KV.delete` called with correct key
  - Locked IP probes again → timestamp array extended (window-extending behavior from spec step 5) — assert KV written even on locked requests
  - Missing IP → middleware returns 400 (integration-level, not unit-level — note in test file)
- **Task 3 (ModelVersionManager):** Update existing `ModelVersionManager.test.tsx` mock — change `localStorage` spy to `sessionStorage` spy with `afia_admin_session` key. Run `npm test`.
- **Tasks 4-7 (App.tsx):** No automated tests needed. Verify manually: dead code removal = no visible change; test hooks = check `window.__AFIA_TEST_MODE__` in prod build console; AudioContext = no DevTools AudioContext warning after 10 rapid captures.
- **Tasks 2, 8, 9, 10:** Verify by inspection (`npm run build` for TS errors, package.json diff, headers file diff, file system check).

### Notes

- `style-src 'unsafe-inline'` kept — removing requires full inline style audit; low security risk (no JS execution possible)
- `script-src 'unsafe-inline'` kept — known debt, documented in CSP comment. Nonce approach deferred.
- Auth lockout uses the same `RATE_LIMIT_KV` namespace as rate limiting and scan caching. Key prefixes (`ratelimit:`, `scan:`, `quota:`, `auth_lockout:`) ensure no collisions.
- `getGlobalScans` `any` in `.map((row: any) => ...)` is a known remaining issue — excluded from this spec (Worker-side, lower risk). Track separately.
- Task 1 lockout placement clarification: read body first, validate `body.password` is a string, THEN check lockout, THEN compare password. This avoids lockout triggering on malformed requests (which are rejected before lockout anyway, but ordering keeps the code intent clear).
