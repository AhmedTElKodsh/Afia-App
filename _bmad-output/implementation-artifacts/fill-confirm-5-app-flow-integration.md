---
story_id: "FC.5"
story_key: "fill-confirm-5-app-flow-integration"
epic: "FC - Fill Confirmation Screen"
status: ready-for-dev
created: "2026-04-10"
author: "Ahmed"
---

# Story FC.5: App Flow Integration — `FILL_CONFIRM` State

## Story Information

| Field | Value |
|---|---|
| **Epic** | Epic FC: Fill Confirmation Screen |
| **Story ID** | FC.5 |
| **Story Key** | fill-confirm-5-app-flow-integration |
| **Status** | ready-for-dev |
| **Dependencies** | FC.4 (`FillConfirmScreen` component) must be complete |

## User Story

**As a** user,
**I want** to be automatically taken to the fill confirmation screen after the AI finishes analyzing my photo,
**So that** I can verify and adjust the estimate before my volume and nutrition results are calculated and displayed.

## Acceptance Criteria

**AC1 — FILL_CONFIRM state exists**
Given the `AppState` type is inspected
When it is read
Then `"FILL_CONFIRM"` is a valid member of the union type

**AC2 — Transition: API_PENDING → FILL_CONFIRM**
Given the app is in `API_PENDING` state and the API call completes successfully
When `analyzeBottle` resolves with an `AnalysisResult`
Then `appState` transitions to `"FILL_CONFIRM"` (not `"API_SUCCESS"`)
And `capturedImage` is still available (not cleared)
And `result` is stored in state

**AC3 — FillConfirmScreen renders in FILL_CONFIRM state**
Given `appState === "FILL_CONFIRM"` and `result !== null` and `capturedImage !== null`
When the switch renders
Then `<FillConfirmScreen>` is rendered with correct props:
  - `imageDataUrl={capturedImage}`
  - `aiEstimatePercent={result.fillPercentage}`
  - `bottleCapacityMl={bottle.totalVolumeMl}`
  - `bottleTopPct` and `bottleBottomPct` (see Dev Notes for defaults)
  - `onConfirm={handleFillConfirm}`
  - `onRetake={handleRetake}`

**AC4 — Transition: FILL_CONFIRM → API_SUCCESS**
Given the user taps Confirm on the fill confirmation screen with `waterMl=880`
When `handleFillConfirm(880)` is called
Then `confirmedWaterMl` is stored as `880`
And `appState` transitions to `"API_SUCCESS"`
And `ResultDisplay` receives `confirmedWaterMl={880}`

**AC5 — ResultDisplay uses confirmedWaterMl**
Given `confirmedWaterMl=880` is passed to `ResultDisplay`
When `ResultDisplay` calculates volumes
Then it uses `880` directly (not `result.fillPercentage * bottleCapacityMl / 100`)

**AC6 — Low confidence also goes through FILL_CONFIRM**
Given the API returns `confidence: "low"`
When `analyzeBottle` resolves
Then `appState` still transitions to `"FILL_CONFIRM"` (not `"API_LOW_CONFIDENCE"`)
And after user confirms, it transitions to `"API_LOW_CONFIDENCE"` (to preserve existing low-confidence UI)

**AC7 — Retake from FILL_CONFIRM goes to CAMERA_ACTIVE**
Given `appState === "FILL_CONFIRM"` and user taps Retake
When `handleRetake` is called
Then `appState` transitions to `"CAMERA_ACTIVE"`
And `capturedImage` is cleared
And `result` is cleared

**AC8 — Scan history still created before FILL_CONFIRM**
Given the API resolves successfully
When `appState` transitions to `"FILL_CONFIRM"`
Then the scan history entry has already been created (using `result.fillPercentage` as the initial estimate)
And it will be updated with the confirmed value when user proceeds to results

## Tasks / Subtasks

- [ ] **Task 1**: Add `"FILL_CONFIRM"` to `AppState` type
  - [ ] 1.1 Open `src/state/appState.ts`
  - [ ] 1.2 Add `| "FILL_CONFIRM"` to the `AppState` union type
  - [ ] 1.3 Add `confirmedWaterMl?: number` to `AnalysisResult` interface (optional — stores confirmed value)

