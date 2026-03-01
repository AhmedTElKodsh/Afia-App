import type { AnalysisResult } from "../state/appState";

export interface TestResult {
  id: string;
  timestamp: string;
  sku: string;
  bottleName: string;
  imageName: string;
  analysisResult: AnalysisResult;
}

export function exportToJSON(results: TestResult[]): void {
  const dataStr = JSON.stringify(results, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  downloadBlob(blob, `test-results-${Date.now()}.json`);
}

export function exportToCSV(results: TestResult[]): void {
  const headers = [
    "Timestamp",
    "SKU",
    "Bottle Name",
    "Image Name",
    "Fill Percentage",
    "Remaining ML",
    "Confidence",
    "Scan ID",
  ];

  const rows = results.map((r) => [
    r.timestamp,
    r.sku,
    r.bottleName,
    r.imageName,
    r.analysisResult.fillPercentage.toString(),
    r.analysisResult.remainingMl.toString(),
    r.analysisResult.confidence,
    r.analysisResult.scanId,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  downloadBlob(blob, `test-results-${Date.now()}.csv`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
