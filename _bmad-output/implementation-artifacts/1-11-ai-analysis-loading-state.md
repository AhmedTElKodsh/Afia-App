---
story_id: "1.11"
story_key: "1-11-ai-analysis-loading-state"
epic: 1
status: done
created: "2026-03-06"
author: "Ahmed"
---

# Story 1.11: AI Analysis Loading State

## Story Information

| Field | Value |
|-------|-------|
| **Epic** | Epic 1: Core Scan Experience (End-to-End MVP) |
| **Story ID** | 1.11 |
| **Story Key** | 1-11-ai-analysis-loading-state |
| **Status** | done |
| **Priority** | High - UX |
| **Estimation** | 1 hour |
| **Dependencies** | Story 1.6 (✅ Photo Capture) |

## User Story

**As a** user,
**I want** to see clear feedback while my photo is being analyzed,
**So that** I know the app is working and approximately how long to wait.

## Acceptance Criteria

### Primary AC

**Given** I have tapped "Use Photo" on the preview
**When** the image is being compressed and sent to the API
**Then**:
1. I see a loading indicator with "Analyzing your bottle..."
2. The loading state shows for the duration of the API call
3. The loading state disappears when results arrive or an error occurs
4. Image compression completes in under 500ms
5. Expected wait time is shown: "This usually takes 3–8 seconds"

### Implementation

**ApiStatus Component (Loading State):**
```tsx
export function ApiStatus({ state: "loading" }: ApiStatusProps) {
  return (
    <div className="api-status" role="status" aria-live="polite">
      <div className="analyzing-animation" aria-hidden="true">
        <div className="bottle-outline">
          <div className="fill-wave" />
        </div>
      </div>
      <p className="analyzing-text">Analyzing your bottle...</p>
      <p className="text-caption text-secondary">
        This usually takes 3–8 seconds
      </p>
    </div>
  );
}
```

**State Flow:**
```
PHOTO_CAPTURED → [Use Photo] → API_PENDING → [Success/Error] → Result/Retry
```

**Performance:**
- Image compression: < 500ms (800px JPEG)
- API call: 3-8 seconds (Gemini/Groq)
- Total: 3.5-8.5 seconds

## Status

**Status**: done
**Created**: 2026-03-06
**Last Updated**: 2026-03-06

**Loading state implemented with ApiStatus component**
