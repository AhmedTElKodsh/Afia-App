
const { analyzeComposition } = require('./src/utils/cameraQualityAssessment.ts');

// Mock Canvas/Context for Node testing if needed, or just test the math
// Since I can't easily run a browser-based canvas test here, I'll analyze the code logic.

console.log("Analyzing 1.5L Geometry Gaps...");

// Current Gates in analyzeComposition:
// 1. matchRatio >= 0.04 (Bottle must fill at least 4% of 60x100 crop)
// 2. aspectRatio <= 0.75 (Width/Height)
// 3. neckDensity < 0.40 * bodyDensity (Top 25% vs Bottom 60%)

// Proportions of Afia 1.5L (approx):
// Height: 270mm, Width: 85mm -> Aspect Ratio: 85/270 = 0.31
// 0.31 is well within 0.75.

// Neck sparsity:
// 1.5L bottle neck is much thinner than the body.
// Neck width: ~35mm. Body width: ~85mm.
// Neck density (relative to full width) would be ~35/85 = 41%?
// But density is pixels / area.
// If neck is 35mm wide and body is 85mm wide, and both are "solid" amber:
// Neck density in a fixed-width crop: 35/cropWidth.
// Body density in a fixed-width crop: 85/cropWidth.
// Ratio: 35/85 = 0.41.
// Current gate: neckDensity < 0.40 * bodyDensity.
// 0.41 is slightly ABOVE 0.40. This means a real 1.5L bottle might FAIL the neck sparsity check!

console.log("CRITICAL FINDING: Neck density ratio (0.41) is very close to gate (0.40).");
console.log("Action: Relax neck sparsity gate to 0.45 or 0.50 to avoid false negatives for 1.5L.");