- [ ] **Task 2**: Add `confirmedWaterMl` state to `App.tsx`
  - [ ] 2.1 Add `const [confirmedWaterMl, setConfirmedWaterMl] = useState<number | null>(null);`
  - [ ] 2.2 Add `handleFillConfirm` callback (see Dev Notes)
  - [ ] 2.3 Reset `confirmedWaterMl` to `null` in `handleRetake`

- [ ] **Task 3**: Modify `handleAnalyze` in `App.tsx`
  - [ ] 3.1 Change the success transition from `setAppState("API_SUCCESS")` / `setAppState("API_LOW_CONFIDENCE")` to `setAppState("FILL_CONFIRM")`
  - [ ] 3.2 Keep `setResult(analysisResult)` before the state transition
  - [ ] 3.3 Keep scan history creation as-is (before the state transition)

- [ ] **Task 4**: Add `FILL_CONFIRM` case to the `switch(appState)` in `App.tsx`
  - [ ] 4.1 Import `FillConfirmScreen` from `./components/FillConfirmScreen/FillConfirmScreen.tsx`
  - [ ] 4.2 Add the case (see Dev Notes for full JSX)
  - [ ] 4.3 Pass `bottleTopPct` and `bottleBottomPct` defaults (0.05 and 0.95)

- [ ] **Task 5**: Update `ResultDisplay` to accept and use `confirmedWaterMl`
  - [ ] 5.1 Add `confirmedWaterMl?: number` to `ResultDisplayProps` interface
  - [ ] 5.2 In volume calculation: use `confirmedWaterMl ?? result.remainingMl` as the `remainingMl` input
  - [ ] 5.3 Confirm existing tests still pass after this change

- [ ] **Task 6**: Update `App.tsx` to pass `confirmedWaterMl` to `ResultDisplay`

## Dev Notes

### Changes to `src/state/appState.ts`

```typescript
export type AppState =
  | "IDLE"
  | "CAMERA_ACTIVE"
  | "PHOTO_CAPTURED"
  | "API_PENDING"
  | "FILL_CONFIRM"     // ← ADD THIS
  | "API_SUCCESS"
  | "API_LOW_CONFIDENCE"
  | "API_ERROR"
  | "QR_MISMATCH"
  | "UNKNOWN_BOTTLE";
```

No changes needed to `AnalysisResult` or `BottleContext` interfaces.

### New State in `App.tsx`

Add alongside existing `useState` declarations:

```typescript
const [confirmedWaterMl, setConfirmedWaterMl] = useState<number | null>(null);
```

### Modified `handleAnalyze` in `App.tsx`

Current (lines ~73–112):
```typescript
// BEFORE:
setAppState(
  analysisResult.confidence === "low"
    ? "API_LOW_CONFIDENCE"
    : "API_SUCCESS",
);
```

Change to:
```typescript
// AFTER:
setAppState("FILL_CONFIRM");  // Always go through fill confirmation first
// confidence (low/high) is preserved in result.confidence — handled after confirmation
```

### New `handleFillConfirm` callback in `App.tsx`

Add alongside `handleRetake`:

```typescript
const handleFillConfirm = useCallback((waterMl: number) => {
  setConfirmedWaterMl(waterMl);
  // Transition to the appropriate state based on original confidence
  setAppState(
    result?.confidence === "low"
      ? "API_LOW_CONFIDENCE"
      : "API_SUCCESS"
  );
}, [result?.confidence]);
```

### Modified `handleRetake` in `App.tsx`

```typescript
const handleRetake = useCallback(() => {
  setCapturedImage(null);
  setResult(null);           // clear the old result
  setConfirmedWaterMl(null); // clear confirmed value
  setAppState("CAMERA_ACTIVE");
}, []);
```

### New `FILL_CONFIRM` Case in `switch(appState)`

Insert between `API_PENDING` and `API_ERROR` cases:

```tsx
case "FILL_CONFIRM":
  return result && capturedImage ? (
    <div className="app-with-nav">
      <AppControls isAdminMode={isAdminMode} />
      <Navigation currentView={currentView} onViewChange={setCurrentView} isAdminMode={isAdminMode} />
      <FillConfirmScreen
        imageDataUrl={capturedImage}
        aiEstimatePercent={result.fillPercentage}
        bottleCapacityMl={bottle.totalVolumeMl}
        bottleTopPct={0.05}      // TODO: replace with actual bottle geometry data when available
        bottleBottomPct={0.95}   // TODO: replace with actual bottle geometry data when available
        onConfirm={handleFillConfirm}
        onRetake={handleRetake}
      />
    </div>
  ) : null;
```

