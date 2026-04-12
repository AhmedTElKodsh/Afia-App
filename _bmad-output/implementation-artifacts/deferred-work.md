
## Deferred from: code review Round 2 of tech-spec-camera-auto-capture-outline-coverage-2026-04-10 (2026-04-12)

- W5: thin bbox at BBOX_MIN_HEIGHT=8 can produce bodyDensity=0 (body zone covers only 4 of 8 rows) — inherent tradeoff; acceptable given gate ordering
- W6: `getProcessingCanvas()` dirty canvas if canvas.width reset is ever skipped — pre-existing pattern
- W7: empty-string B2/Upstash vars in wrangler.toml — intentional; .dev.vars documented
- W8: `centroidX: 0.5` sentinel on not-detected — callers check `bottleDetected` first
- W9: `parseLLMResponse` generic Error for empty-after-fence — typed error class is nice-to-have
- W10: `.bottle-guide-hint` `bottom: 100%` requires ancestor `position: relative` — pre-existing CSS

## Deferred from: code review of tech-spec-camera-auto-capture-outline-coverage-2026-04-10 (2026-04-12)

- W1: `isLevel` hardcoded to `true` in `analyzeComposition()` — gyroscope/DeviceOrientation API integration needed
- W2: `thinkingBudget: 0` (accuracy degradation on ambiguous images) and `v1beta` endpoint stability — need tracking issues
- W3: Translation keys `moveCloser`/`moveBack`/`centreBottle` etc. missing for locales beyond EN/AR
- W4: Auto-capture, progress ring (holdProgress/isHolding), shutter flash (Spec 2 §5) — full auto-capture suite is next implementation sprint
