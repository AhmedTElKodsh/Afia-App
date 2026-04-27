---
story_id: "5.4"
story_key: "5-4-admin-image-upload"
epic: 5
status: ready-for-dev
created: "2026-04-27"
author: "Ahmed"
---

# Story 5.4: Admin Image Upload

## Story Information

| Field | Value |
|-------|-------|
| **Epic** | Epic 5: Admin Dashboard (epics.md: Epic 6) |
| **Story ID** | 5.4 |
| **Story Key** | 5-4-admin-image-upload |
| **Status** | ready-for-dev |
| **Priority** | High — training dataset seeding |
| **Estimation** | 2–3 hours |
| **Dependencies** | Story 5.1 (✅ Dashboard Layout), Story 5.3 (✅ Admin Auth) |

---

## User Story

**As** Ahmed (admin),  
**I want** to upload labeled bottle images directly via the admin dashboard,  
**So that** I can seed the training dataset with high-quality ground-truth examples without waiting for user scans.

---

## Current State (Critical — Read Before Implementing)

The frontend UI and API client are **already complete**. The worker endpoint is a **501 stub**. This story implements **worker backend only**.

| Layer | File | State |
|-------|------|-------|
| UI | `src/components/AdminUpload.tsx` | ✅ Complete — do NOT touch |
| API client | `src/api/apiClient.ts` → `adminUploadImage()` | ✅ Complete — do NOT touch |
| Worker route | `worker/src/index.ts` → `POST /admin/upload` | ❌ Returns 501 stub |
| Worker storage | `worker/src/storage/supabaseClient.ts` | ❌ Missing `storeAdminUpload()` |

The UI sends `FormData` with fields: `file`, `sku`, `fillPercentage`, `augmentationType`.

---

## Acceptance Criteria

### AC1 — Worker validates the upload request
**Given** a POST to `/admin/upload`  
**When** auth or payload is invalid  
**Then** return appropriate error:
- No/invalid Bearer token → 401 `UNAUTHORIZED`
- Missing `file` → 400 `MISSING_FILE`
- File > 4MB → 413 `FILE_TOO_LARGE` (enforce 4MB; UI displays 5MB but server is authoritative)
- MIME type not `image/jpeg` or `image/png` → 400 `INVALID_FILE_TYPE`
- `sku` not in bottleRegistry → 400 `INVALID_SKU`
- `fillPercentage` outside 0–100 → 400 `INVALID_FILL_PERCENTAGE`

### AC2 — Image stored in Supabase Storage
**Given** a valid upload  
**When** the Worker processes it  
**Then** image is stored in Supabase Storage `scans` bucket at path:  
`admin/{sku}/{YYYY-MM-DD}/admin-{uuid}.jpg`  
(mirrors the existing `raw/{sku}/{date}/{scanId}.jpg` pattern in `storeScan()`)

### AC3 — Scan row inserted with admin_upload source
**Given** image stored successfully  
**When** the Worker inserts into `scans` table  
**Then** row contains:
```json
{
  "id": "admin-{uuid}",
  "sku": "filippo-berio-500ml",
  "image_url": "admin/{sku}/{date}/admin-{uuid}.jpg",
  "local_model_result": null,
  "local_model_confidence": null,
  "local_model_version": null,
  "local_model_inference_ms": null,
  "llm_fallback_used": false,
  "local_model_prediction": {},
  "llm_fallback_prediction": {
    "percentage": 65,
    "confidence": "high",
    "provider": "admin_upload"
  },
  "client_metadata": {
    "source": "admin_upload",
    "augmentation_type": "none",
    "is_contribution": false,
    "timestamp": "2026-04-27T..."
  }
}
```

