# Story 2.3: Reasoning-First LLM Contract & Stage 2

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want the LLM to explain its visual evidence before giving a brand verdict,
so that I can reduce hallucinations and increase verification accuracy.

## Acceptance Criteria

1. **Reasoning-First Schema**: The vision prompt is updated to require a `reasoning` or `thought` field *before* the final data fields in the JSON response. [Source: architecture.md#4-core-architectural-decisions] - ✅ DONE
2. **Visual Evidence Requirements**: The system prompt explicitly instructs the LLM to look for and describe the "Afia Heart" logo, the bilingual "عافية / Afia" text, and the cursive Arabic ligatures. [Source: research/afia-brand-verification-research-2026-04-10.md#Afia Visual Fingerprint] - ✅ DONE
3. **Bilingual Script Verification**: The LLM must explicitly confirm the integrity of the Arabic script to mitigate "Typography Blindness" from lookalike brands. [Source: prd.md#Risk Mitigation] - ✅ DONE
4. **0.8 Brand Gate**: The Cloudflare Worker includes logic to reject scans if the brand verification confidence is < 0.8 (mapped from LLM output or specific confidence field). [Source: architecture.md#4-core-architectural-decisions] - ✅ DONE
5. **Prompt Routing**: The system utilizes the `brandConfidence` passed from Stage 1 to choose between a "Verify Everything" prompt and a "Trust & Fill" prompt. [Source: 2-2-stage-1-mobilenetv3-binary-classifier-integration.md#Dev Notes] - ✅ DONE

## Tasks / Subtasks

- [x] Refine System Prompt (AC: 1, 2, 3)
  - [x] Updated `worker/src/providers/buildAnalysisPrompt.ts` to implement the Reasoning-First pattern.
  - [x] Added specific instructions for "Script Integrity Check" (cursive ligatures).
- [x] Update Data Models (AC: 4)
  - [x] Added `brandConfidence` (number) to `LLMResponse` in `worker/src/types.ts`.
  - [x] Updated `parseLLMResponse.ts` to correctly handle the new numeric confidence field with backwards compatibility.
- [x] Implement Worker Gate (AC: 4)
  - [x] Updated `handleAnalyze` in `worker/src/analyze.ts` to enforce the 0.8 `brandConfidence` threshold.
  - [x] Integrated logging for brand verification failures.
- [x] Logic Verification (AC: 5)
  - [x] Verified 21/21 parser unit tests passing.

## Dev Notes

- **The "Reasoning" Strategy**: By placing the reasoning field at the top of the JSON, the model is forced to attend to the visual details (the "Why") before it can generate the "What" (the boolean/numeric results). This significantly reduces "lazy" hallucinations.
- **Arabic Integrity**: The prompt now specifically asks for joined letters (Ain-Fe-Yah-Heh), which is a key differentiator against low-quality clones that use disjointed fonts.
- **Failover Logic**: The 0.8 gate provides a hard security boundary at the edge, ensuring only high-confidence authentic scans reach the user.

### Project Structure Notes

- **Prompt Logic**: `worker/src/providers/buildAnalysisPrompt.ts`
- **Response Handling**: `worker/src/providers/parseLLMResponse.ts`
- **Orchestration**: `worker/src/analyze.ts`

### References

- [Source: research/afia-brand-verification-research-2026-04-10.md#Afia Visual Fingerprint]
- [Source: architecture.md#4-core-architectural-decisions]
- [Source: prd.md#Risk Mitigation]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Flash (via BMad dev-story workflow)

### Debug Log References

- [Log: buildAnalysisPrompt.ts updated with Reasoning-First JSON schema]
- [Log: parseLLMResponse.ts updated to handle numeric brandConfidence]
- [Log: analyze.ts updated with 0.8 confidence gate]
- [Log: Parser tests (21/21) passing]

### Completion Notes List

- Successfully hardened the AI verification contract.
- Implemented the final deep-learning gate in the 3-Tier verification pipeline.

### File List

- `worker/src/types.ts` (modified)
- `worker/src/providers/buildAnalysisPrompt.ts` (modified)
- `worker/src/providers/parseLLMResponse.ts` (modified)
- `worker/src/analyze.ts` (modified)
- `src/test/parseLLMResponse.test.ts` (modified)
