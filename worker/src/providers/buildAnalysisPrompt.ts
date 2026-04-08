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
    ? `{"fillPercentage":<0-100>,"confidence":"<high|medium|low>","imageQualityIssues":[<strings>],"reasoning":"<brief>"}`
    : `{"fillPercentage":<0-100>,"confidence":"<high|medium|low>","imageQualityIssues":[<strings>]}`;

  const anchorSection = bottleAnchors
    ? `\n- Use these visual anchors for THIS bottle:\n${bottleAnchors.split("\n").map(l => `    ${l}`).join("\n")}`
    : "";

  return `You are a CV system estimating cooking oil fill levels from bottle images.

Analyze the image and return this JSON:
${schema}

Rules:
- fillPercentage: visible oil surface height / total bottle height × 100 (height ratio, not volume ratio). Account for meniscus. Measure from bottle base to oil surface, excluding cap. Clamp 0–100.${anchorSection}
- confidence: "high"=clear bottle outline+well-lit, "medium"=acceptable, "low"=poor quality
- imageQualityIssues: only include if the issue would prevent accurate fill estimation:
    * "blur" ONLY if the bottle outline/shape is indistinct (genuinely soft image, not just a dark background)
    * "poor_lighting" ONLY if the entire scene is too dark to distinguish the bottle body and oil level (histogram globally dark — not just a dark background with a lit subject)
    * "obstruction" if bottle body is significantly covered
    * "reflection" if glare obscures the oil level line`;
}
