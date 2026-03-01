/**
 * AI Image Generation Helper Script
 *
 * This script helps generate test images using AI for oil level detection testing.
 * Run with: node scripts/generate-ai-images.js
 *
 * Note: This requires the Hugging Face MCP server to be configured in Kiro.
 * Alternatively, you can use the prompts manually with any AI image generator.
 */

const prompts = {
  empty: {
    percentage: 5,
    prompt: `A clear glass cooking oil bottle standing upright on a white surface, nearly empty with just a thin layer of golden yellow cooking oil at the very bottom (5% full), professional product photography, bright even lighting, clean white background, high resolution, sharp focus`,
  },
  low: {
    percentage: 25,
    prompt: `A clear glass cooking oil bottle standing upright on a white surface, filled to 25% with golden yellow cooking oil visible at the bottom quarter, professional product photography, bright even lighting, clean white background, high resolution, sharp focus`,
  },
  mediumLow: {
    percentage: 40,
    prompt: `A clear glass cooking oil bottle standing upright on a white surface, filled to 40% with golden yellow cooking oil, professional product photography, bright even lighting, clean white background, high resolution, sharp focus`,
  },
  half: {
    percentage: 50,
    prompt: `A clear glass cooking oil bottle standing upright on a white surface, exactly half filled with golden yellow cooking oil at the midpoint, professional product photography, bright even lighting, clean white background, high resolution, sharp focus`,
  },
  mediumHigh: {
    percentage: 65,
    prompt: `A clear glass cooking oil bottle standing upright on a white surface, filled to 65% with golden yellow cooking oil, professional product photography, bright even lighting, clean white background, high resolution, sharp focus`,
  },
  high: {
    percentage: 75,
    prompt: `A clear glass cooking oil bottle standing upright on a white surface, filled to 75% with golden yellow cooking oil in the top quarter empty, professional product photography, bright even lighting, clean white background, high resolution, sharp focus`,
  },
  nearlyFull: {
    percentage: 90,
    prompt: `A clear glass cooking oil bottle standing upright on a white surface, nearly full at 90% with golden yellow cooking oil, small gap at top, professional product photography, bright even lighting, clean white background, high resolution, sharp focus`,
  },
  full: {
    percentage: 100,
    prompt: `A clear glass cooking oil bottle standing upright on a white surface, completely full to the brim with golden yellow cooking oil, professional product photography, bright even lighting, clean white background, high resolution, sharp focus`,
  },
};

// Variations for different conditions
const variations = {
  lighting: [
    { suffix: "bright", modifier: "very bright studio lighting" },
    { suffix: "natural", modifier: "natural daylight from window" },
    { suffix: "dim", modifier: "soft dim lighting" },
  ],
  angle: [
    {
      suffix: "straight",
      modifier: "camera at bottle center height, straight on view",
    },
    { suffix: "slight-angle", modifier: "camera at slight 15 degree angle" },
  ],
  oilType: [
    { suffix: "golden", modifier: "golden yellow olive oil" },
    { suffix: "light", modifier: "light pale yellow sunflower oil" },
    { suffix: "amber", modifier: "amber colored sesame oil" },
  ],
};

console.log("=".repeat(80));
console.log("AI Image Generation Prompts for Oil Level Detection Testing");
console.log("=".repeat(80));
console.log("\nBase Prompts (use these with any AI image generator):\n");

Object.entries(prompts).forEach(([key, data]) => {
  console.log(`\n${key.toUpperCase()} (${data.percentage}%):`);
  console.log("-".repeat(80));
  console.log(data.prompt);
});

console.log("\n\n" + "=".repeat(80));
console.log("Variation Modifiers (add to base prompts for variety):");
console.log("=".repeat(80));

console.log("\n\nLIGHTING VARIATIONS:");
variations.lighting.forEach((v) => {
  console.log(`  - ${v.suffix}: "${v.modifier}"`);
});

console.log("\n\nANGLE VARIATIONS:");
variations.angle.forEach((v) => {
  console.log(`  - ${v.suffix}: "${v.modifier}"`);
});

console.log("\n\nOIL TYPE VARIATIONS:");
variations.oilType.forEach((v) => {
  console.log(`  - ${v.suffix}: "${v.modifier}"`);
});

console.log("\n\n" + "=".repeat(80));
console.log("Example Combined Prompt:");
console.log("=".repeat(80));
console.log(
  `\n${prompts.half.prompt}, ${variations.lighting[0].modifier}, ${variations.oilType[0].modifier}`,
);

console.log("\n\n" + "=".repeat(80));
console.log("Recommended Generation Plan:");
console.log("=".repeat(80));
console.log(`
1. Generate 2-3 images per fill level (8 levels × 3 = 24 images)
2. Use different lighting for each variation
3. Save with descriptive names: {percentage}-{lighting}-{number}.png
   Example: 50-bright-01.png, 50-natural-02.png

4. Organize in: public/test-images/generated/

5. Create metadata.json documenting each image

6. Test in test mode: http://localhost:5173/?test=true

Total recommended: 24-32 AI-generated images for initial testing
`);

console.log("\n" + "=".repeat(80));
console.log("Using with Kiro + Hugging Face MCP:");
console.log("=".repeat(80));
console.log(`
If you have the Hugging Face MCP server configured in Kiro, you can ask:

"Generate an image with this prompt: [paste prompt from above]"

Or ask me directly and I'll use the mcp_hf_mcp_server_gr1_z_image_turbo_generate tool!
`);

console.log("\n" + "=".repeat(80));
console.log("Alternative AI Image Generators:");
console.log("=".repeat(80));
console.log(`
- DALL-E 3 (OpenAI): https://platform.openai.com/
- Midjourney: https://midjourney.com/
- Stable Diffusion: https://stability.ai/
- Leonardo.ai: https://leonardo.ai/
- Ideogram: https://ideogram.ai/

Copy the prompts above and use with any of these services.
`);

console.log(
  "\n✅ Script complete! Use the prompts above to generate test images.\n",
);
