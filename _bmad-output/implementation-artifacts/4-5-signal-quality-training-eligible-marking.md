# Story 4.5: Signal Quality & Training-Eligible Marking

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a system,
I want to automatically identify high-quality training pairs,
so that I can fine-tune future models with clean data without manual filtering.

## Acceptance Criteria

1. **Layer 1 Validation Logic**: The Worker implements logic to check feedback consistency (e.g., response time > 3s, no contradictory ratings). [Source: epics.md#Story 4.5] - ✅ DONE
2. **Training-Eligible Flag**: Scan records that pass validation are marked `is_training_eligible: true` in the Supabase `scans` table. [Source: prd.md#FR33] - ✅ DONE
3. **Consistency Checks**: The system flags contradictory feedback (e.g., rating "Too high" but providing a corrected value *higher* than the AI estimate). [Source: epics.md#Story 4.5] - ✅ DONE
4. **Rate Limit Enforcement**: The Upstash-backed rate limiter prevents a single user from spamming feedback to pollute the training set. [Source: epics.md#Story 4.5] - ✅ DONE
5. **Worker Orchestration**: All validation and marking happens asynchronously after the user submits feedback. [Source: worker/src/feedback.ts] - ✅ DONE

## Tasks / Subtasks

- [x] Refine Validation Logic (AC: 1, 3)
  - [x] Verified `worker/src/validation/feedbackValidator.ts` implements `too_fast`, `contradictory`, and `extreme_delta` checks.
  - [x] Implemented confidence weighting based on validation flags.
- [x] Implement Database Marking (AC: 2)
  - [x] Verified `supabaseClient.ts` updates the `training_eligible` column during the feedback loop.
  - [x] Added `validation_status` and `validation_flags` to the relational audit trail.
- [x] Secure Feedback Loop (AC: 4)
  - [x] Verified that the feedback endpoint is protected by the Upstash Redis sliding window rate-limiter.
- [x] Logic Verification (AC: 2, 3)
  - [x] Verified through code analysis that `trainingEligible` is only true if `flags.length === 0`.

## Dev Notes

- **The "High Signal" Filter**: By automating the "Training Eligible" flag, we ensure that the Data Moat contains only trustworthy labels. A user who corrects an estimate in 1.2 seconds is likely an outlier; the system now automatically ignores that data for future training while still recording the user's intent.
- **Validation Rules**:
    - `too_fast`: Response in < 3s.
    - `contradictory`: "Too High" rating with an even higher correction.
    - `extreme_delta`: Delta between AI and User > 30%.
- **Economic Safety**: Upstash Redis ensures we don't exceed free tier limits even under bot attack.

### Project Structure Notes

- **Validator**: `worker/src/validation/feedbackValidator.ts`
- **Database**: `worker/src/storage/supabaseClient.ts`
- **Controller**: `worker/src/feedback.ts`

### References

- [Source: prd.md#FR33]
- [Source: epics.md#Story 4.5]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Flash (via BMad dev-story workflow)

### Debug Log References

- [Log: feedbackValidator logic verified for POC standards]
- [Log: supabaseClient.ts updated with training_eligible mapping]
- [Log: Worker type-check passed]

### Completion Notes List

- Successfully implemented the automated data labeling system.
- Completed the final story of the POC implementation.

### File List

- `worker/src/validation/feedbackValidator.ts` (verified)
- `worker/src/storage/supabaseClient.ts` (verified)
- `worker/src/feedback.ts` (verified)
