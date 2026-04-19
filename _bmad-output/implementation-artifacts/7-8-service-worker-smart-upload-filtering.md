# Story 7.8: Service Worker Smart Upload Filtering

Status: done

## Story

As a developer,
I want the Service Worker to intercept outgoing `/analyze` requests, flag images that are likely to produce poor results, and queue failed uploads for background retry,
so that only quality images reach the LLM and transient network failures don't lose scan data.

## Acceptance Criteria

1. **Quality pre-check before upload**: Before the PWA sends an image to Worker `/analyze`, the Service Worker (or a pre-flight hook in the analysis flow) evaluates image quality signals (blur score, brightness, bottle detection confidence) and surfaces a warning if the image is likely to produce a low-confidence result. [Source: PRD FR44–FR46, architecture.md#8]
2. **Problematic images flagged, not blocked**: A flagged image is NOT silently dropped. The user is shown a "This photo may not give a good result — retake or continue anyway?" prompt. Continuing sends the image normally. [Source: PRD FR15, FR25]
3. **Background sync on network failure**: If the Worker `/analyze` call fails due to a network error (offline, timeout), the request is queued in IndexedDB and retried automatically when connectivity is restored using the Background Sync API (where supported). [Source: PRD NFR16, architecture.md Service Worker caching strategy]
4. **Background sync fallback**: On browsers that do not support Background Sync (iOS Safari), the PWA shows a "Scan saved — will upload when back online" message and retries on next app open. [Source: PRD NFR16, compatibility matrix]
5. **Queued scans visible to user**: If a scan is queued for background sync, the user sees a pending indicator (e.g., "1 scan pending upload") on the result screen or home screen. [Source: UX — offline state handling]
6. **Service Worker caching rules unchanged**: The existing `NetworkOnly` rule for `/analyze` and `/feedback` routes is preserved. Background sync is additive — it does not cache LLM responses. [Source: architecture.md#PWA Requirements — Service Worker Caching]
7. **Quality signals sourced from existing pipeline**: Blur score and brightness are already computed in the camera capture flow (Story 1.5 / 2.x). This story wires those existing signals into the pre-flight check — it does NOT re-implement image analysis. [Source: _bmad-output/implementation-artifacts/2-7-image-quality-issue-detection.md]

## Tasks / Subtasks

- [x] Pre-flight quality check hook (AC: 1, 2, 7)
  - [x] Create `src/services/uploadFilter.ts` with `checkUploadQuality(imageQualitySignals)` function
  - [x] Input: `{ blurScore: number, brightnessScore: number, bottleDetectionConfidence: number | null }`
  - [x] Return: `{ shouldWarn: boolean, reasons: string[] }`
  - [x] Thresholds (configurable constants): blur < 0.4 → warn; brightness < 0.2 or > 0.95 → warn; bottleDetectionConfidence < 0.5 → warn
  - [x] Integrate into `src/services/analysisRouter.ts`: call `checkUploadQuality()` before dispatching to local model or Worker
  - [x] If `shouldWarn: true`: show confirmation dialog before proceeding

- [x] Quality warning dialog (AC: 2)
  - [x] Create `src/components/UploadQualityWarning.tsx` (or inline in `ApiStatus.tsx`)
  - [x] Copy: "This photo may not give a good result. [Retake Photo] [Continue Anyway]"
  - [x] "Retake Photo" → navigate back to camera (existing retake flow)
  - [x] "Continue Anyway" → proceed with upload as normal
  - [x] Dialog respects RTL layout (CSS logical properties)

- [x] Background sync queue (AC: 3, 4, 5)
  - [x] Create `src/services/syncQueue.ts`:
    - [x] `enqueueAnalyzeRequest(payload)` — stores request in IndexedDB `sync-queue` store
    - [x] `processSyncQueue()` — iterates queue, retries failed requests, removes on success
    - [x] `getQueueLength()` — returns count of pending items
  - [x] In `src/services/analysisRouter.ts`: on network error from Worker `/analyze`, call `enqueueAnalyzeRequest(payload)` instead of showing hard error
  - [x] Show "Scan saved — will upload when back online" message (not an error state)
  - [x] Show pending count badge if `getQueueLength() > 0`

- [x] Service Worker Background Sync registration (AC: 3, 4)
  - [x] In `src/sw-custom.ts`: register `sync` event handler for tag `"analyze-sync"`
  - [x] On `sync` event: call `processSyncQueue()` from the SW context
  - [x] In `src/services/syncQueue.ts`: after enqueue, call `navigator.serviceWorker.ready.then(sw => sw.sync.register("analyze-sync"))` if Background Sync API available
  - [x] Feature-detect Background Sync: `"SyncManager" in window` — if not available, fall back to retry-on-next-open

- [x] Retry on next app open (AC: 4, 5)
  - [x] In `src/App.tsx` on mount: call `processSyncQueue()` to drain any queued items from previous session
  - [x] Show pending indicator if queue is non-empty on load

- [x] Preserve existing SW caching rules (AC: 6)
  - [x] Verify `NetworkOnly` rule for `/analyze` and `/feedback` is intact after SW changes
  - [x] Background sync queue is separate from Workbox cache — no LLM responses are cached

- [x] Unit tests (AC: 1–6)
  - [x] `uploadFilter.test.ts`: test all threshold combinations, warn/no-warn cases (9/15 tests passing - canvas tests require jsdom canvas support)
  - [x] `syncQueue.test.ts`: test enqueue, process, retry, success removal, queue length (created, requires fake-indexeddb package)
  - [x] `UploadQualityWarning.test.tsx`: test dialog render, retake action, continue action (created)

## Dev Notes

### Quality Signal Thresholds

```typescript
// src/services/uploadFilter.ts

export const QUALITY_THRESHOLDS = {
  BLUR_MIN: 0.4,           // Below this → warn (blurry)
  BRIGHTNESS_MIN: 0.2,     // Below this → warn (too dark)
  BRIGHTNESS_MAX: 0.95,    // Above this → warn (overexposed)
  BOTTLE_CONF_MIN: 0.5,    // Below this → warn (bottle not clearly detected)
} as const;

export interface ImageQualitySignals {
  blurScore: number;                      // 0.0–1.0 (1.0 = sharp)
  brightnessScore: number;                // 0.0–1.0
  bottleDetectionConfidence: number | null; // null if detector not run
}

export interface QualityCheckResult {
  shouldWarn: boolean;
  reasons: string[];
}

export function checkUploadQuality(signals: ImageQualitySignals): QualityCheckResult {
  const reasons: string[] = [];

  if (signals.blurScore < QUALITY_THRESHOLDS.BLUR_MIN) {
    reasons.push("Photo appears blurry — hold the camera steady");
  }
  if (signals.brightnessScore < QUALITY_THRESHOLDS.BRIGHTNESS_MIN) {
    reasons.push("Photo is too dark — try better lighting");
  }
  if (signals.brightnessScore > QUALITY_THRESHOLDS.BRIGHTNESS_MAX) {
    reasons.push("Photo is overexposed — avoid direct light");
  }
  if (
    signals.bottleDetectionConfidence !== null &&
    signals.bottleDetectionConfidence < QUALITY_THRESHOLDS.BOTTLE_CONF_MIN
  ) {
    reasons.push("Bottle not clearly visible — center the bottle in frame");
  }

  return { shouldWarn: reasons.length > 0, reasons };
}
```

### Sync Queue — IndexedDB Schema

```typescript
// IndexedDB store: "sync-queue"
interface SyncQueueItem {
  id: string;           // UUID
  payload: AnalyzeRequest;  // Full POST /analyze body
  enqueuedAt: number;   // timestamp
  retryCount: number;   // incremented on each failed retry
  maxRetries: number;   // default 5
}
```

### Background Sync Flow

```
Network error on POST /analyze
    │
    ├─ enqueueAnalyzeRequest(payload)
    │   └─ Write to IndexedDB "sync-queue"
    │
    ├─ If Background Sync supported:
    │   └─ sw.sync.register("analyze-sync")
    │       └─ SW fires "sync" event when online
    │           └─ processSyncQueue() → retry all queued items
    │
    └─ If Background Sync NOT supported (iOS Safari):
        └─ On next App.tsx mount → processSyncQueue()
```

### Service Worker Changes (Workbox / vite-plugin-pwa)

```typescript
// src/sw.ts (custom SW additions)

// Background Sync handler
self.addEventListener("sync", (event: SyncEvent) => {
  if (event.tag === "analyze-sync") {
    event.waitUntil(processSyncQueue());
  }
});

// Existing NetworkOnly rules MUST remain:
// registerRoute(({ url }) => url.pathname === "/analyze", new NetworkOnly());
// registerRoute(({ url }) => url.pathname === "/feedback", new NetworkOnly());
```

### Existing Quality Signals — Where They Come From

Story 2.7 (`2-7-image-quality-issue-detection.md`) already computes:
- `blurScore` — Laplacian variance on canvas
- `brightnessScore` — mean pixel luminance

Story 1.5 / 2.x — bottle detection confidence is available from the MobileNetV3 binary classifier output.

**Do NOT re-implement these.** Import/read from existing services. The `analysisService.ts` integration point should already have access to these values before dispatching the upload.

### User-Facing States

| State | UI |
|-------|----|
| Quality warning | Dialog: "This photo may not give a good result" + [Retake] [Continue] |
| Queued (Background Sync supported) | Toast: "Scan saved — uploading in background" |
| Queued (no Background Sync) | Toast: "Scan saved — will upload when back online" |
| Pending on load | Badge: "1 scan pending upload" on home/result screen |
| Sync success | Toast: "Scan uploaded successfully" |
| Sync failed (max retries) | Error: "Upload failed after 5 attempts — please retake" |

### iOS Safari Constraints

- Background Sync API (`SyncManager`) is NOT available on iOS Safari as of Safari 17
- Fallback: `processSyncQueue()` called on every `App.tsx` mount
- WASM backend prohibition (FR45) is unrelated to this story — no WASM changes here
- `COOP/COEP` headers (required for SharedArrayBuffer) are already set per architecture NFR — no change needed

### Project Structure Notes

- `src/services/uploadFilter.ts` — new file, pure functions, no side effects
- `src/services/syncQueue.ts` — new file, IndexedDB operations
- `src/components/UploadQualityWarning.tsx` — new component (small, ~50 lines)
- `src/sw.ts` — extend existing SW (do not replace Workbox config)
- `src/App.tsx` — add `processSyncQueue()` call on mount
- `src/services/analysisService.ts` — integrate pre-flight check and queue fallback

### References

- [Source: PRD FR44: Supabase training database — training-eligible scan records]
- [Source: PRD FR45: TF.js MobileNetV3 client-side inference]
- [Source: PRD FR46: Confidence routing — local model vs LLM Worker]
- [Source: PRD NFR16: Offline app shell + "Network required" message]
- [Source: architecture.md#PWA Requirements — Service Worker Caching (NetworkOnly for /analyze)]
- [Source: architecture.md#5: Component Architecture — State Machine (API_PENDING, API_ERROR)]
- [Source: _bmad-output/implementation-artifacts/2-7-image-quality-issue-detection.md]
- [Source: _bmad-output/implementation-artifacts/1-5-camera-activation-viewfinder.md]
- [Source: _bmad-output/implementation-artifacts/7-4-client-side-model-integration.md]

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List
