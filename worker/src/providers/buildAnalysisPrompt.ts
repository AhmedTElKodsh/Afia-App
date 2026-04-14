/**
 * Shared AI prompt builder for all vision providers.
 * Single source of truth — update here, all providers pick it up.
 *
 * @param debugReasoning - When true, includes a "reasoning" field in the schema.
 * @param bottleAnchors  - Optional bottle-specific visual landmark hints (from BottleEntry.promptAnchors).
 *                         Injected into the prompt so the model can calibrate against known label positions.
 *                         Pass undefined for bottles that don't have landmark data.
 */
export function buildAnalysisPrompt(debugReasoning: boolean, bottleAnchors?: string): string {
  const schema = debugReasoning
    ? `{"brand":"Afia"|"unknown","fillPercentage":<0-100>,"confidence":"<high|medium|low>","imageQualityIssues":[<strings>],"reasoning":"<brief>"}`
    : `{"brand":"Afia"|"unknown","fillPercentage":<0-100>,"confidence":"<high|medium|low>","imageQualityIssues":[<strings>]}`;

  const anchorSection = bottleAnchors
    ? `\n- Use these visual anchors for THIS bottle to calibrate your estimate:\n${bottleAnchors.split("\n").map(l => `    ${l}`).join("\n")}`
    : "";

  return `You are a specialized Computer Vision system for Afia cooking oil level estimation.

Task: Estimate the fillPercentage of the oil bottle in the provided image.

Few-Shot Visual Guidance:
1. [Visual Token: Full] Oil is in the narrow neck region, touching the cap area. (93-97%)
2. [Visual Token: Shoulder] Oil line is at the transition between the wide body and narrow neck. (~83%)
3. [Visual Token: Label-Mid] Oil line bisects the main Afia heart logo. (~38%)
4. [Visual Token: Base] Only a small pool of oil is visible at the very bottom, below the label. (<12%)

Rules for Estimation:
- Focus: Find the meniscus (the curved upper surface of the oil).
- Reference: 0% is the extreme bottom edge of the bottle. 100% is the very top of the cap.
- Measurement: Measure from bottle base to the oil surface. Excluding the cap itself, a "full" bottle is typically 97%.
- Spatial Calibration: Use label text and graphics as a ruler. ${anchorSection}

JSON Response Format:
${schema}

Confidence Scoring:
- "high": Meniscus is sharp and clearly visible against label or clear plastic.
- "medium": Lighting is slightly harsh or bottle is at an angle, but level is inferable.
- "low": Oil level is obscured by glare, hands, or heavy blur.

Image Quality Flags:
- "blur": Bottle features are indistinct.
- "poor_lighting": Subject is too dark/bright to distinguish oil from air.
- "reflection": Glare directly overlaps the estimated oil level.`;
}
