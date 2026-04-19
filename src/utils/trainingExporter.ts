import type { StoredScan } from "../hooks/useScanHistory";

export interface TrainingRecord {
  image_url: string;
  sku: string;
  label_percentage: number;
  label_volume_ml?: number;
  confidence: string;
  is_augmented: boolean;
  augmentation_type?: string;
  error_category?: string;
}

/**
 * Exports a dataset ready for ML training (TensorFlow/PyTorch).
 * Filters for high-quality examples and provides a manifest.
 */
export function exportTrainingDataset(data: TrainingRecord[], format: "csv" | "json" = "csv"): void {
  if (data.length === 0) return;

  if (format === "json") {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    downloadBlob(blob, `afia-training-set-${Date.now()}.json`);
  } else {
    const headers = ["image_url", "sku", "label_percentage", "label_volume_ml", "is_augmented", "augmentation_type"];
    const rows = data.map(r => [
      r.image_url,
      r.sku,
      r.label_percentage.toString(),
      r.label_volume_ml?.toString() || "0",
      r.is_augmented.toString(),
      r.augmentation_type || "none"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    downloadBlob(blob, `afia-training-manifest-${Date.now()}.csv`);
  }
}

/**
 * Maps stored scans to training records
 */
export function mapScansToTrainingRecords(scans: StoredScan[]): TrainingRecord[] {
  return scans
    .filter(s => s.feedbackRating === 'about_right' || s.id?.includes('reviewed'))
    .map(s => ({
      image_url: s.imageUrl || "",
      sku: s.sku,
      label_percentage: s.fillPercentage,
      label_volume_ml: s.remainingMl,
      confidence: s.confidence,
      is_augmented: s.id?.startsWith('aug-') || false,
      augmentation_type: s.id?.split('-')[1] || 'none',
      error_category: 'none'
    }));
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
