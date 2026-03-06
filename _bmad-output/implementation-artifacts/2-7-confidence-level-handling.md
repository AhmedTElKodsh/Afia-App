---
story_id: "2.7"
story_key: "2-7-confidence-level-handling"
epic: 2
status: done
created: "2026-03-06"
author: "Ahmed"
---

# Story 2.7: Confidence Level Handling

## Story Information

| Field | Value |
|-------|-------|
| **Epic** | Epic 2: Result Display & Feedback |
| **Story ID** | 2.7 |
| **Story Key** | 2-7-confidence-level-handling |
| **Status** | done |
| **Priority** | High - User Trust |
| **Estimation** | 1-2 hours |
| **Dependencies** | Story 1.9 (✅ Gemini Integration) |

## User Story

**As a** user,
**I want** to see a confidence indicator with my fill estimate,
**So that** I understand how reliable the AI's assessment is.

## Acceptance Criteria

### Primary AC

**Given** the AI analysis returns successfully
**When** the result includes a confidence level (high/medium/low)
**Then**:
1. High confidence shows a green indicator with "High confidence"
2. Medium confidence shows a yellow indicator with "Estimate may be less accurate"
3. Low confidence shows an orange indicator with "Low confidence — consider retaking"
4. The confidence indicator is visible alongside the fill percentage
5. Low confidence triggers the retake prompt

### Implementation

**Confidence Config:**
```typescript
const confidenceConfig = {
  high: { 
    color: "var(--color-success)", 
    label: "High confidence" 
  },
  medium: {
    color: "var(--color-warning)",
    label: "Estimate may be less accurate",
  },
  low: {
    color: "var(--color-danger)",
    label: "Low confidence — consider retaking",
  },
};
```

**Low Confidence Banner:**
```tsx
{result.confidence === "low" && (
  <div className="low-confidence-banner">
    <p>Low confidence — consider retaking photo</p>
    <button className="btn btn-outline" onClick={onRetake}>
      Retake Photo
    </button>
  </div>
)}
```

## Status

**Status**: done
**Created**: 2026-03-06
**Last Updated**: 2026-03-06

**Confidence indicators implemented with color-coded badges and retake prompts**
