# Story 4.2: Automated Data Accumulation & BlurHash

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a system,
I want to store every scan visual and its metadata automatically,
so that I can build a proprietary training dataset for Afia and provide instant-load previews.

## Acceptance Criteria

1. **Automatic B2 Storage**: Every successful or brand-rejected scan image is stored in Backblaze B2. [Source: prd.md#FR30] - ✅ DONE
2. **Comprehensive Metadata Logging**: The Supabase `scans` table includes: `scan_id`, `sku`, `fill_percentage`, `confidence`, `ai_provider`, `latency_ms`, `image_path`, `blurhash`, and `reasoning`. [Source: prd.md#FR31] - ✅ DONE
3. **BlurHash Generation**: A ~30-character BlurHash-like string is generated for the image and stored in the `blurhash` column. [Source: epics.md#Story 4.2] - ✅ DONE
4. **Non-Blocking Persistence**: Storage operations do not delay the result delivery to the user (uses `waitUntil`). [Source: architecture.md#Architectural Boundaries] - ✅ DONE
5. **Data Moat Completeness**: The system ensures all Stage 2 (LLM) reasoning text is captured for future prompt engineering analysis. [Source: epics.md#Story 4.2] - ✅ DONE

## Tasks / Subtasks

- [x] Implement BlurHash Generation (AC: 3)
  - [x] Created `src/utils/miniHash.ts` on the client side to generate a compact 4x4 color grid signature (`avg1:base64...`).
  - [x] Chose client-side generation to leverage existing `ImageData` access and minimize Worker CPU load.
- [x] Update Supabase Schema Logic (AC: 2, 5)
  - [x] Updated `ScanMetadata` and `storeScan` in `worker/src/storage/supabaseClient.ts` to include `blurhash` and `reasoning`.
- [x] Refine Persistence Loop (AC: 1, 4)
  - [x] Updated `handleAnalyze` in `worker/src/analyze.ts` to extract the `blurhash` from the request body.
  - [x] Ensured that LLM `reasoning` is passed to the database record.
  - [x] Confirmed that brand-rejected scans are still logged (essential for negative training data).
- [x] Logic Verification (AC: 2)
  - [x] Verified Worker type-safety with new metadata fields.

## Dev Notes

- **MiniHash Strategy**: Instead of a full BlurHash (which requires a large library), I implemented a "MiniHash" that samples a 4x4 grid of average colors. This provides a perfect ~24-30 character string that can be used to render a tiny CSS `conic-gradient` or blurred grid as an instant preview in the future.
- **Data Moat Growth**: Every single scan now contributes a high-res B2 image, a metadata record, and the AI's step-by-step reasoning. This is the foundation for fine-tuning Stage 1 and Stage 2 in the future.

### Project Structure Notes

- **Client Utility**: `src/utils/miniHash.ts`
- **Worker Orchestrator**: `worker/src/analyze.ts`
- **DB Client**: `worker/src/storage/supabaseClient.ts`

### References

- [Source: prd.md#FR30, FR31]
- [Source: epics.md#Story 4.2]
- [Source: architecture.md#Architectural Boundaries]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Flash (via BMad dev-story workflow)

### Debug Log References

- [Log: miniHash.ts implemented with 4x4 grid sampling]
- [Log: App.tsx updated to generate hash during image prep]
- [Log: storeScan updated with blurhash and reasoning columns]
- [Log: Worker type-check passed]

### Completion Notes List

- Successfully automated the data accumulation pipeline.
- Established the "Instant Preview" foundation with MiniHash strings.

### File List

- `src/utils/miniHash.ts` (new)
- `src/api/apiClient.ts` (modified)
- `src/App.tsx` (modified)
- `worker/src/storage/supabaseClient.ts` (modified)
- `worker/src/analyze.ts` (modified)
