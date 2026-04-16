/**
 * Shared AI prompt builder for all vision providers.
 * Single source of truth — update here, all providers pick it up.
 *
 * @param debugReasoning - When true, includes a "reasoning" field in the schema.
 * @param bottleAnchors  - Optional bottle-specific visual landmark hints.
 */
export function buildAnalysisPrompt(debugReasoning: boolean, bottleAnchors?: string): string {
  const schema = `{
    "brand": "Afia" | "unknown",
    "fillPercentage": <0-100>,
    "red_line_y_normalized": <0-1000>,
    "confidence": "high" | "medium" | "low",
    "imageQualityIssues": ["blur" | "poor_lighting" | "reflection"],
    "below_55ml_threshold": boolean,
    ${debugReasoning ? '"reasoning": "string",' : ""}
    "guidance_needed": "string" | null
  }`;

  const prompt = `**V1.5L AFIA ANALYSIS PROTOCOL**

Role: Precision Industrial Vision Analyst specializing in liquid volume estimation.
Object: 1.5 Liter (1500ml) "Afia" Oil Bottle.
Orientation: The bottle is captured from the front. The handle MUST be on the right side of the bottle from your perspective.

1. **Calibration**: 
   - Use provided 'Reference_Strip' to calibrate the scale. 
   - 0 (Bottom) = Empty
   - 1000 (Full-Mark) = 1500ml

2. **Meniscus Detection**:
   - Locate the oil line. 
   - If the detected line is below the 55ml mark shown in the reference, set 'fillPercentage' to 0 and 'below_55ml_threshold' to true.
   - Otherwise, calculate volume based on the 1000-point scale.

3. **Coordinate Mapping & Tilt**:
   - Identify the Y-coordinate of the meniscus.
   - **Tilted Bottle Rule**: If the bottle is tilted (check metadata), identify the center point of the diagonal meniscus to estimate volume. The 'red_line_y_normalized' should represent this center point.
   - Return 'red_line_y_normalized' as an integer between 0 and 1000, where 0 is the very bottom and 1000 is the 1500ml line.

4. **Environmental Check**:
   - If glare blocks the oil line, set 'guidance_needed' to: "Too much glare: move away from window".
   - If the image is too dark, set 'guidance_needed' to: "Too dark: turn on a light".

${bottleAnchors ? `**BOTTLE LANDMARKS**:\n${bottleAnchors}\n` : ""}

JSON Response Format:
${schema}

Confidence Scoring:
- "high": Meniscus is sharp and clearly visible.
- "medium": Lighting is slightly harsh, but level is inferable.
- "low": Oil level is obscured.`;

  return prompt;
}