### Import to Add to `App.tsx`

```typescript
import { FillConfirmScreen } from "./components/FillConfirmScreen/FillConfirmScreen.tsx";
```

### Changes to `ResultDisplay.tsx`

Add optional prop:
```typescript
interface ResultDisplayProps {
  result: AnalysisResult;
  bottle: BottleEntry;
  capturedImage?: string;
  confirmedWaterMl?: number;   // ← ADD: from user confirmation
  onRetake: () => void;
}
```

Modify volume calculation (currently at line ~54):
```typescript
// BEFORE:
const volumes = calculateVolumes(
  result.fillPercentage,
  bottle.totalVolumeMl,
  bottle.geometry
);

// AFTER:
// If user confirmed a specific ml value, derive a fill% from it for calculateVolumes
// OR: pass waterMl directly if calculateVolumes is updated to accept ml directly
const effectiveFillPercent = confirmedWaterMl != null
  ? (confirmedWaterMl / bottle.totalVolumeMl) * 100
  : result.fillPercentage;

const volumes = calculateVolumes(
  effectiveFillPercent,
  bottle.totalVolumeMl,
  bottle.geometry
);
```

### Pass `confirmedWaterMl` from `App.tsx` to `ResultDisplay`

In the `API_SUCCESS` / `API_LOW_CONFIDENCE` case in App.tsx:
```tsx
<ResultDisplay
  result={result}
  bottle={bottle}
  capturedImage={capturedImage ?? undefined}
  confirmedWaterMl={confirmedWaterMl ?? undefined}  // ← ADD
  onRetake={handleRetake}
/>
```

### `bottleTopPct` / `bottleBottomPct` Defaults

The current bottle registry (`shared/bottleRegistry.ts`) does not have bounding box data. Use hardcoded defaults for now:
- `bottleTopPct = 0.05` (bottle starts 5% from the top of the image)
- `bottleBottomPct = 0.95` (bottle ends 5% from the bottom of the image)

Leave a `// TODO: source from bottle geometry when API provides bounding box` comment.

### Scan History Timing

The scan history entry is created before the state transition to `FILL_CONFIRM` (in `handleAnalyze`, using `analysisResult.fillPercentage` and `volumes.remaining.ml`). This is intentional — the scan is recorded when it happens. The confirmed value is a correction, not a re-scan. The `updateFeedback` call in `ResultDisplay` handles updating the stored record with the user's correction.

### TypeScript Strictness

`result` is `AnalysisResult | null`. In the `FILL_CONFIRM` case, guard with `result && capturedImage` before rendering (already shown above). TypeScript will narrow the type correctly.

### Project Structure Notes

```
src/
  state/
    appState.ts           ← MODIFY: add "FILL_CONFIRM" to AppState
  App.tsx                 ← MODIFY: add state, handlers, case
  components/
    FillConfirmScreen/
      FillConfirmScreen.tsx  ← FC.4 (prerequisite)
    ResultDisplay.tsx     ← MODIFY: add confirmedWaterMl prop
```

### References

- [Architecture FC §9 — Integration Points](../planning-artifacts/architecture-fill-confirm-screen.md#9-integration-points)
- [src/state/appState.ts] — AppState type
- [src/App.tsx lines 51–113] — handleAnalyze, state machine
- [src/App.tsx lines 268–350] — switch(appState) render block
- [src/components/ResultDisplay.tsx lines 17–22] — ResultDisplayProps interface

## Dev Agent Record

### Agent Model Used
_To be filled_

### Debug Log References
_None yet_

### Completion Notes List
_None yet_

### File List

**Files to MODIFY:**
- `src/state/appState.ts` (add `"FILL_CONFIRM"` to union)
- `src/App.tsx` (add state, callbacks, import, switch case)
- `src/components/ResultDisplay.tsx` (add `confirmedWaterMl` prop, update volume calc)

**Files to CREATE:**
- None (FillConfirmScreen component created in FC.4)