### AC4 — Training sample inserted with label_confidence 1.0
**Given** scan row inserted  
**When** training_samples upsert runs  
**Then** row contains:
```json
{
  "scan_id": "admin-{uuid}",
  "image_url": "admin/{sku}/{date}/admin-{uuid}.jpg",
  "sku": "filippo-berio-500ml",
  "confirmed_fill_pct": 65,
  "label_source": "admin_upload",
  "label_confidence": 1.0,
  "augmented": false,
  "split": "train"
}
```
Split assignment: same `assignSplit()` logic used by existing `upsertTrainingSample()` (80/10/10 random).

### AC5 — Failures are non-blocking
**Given** Supabase Storage upload succeeds but DB insert fails  
**When** the error occurs  
**Then** error is logged to Worker console; response to client is still 500 (do not silently succeed if storage fails)

**Given** `training_samples` insert fails  
**When** the error occurs  
**Then** error is logged but the 200 response is still returned (training write is async best-effort, mirrors existing `upsertTrainingSample` error policy)

### AC6 — Success response
**Given** all writes complete  
**When** Worker responds  
**Then**: `200 { ok: true, scanId: "admin-{uuid}" }`

### AC7 — Upload appears in scan list
**Given** the scan row has `client_metadata.source = "admin_upload"`  
**When** `getGlobalScans()` maps the result  
**Then** the returned `ScanMetadata` includes `source: "admin_upload"` so the AdminDashboard scan list can render an "Admin Upload" badge.

---

## Implementation Plan

### 1. Update `worker/src/storage/supabaseClient.ts`

**A. Extend `ScanMetadata` interface** — add optional `source` field:
```ts
export interface ScanMetadata {
  // ... existing fields ...
  source?: "admin_upload" | "user_scan" | "community_contribution";
}
```

**B. Update `TrainingSampleData.labelSource`** — add `"admin_upload"`:
```ts
export interface TrainingSampleData {
  // ...
  labelSource: "admin_correction" | "admin_verified" | "user_feedback" | "admin_upload";
  // ...
}
```

**C. Update `getGlobalScans()` mapping** — expose `source` from `client_metadata`:
```ts
source: (clientMetadata?.source as string) as ScanMetadata["source"] | undefined,
```

**D. Add `storeAdminUpload()` function**:
```ts
export async function storeAdminUpload(
  env: Env,
  scanId: string,
  imageBuffer: ArrayBuffer,
  sku: string,
  fillPercentage: number,
  augmentationType: string
): Promise<void>
```
Steps inside:
1. Upload `imageBuffer` to Supabase Storage `scans` bucket at `admin/{sku}/{date}/{scanId}.jpg`
   - Use `withRetry()` — already available in this file
   - Content-type: `image/jpeg`
2. Insert `scans` row (see AC3 schema above)
   - Use `withRetry()`
3. Fire-and-forget: call `upsertTrainingSample()` with `label_source: "admin_upload"`, `label_confidence: 1.0`, `augmented: false`
   - Wrap in `.catch(err => console.error(...))` — do not await, mirrors existing pattern

### 2. Update `worker/src/index.ts`

Replace the 501 stub at line ~241:
```ts
// Admin upload — not yet implemented
app.post("/admin/upload", async (c) => {
  if (!await verifyAdminSession(c)) { ... }
  return c.json({ error: "Not implemented", code: "NOT_IMPLEMENTED" }, 501);
});
```

