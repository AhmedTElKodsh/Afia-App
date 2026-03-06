---
story_id: "4.2"
story_key: "4-2-feedback-collection-system"
epic: 4
status: done
created: "2026-03-06"
author: "Ahmed"
---

# Story 4.2: Feedback Collection System

## Story Information

| Field | Value |
|-------|-------|
| **Epic** | Epic 4: Feedback & Improvement |
| **Story ID** | 4.2 |
| **Story Key** | 4-2-feedback-collection-system |
| **Status** | done |
| **Priority** | High - Model Improvement |
| **Estimation** | 2-3 hours |
| **Dependencies** | Story 4.1 (✅ Result Display) |

## User Story

**As a** product owner,
**I want** users to rate the AI's accuracy and provide corrections,
**So that** we can improve the model and validate scan quality.

## Acceptance Criteria

### Primary AC

**Given** the user has received their results
**When** they interact with the feedback prompt
**Then**:
1. They see 4 rating options: "About right", "Too high", "Too low", "Way off"
2. Tapping "About right" submits feedback immediately (1-tap)
3. Tapping other options shows a slider for corrected estimate
4. The slider allows adjustment from 1-99%
5. Submitting feedback shows a thank you message
6. Feedback is sent to Worker /feedback endpoint

### Implementation

**Feedback Request:**
```typescript
POST /feedback
{
  "scanId": "uuid-here",
  "accuracyRating": "about_right" | "too_high" | "too_low" | "way_off",
  "llmFillPercentage": 75,
  "correctedFillPercentage": 80,  // Optional
  "responseTimeMs": 5000
}
```

**Feedback Component:**
```tsx
export function FeedbackPrompt({
  scanId,
  fillPercentage,
  resultTimestamp,
  onSubmitted,
}: FeedbackPromptProps) {
  const [rating, setRating] = useState<AccuracyRating | null>(null);
  const [sliderValue, setSliderValue] = useState(fillPercentage);
  const [submitting, setSubmitting] = useState(false);

  const handleRating = async (selectedRating: AccuracyRating) => {
    if (selectedRating === "about_right") {
      // 1-tap submit for happy path
      await doSubmit(selectedRating);
    } else {
      setRating(selectedRating);  // Show slider
    }
  };

  const doSubmit = async (ratingToSubmit: AccuracyRating, corrected?: number) => {
    const responseTimeMs = Date.now() - resultTimestamp;
    await submitFeedback(scanId, ratingToSubmit, fillPercentage, corrected, responseTimeMs);
    onSubmitted();
  };

  return (
    <div className="feedback-prompt card">
      <h3>Was this estimate accurate?</h3>
      
      {/* Rating buttons */}
      <div className="rating-grid">
        {["About right", "Too high", "Too low", "Way off"].map((label) => (
          <button onClick={() => handleRating(label)}>{label}</button>
        ))}
      </div>
      
      {/* Slider for corrections */}
      {showSlider && (
        <div className="slider-section">
          <input
            type="range"
            min="1"
            max="99"
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
          />
          <span>{sliderValue}%</span>
          <button onClick={handleSubmitWithSlider}>Submit Feedback</button>
        </div>
      )}
    </div>
  );
}
```

**Validation (Worker):**
```typescript
// In worker/src/feedback.ts
const validRatings = ["about_right", "too_high", "too_low", "way_off"];

if (!validRatings.includes(accuracyRating)) {
  return c.json({ error: "Invalid accuracyRating" }, 400);
}

// Validate consistency
const validation = validateFeedback(llmFillPercentage, {
  accuracyRating,
  correctedFillPercentage,
  responseTimeMs,
});

// Returns:
{
  validationStatus: "accepted" | "flagged" | "rejected",
  validationFlags: string[],
  confidenceWeight: number,
  trainingEligible: boolean,
}
```

## Status

**Status**: done
**Created**: 2026-03-06
**Last Updated**: 2026-03-06

**Feedback collection system implemented with rating buttons and correction slider**
