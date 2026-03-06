---
story_id: "2.8"
story_key: "2-8-image-quality-issue-detection"
epic: 2
status: done
created: "2026-03-06"
author: "Ahmed"
---

# Story 2.8: Image Quality Issue Detection

## Story Information

| Field | Value |
|-------|-------|
| **Epic** | Epic 2: Result Display & Feedback |
| **Story ID** | 2.8 |
| **Story Key** | 2-8-image-quality-issue-detection |
| **Status** | done |
| **Priority** | High - Quality Control |
| **Estimation** | 1-2 hours |
| **Dependencies** | Story 1.9 (✅ Gemini Integration) |

## User Story

**As a** user,
**I want** to be notified if my photo has quality issues,
**So that** I can retake it and get a better estimate.

## Acceptance Criteria

### Primary AC

**Given** the AI analysis detects image quality problems
**When** the response includes quality issues (blur, poor lighting, obstruction)
**Then**:
1. I see a specific message describing the issue
2. I see a "Retake Photo" button
3. The message uses plain language:
   - "Image is too blurry — try holding the phone steady"
   - "Lighting is poor — try near a window or light"
   - "Bottle is partially obscured — ensure full bottle is visible"
   - "Strong reflection detected — try a different angle"
4. Tapping "Retake Photo" returns me to the camera viewfinder

### Implementation

**Quality Messages:**
```typescript
const qualityMessages: Record<string, string> = {
  blur: "Image is too blurry — try holding the phone steady",
  poor_lighting: "Lighting is poor — try near a window or light",
  obstruction: "Bottle is partially obscured — ensure full bottle is visible",
  reflection: "Strong reflection detected — try a different angle",
};
```

**Quality Issues Banner:**
```tsx
{hasQualityIssues && (
  <div className="quality-issues-banner" role="alert">
    <p className="quality-issues-title">Image quality issues detected:</p>
    <ul className="quality-issues-list">
      {result.imageQualityIssues!.map((issue) => (
        <li key={issue}>
          {qualityMessages[issue] ?? issue}
        </li>
      ))}
    </ul>
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

**Image quality issue detection implemented with user-friendly messages**