With full implementation:
```ts
app.post("/admin/upload", async (c) => {
  if (!await verifyAdminSession(c)) {
    return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: "Invalid form data", code: "BAD_REQUEST" }, 400);
  }

  const file = formData.get("file") as File | null;
  const sku = formData.get("sku") as string | null;
  const fillPctRaw = formData.get("fillPercentage") as string | null;
  const augType = (formData.get("augmentationType") as string) || "none";

  // Validate
  if (!file) return c.json({ error: "Missing file", code: "MISSING_FILE" }, 400);
  if (!["image/jpeg", "image/png"].includes(file.type))
    return c.json({ error: "Invalid file type", code: "INVALID_FILE_TYPE" }, 400);
  if (file.size > 4 * 1024 * 1024)
    return c.json({ error: "File too large (max 4MB)", code: "FILE_TOO_LARGE" }, 413);
  if (!sku || !getBottleBySku(sku))
    return c.json({ error: "Invalid SKU", code: "INVALID_SKU" }, 400);
  const fillPct = parseFloat(fillPctRaw ?? "");
  if (!Number.isFinite(fillPct) || fillPct < 0 || fillPct > 100)
    return c.json({ error: "fillPercentage must be 0–100", code: "INVALID_FILL_PERCENTAGE" }, 400);

  const scanId = `admin-${crypto.randomUUID()}`;
  const imageBuffer = await file.arrayBuffer();

  try {
    await storeAdminUpload(c.env, scanId, imageBuffer, sku, fillPct, augType);
  } catch (err) {
    console.error("[admin-upload] Storage failed:", err);
    return c.json({ error: "Storage failed", code: "INTERNAL_ERROR" }, 500);
  }

  return c.json({ ok: true, scanId });
});
```

**Required imports to add at top of `index.ts`:**
- `storeAdminUpload` from `./storage/supabaseClient`
- `getBottleBySku` from `./bottleRegistry` (already re-exported from shared)

---

## File Change Summary

| File | Change |
|------|--------|
| `worker/src/storage/supabaseClient.ts` | Add `source?` to `ScanMetadata`; add `"admin_upload"` to `TrainingSampleData.labelSource`; update `getGlobalScans()` mapping; add `storeAdminUpload()` |
| `worker/src/index.ts` | Replace 501 stub with full `/admin/upload` handler; add imports |
| `src/components/AdminUpload.tsx` | **Do NOT modify** |
| `src/api/apiClient.ts` | **Do NOT modify** |

---

## Guardrails — Do Not Break

- `storeScan()` in `supabaseClient.ts` — regular user scan flow; do not touch
- `upsertTrainingSample()` — reuse as-is; only call it from `storeAdminUpload()`
- `verifyAdminSession()` in `admin.ts` — reuse exactly as other admin routes do
- `withRetry()` — private helper in `supabaseClient.ts`; reuse it inside `storeAdminUpload()`
- The existing `TrainingSampleData` callers (`adminCorrect.ts`, etc.) only use existing label sources; adding `"admin_upload"` to the union is backward-compatible

---

## Architecture Patterns to Follow

- **Supabase Storage bucket**: `scans` (same bucket as `storeScan`)
- **Image path prefix**: `admin/` (distinguishes from `raw/` user scans)
- **Hono framework**: All Worker routes use `app.post()`, `c.req`, `c.json()`, `c.env`
- **Error response shape**: `{ error: string, code: string }` — consistent with all other Worker routes
- **Auth pattern**: `if (!await verifyAdminSession(c)) return 401` — same as `handleGetScans`, `adminCorrect`, `adminRerunLlm`
- **scanId format for admin**: `admin-{uuid}` prefix distinguishes from user scan UUIDs

---

## Test Requirements

Add test file: `worker/src/__tests__/adminUpload.test.ts`

Test cases (use existing test patterns from `adminCorrect.test.ts` as reference):
1. Returns 401 if no Bearer token
2. Returns 400 if file missing
3. Returns 413 if file > 4MB  
4. Returns 400 if MIME not jpeg/png
5. Returns 400 if SKU not in bottleRegistry
6. Returns 400 if fillPercentage out of range (e.g., 150)
7. Returns 200 `{ ok: true, scanId }` on valid upload
8. Verifies `storeAdminUpload()` called with correct args on success

Mock pattern: mock `verifyAdminSession` to return true; mock `storeAdminUpload` to resolve.

---

## Status

**Status**: review  
**Created**: 2026-04-27  
**Completed**: 2026-04-27  
**Note**: Worker backend implemented. 8/8 tests pass. 70/70 total worker tests pass.
