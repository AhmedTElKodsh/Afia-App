# Story 3.1: LLM Fill Percentage Estimation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a system,
I want the AI to identify the oil surface line relative to bottle features,
so that I can get an accurate percentage estimate regardless of photo angle.

## Acceptance Criteria

1. **AI Vision Implementation**: The primary vision call to Gemini 2.5 Flash successfully returns a `fillPercentage` (0–100) and a `confidence` score. [Source: epics.md#Story 3.1] - ✅ DONE
2. **Visual Grounding Prompt**: The system prompt is refined to instruct the model to use specific bottle features (label edges, neck, base) as visual anchors for height estimation. [Source: architecture.md#1-project-context-analysis] - ✅ DONE
3. **Obstruction Detection**: The LLM identified potential visual obstructions (e.g., hands covering the bottle) and returns "obstruction" in the `imageQualityIssues` array. [Source: epics.md#Story 3.1] - ✅ DONE
4. **Reasoning Integration**: The `fillPercentage` is derived from the `reasoning` field analysis, ensuring the model "sees" the oil line before estimating. [Source: 2-3-reasoning-first-llm-contract-stage-2.md#Acceptance Criteria] - ✅ DONE
5. **Worker Orchestration**: The Cloudflare Worker correctly parses the fill percentage and prepares it for volume math (Stage 3). [Source: architecture.md#6-project-structure--boundaries] - ✅ DONE

## Tasks / Subtasks

- [x] Refine AI Prompt for Accuracy (AC: 2, 4)
  - [x] Updated `worker/src/providers/buildAnalysisPrompt.ts` with explicit rules for identifying the oil surface (meniscus).
  - [x] Added instruction to ignore the cap (~6% height) when calculating the percentage.
- [x] Implement Visual Grounding (AC: 2, 3)
  - [x] Explicitly listed "obstruction" as a quality issue in the prompt.
  - [x] Updated prompt to use bottle-specific anchors (label edges, neck).
- [x] Verify Response Handling (AC: 1, 5)
  - [x] Audited `parseLLMResponse.ts` to ensure it captures `fillPercentage` and `imageQualityIssues`.
- [x] Logic Verification (AC: 1)
  - [x] Verified 21/21 unit tests passing for the parser.

## Dev Notes

- **The Cap Rule**: Clones and different brands have varying cap heights. By instructing the model to ignore the cap and measure to the "neck beginning," we normalize estimation across the Afia product line.
- **Visual Grounding**: The model is now explicitly told to look for the "meniscus," which helps in low-light or reflective kitchen environments.
- **Error Robustness**: "obstruction" detection prevents inaccurate calculations when the user's hand or another object is blocking the view of the label/oil level.

### Project Structure Notes

- **Prompt Builder**: `worker/src/providers/buildAnalysisPrompt.ts`
- **Response Parser**: `worker/src/providers/parseLLMResponse.ts`

### References

- [Source: epics.md#Story 3.1]
- [Source: architecture.md#1-project-context-analysis]
- [Source: 2-3-reasoning-first-llm-contract-stage-2.md#Acceptance Criteria]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Flash (via BMad dev-story workflow)

### Debug Log References

- [Log: buildAnalysisPrompt.ts updated with meniscus and cap-ignore rules]
- [Log: obstruction added to imageQualityIssues schema]
- [Log: Worker type-check passed]

### Completion Notes List

- Successfully delivered the core AI estimation logic.
- Established a robust visual grounding contract for high-accuracy fill detection.

### File List

- `worker/src/providers/buildAnalysisPrompt.ts` (modified)
