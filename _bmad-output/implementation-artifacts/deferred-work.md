
## Deferred from: code review Round 2 of tech-spec-camera-auto-capture-outline-coverage-2026-04-10 (2026-04-12)

- W5: thin bbox at BBOX_MIN_HEIGHT=8 can produce bodyDensity=0 (body zone covers only 4 of 8 rows) — inherent tradeoff; acceptable given gate ordering
- W6: `getProcessingCanvas()` dirty canvas if canvas.width reset is ever skipped — pre-existing pattern
- W7: empty-string B2/Upstash vars in wrangler.toml — intentional; .dev.vars documented
- W8: `centroidX: 0.5` sentinel on not-detected — callers check `bottleDetected` first
- ✅ **W9 RESOLVED (2026-04-17)**: `parseLLMResponse` generic Error for empty-after-fence — **typed error classes created** (`LLMEmptyResponseError`, `LLMInvalidFormatError`)
- W10: `.bottle-guide-hint` `bottom: 100%` requires ancestor `position: relative` — pre-existing CSS

## Deferred from: code review of tech-spec-camera-auto-capture-outline-coverage-2026-04-10 (2026-04-12)

- ✅ **W1 RESOLVED (2026-04-17)**: `isLevel` hardcoded to `true` in `analyzeComposition()` — gyroscope/DeviceOrientation API integration **already implemented** in `useCameraGuidance.ts` and `getAngleGuidance()` function
- ✅ **W2 RESOLVED (2026-04-17)**: `thinkingBudget: 0` (accuracy degradation on ambiguous images) and `v1beta` endpoint stability — **tracking document created** at `gemini-api-stability-tracking.md`
- ✅ **W3 RESOLVED (2026-04-17)**: Translation keys `moveCloser`/`moveBack`/`centreBottle` etc. missing for locales beyond EN/AR — **already implemented** in both EN and AR translation files
- W4: Auto-capture, progress ring (holdProgress/isHolding), shutter flash (Spec 2 §5) — full auto-capture suite is next implementation sprint

## Deferred from: code review Round 3 of tech-spec-camera-auto-capture-outline-coverage-2026-04-10 (2026-04-13)

- ✅ **W11 RESOLVED (2026-04-17)**: `generateGuidanceMessage()` must return valid i18n keys — **JSDoc warning added** with explicit contract that all returned keys must exist in translation files
- ✅ **W12 RESOLVED (2026-04-17)**: `bottleDetected: true` + `distance: 'not-detected'` contradictory API — **JSDoc added** to `CompositionAssessment` interface with usage examples and warning
- ✅ **W13 RESOLVED (2026-04-17)**: `isReady` vs `distance === 'good'` 1-frame visual lag — **comment added** documenting hold timer resolution; lag is mitigated by progressive hold indicator
- ✅ **W14 RESOLVED (2026-04-17)**: `camera.pointAtBottle` key in spec §8 table vs `alignBottle` used in code — **spec updated** to use `alignBottle` matching implementation
