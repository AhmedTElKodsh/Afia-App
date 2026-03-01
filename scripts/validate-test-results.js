/**
 * Test Results Validation Script
 *
 * Compares AI analysis results against ground truth metadata
 * Calculates accuracy metrics and identifies patterns
 *
 * Usage:
 *   node scripts/validate-test-results.js <exported-results.json> <metadata.json>
 */

const fs = require("fs");
const path = require("path");

function calculateAccuracy(aiResult, groundTruth) {
  const error = Math.abs(aiResult - groundTruth);
  const errorPercentage = (error / groundTruth) * 100;

  return {
    error,
    errorPercentage,
    isAccurate: error <= 5, // Within 5% is considered accurate
    isReasonable: error <= 10, // Within 10% is reasonable
  };
}

function analyzeResults(testResults, metadata) {
  const metadataMap = new Map();
  metadata.images.forEach((img) => {
    metadataMap.set(img.filename, img);
  });

  const analysis = {
    totalTests: testResults.length,
    matched: 0,
    unmatched: 0,
    accurate: 0,
    reasonable: 0,
    inaccurate: 0,
    byConfidence: {
      high: { count: 0, avgError: 0, errors: [] },
      medium: { count: 0, avgError: 0, errors: [] },
      low: { count: 0, avgError: 0, errors: [] },
    },
    byFillLevel: {
      empty: { count: 0, avgError: 0, errors: [] }, // 0-15%
      low: { count: 0, avgError: 0, errors: [] }, // 15-40%
      medium: { count: 0, avgError: 0, errors: [] }, // 40-60%
      high: { count: 0, avgError: 0, errors: [] }, // 60-85%
      full: { count: 0, avgError: 0, errors: [] }, // 85-100%
    },
    details: [],
  };

  testResults.forEach((test) => {
    const groundTruth = metadataMap.get(test.imageName);

    if (!groundTruth) {
      analysis.unmatched++;
      console.warn(`⚠️  No metadata found for: ${test.imageName}`);
      return;
    }

    analysis.matched++;

    const accuracy = calculateAccuracy(
      test.analysisResult.fillPercentage,
      groundTruth.actualFillPercentage,
    );

    // Overall accuracy
    if (accuracy.isAccurate) analysis.accurate++;
    else if (accuracy.isReasonable) analysis.reasonable++;
    else analysis.inaccurate++;

    // By confidence
    const confidence = test.analysisResult.confidence;
    analysis.byConfidence[confidence].count++;
    analysis.byConfidence[confidence].errors.push(accuracy.error);

    // By fill level
    const fillLevel = groundTruth.actualFillPercentage;
    let levelCategory;
    if (fillLevel < 15) levelCategory = "empty";
    else if (fillLevel < 40) levelCategory = "low";
    else if (fillLevel < 60) levelCategory = "medium";
    else if (fillLevel < 85) levelCategory = "high";
    else levelCategory = "full";

    analysis.byFillLevel[levelCategory].count++;
    analysis.byFillLevel[levelCategory].errors.push(accuracy.error);

    // Detailed record
    analysis.details.push({
      image: test.imageName,
      sku: test.sku,
      groundTruth: groundTruth.actualFillPercentage,
      aiResult: test.analysisResult.fillPercentage,
      error: accuracy.error,
      errorPercentage: accuracy.errorPercentage.toFixed(2),
      confidence: confidence,
      accurate: accuracy.isAccurate,
      reasonable: accuracy.isReasonable,
      conditions: groundTruth.captureConditions,
      tags: groundTruth.tags,
    });
  });

  // Calculate averages
  Object.keys(analysis.byConfidence).forEach((conf) => {
    const data = analysis.byConfidence[conf];
    if (data.errors.length > 0) {
      data.avgError = (
        data.errors.reduce((a, b) => a + b, 0) / data.errors.length
      ).toFixed(2);
    }
  });

  Object.keys(analysis.byFillLevel).forEach((level) => {
    const data = analysis.byFillLevel[level];
    if (data.errors.length > 0) {
      data.avgError = (
        data.errors.reduce((a, b) => a + b, 0) / data.errors.length
      ).toFixed(2);
    }
  });

  return analysis;
}

function printReport(analysis) {
  console.log("\n" + "=".repeat(80));
  console.log("TEST RESULTS VALIDATION REPORT");
  console.log("=".repeat(80));

  console.log("\n📊 OVERALL STATISTICS:");
  console.log(`   Total Tests: ${analysis.totalTests}`);
  console.log(`   Matched with Metadata: ${analysis.matched}`);
  console.log(`   Unmatched: ${analysis.unmatched}`);
  console.log(
    `   Accurate (±5%): ${analysis.accurate} (${((analysis.accurate / analysis.matched) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   Reasonable (±10%): ${analysis.reasonable} (${((analysis.reasonable / analysis.matched) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   Inaccurate (>10%): ${analysis.inaccurate} (${((analysis.inaccurate / analysis.matched) * 100).toFixed(1)}%)`,
  );

  console.log("\n📈 BY CONFIDENCE LEVEL:");
  Object.entries(analysis.byConfidence).forEach(([conf, data]) => {
    if (data.count > 0) {
      console.log(
        `   ${conf.toUpperCase()}: ${data.count} tests, avg error: ${data.avgError}%`,
      );
    }
  });

  console.log("\n📉 BY FILL LEVEL:");
  Object.entries(analysis.byFillLevel).forEach(([level, data]) => {
    if (data.count > 0) {
      console.log(
        `   ${level.toUpperCase()}: ${data.count} tests, avg error: ${data.avgError}%`,
      );
    }
  });

  console.log("\n🔍 DETAILED RESULTS:");
  console.log("   (Showing worst 5 predictions)\n");

  const worst = analysis.details.sort((a, b) => b.error - a.error).slice(0, 5);

  worst.forEach((detail, i) => {
    console.log(`   ${i + 1}. ${detail.image}`);
    console.log(
      `      Ground Truth: ${detail.groundTruth}% | AI: ${detail.aiResult}% | Error: ${detail.error}%`,
    );
    console.log(
      `      Confidence: ${detail.confidence} | Conditions: ${JSON.stringify(detail.conditions)}`,
    );
    console.log("");
  });

  console.log("\n💡 RECOMMENDATIONS:");

  const avgErrorAll =
    analysis.details.reduce((sum, d) => sum + d.error, 0) /
    analysis.details.length;

  if (avgErrorAll <= 5) {
    console.log("   ✅ Excellent accuracy! System is ready for production.");
  } else if (avgErrorAll <= 10) {
    console.log("   ⚠️  Good accuracy, but could be improved. Consider:");
    console.log("      - More training data for problematic fill levels");
    console.log("      - Better lighting in test images");
  } else {
    console.log("   ❌ Accuracy needs improvement. Recommendations:");
    console.log("      - Review bottle geometry definitions");
    console.log("      - Collect more diverse training data");
    console.log("      - Check image quality and lighting");
    console.log("      - Consider fine-tuning AI model");
  }

  // Identify patterns
  const lowLightErrors = analysis.details.filter(
    (d) => d.conditions?.lightingCondition?.includes("dim") && d.error > 10,
  );

  if (lowLightErrors.length > 0) {
    console.log(
      `\n   📸 ${lowLightErrors.length} errors in low-light conditions - lighting affects accuracy`,
    );
  }

  const emptyBottleErrors = analysis.details.filter(
    (d) => d.groundTruth < 15 && d.error > 10,
  );

  if (emptyBottleErrors.length > 0) {
    console.log(
      `   🍶 ${emptyBottleErrors.length} errors on nearly-empty bottles - edge case needs attention`,
    );
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ Validation complete!\n");
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(
      "Usage: node scripts/validate-test-results.js <results.json> <metadata.json>",
    );
    console.log("\nExample:");
    console.log(
      "  node scripts/validate-test-results.js test-results-1234.json public/test-images/metadata.json",
    );
    process.exit(1);
  }

  const resultsPath = args[0];
  const metadataPath = args[1];

  try {
    const testResults = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));

    const analysis = analyzeResults(testResults, metadata);
    printReport(analysis);

    // Save detailed analysis
    const outputPath = resultsPath.replace(".json", "-analysis.json");
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`📄 Detailed analysis saved to: ${outputPath}\n`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

module.exports = { analyzeResults, calculateAccuracy };
