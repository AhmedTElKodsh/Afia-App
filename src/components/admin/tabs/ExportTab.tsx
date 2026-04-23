import { useState } from "react";
import { FileJson, FileText, Database } from "lucide-react";
import type { TFunction } from "i18next";
import type { StoredScan } from "../../../hooks/useScanHistory.ts";
import { exportToCSV, exportToJSON } from "../../../utils/exportResults.ts";
import { exportTrainingDataset, mapScansToTrainingRecords } from "../../../utils/trainingExporter.ts";

interface ExportTabProps {
  scans: StoredScan[];
  t: TFunction;
}

const DATE_RANGE_OPTIONS = [
  { value: "all" as const, labelKey: "admin.export.dateRange.allTime" },
  { value: 7 as const, labelKey: "admin.export.dateRange.last7Days" },
  { value: 30 as const, labelKey: "admin.export.dateRange.last30Days" },
];

export function ExportTab({ scans, t }: ExportTabProps) {
  const [dateRange, setDateRange] = useState<"all" | 7 | 30>("all");
  const [exportError, setExportError] = useState("");

  const filteredScans = scans.filter((scan) => {
    if (dateRange === "all") return true;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dateRange);
    return new Date(scan.timestamp) >= cutoff;
  });

  const buildExportRecords = () =>
    filteredScans.map((s) => ({
      ...s,
      imageName: "scan-image",
      analysisResult: {
        scanId: s.id,
        fillPercentage: s.fillPercentage,
        remainingMl: s.remainingMl,
        confidence: s.confidence,
        aiProvider: (s.aiProvider ?? "unknown") as "gemini" | "groq",
        latencyMs: s.latencyMs ?? 0,
      },
    }));

  const handleExportJSON = () => {
    if (filteredScans.length === 0) {
      setExportError(t('admin.export.noScansError'));
      return;
    }
    setExportError("");
    exportToJSON(buildExportRecords());
  };

  const handleExportCSV = () => {
    if (filteredScans.length === 0) {
      setExportError(t('admin.export.noScansError'));
      return;
    }
    setExportError("");
    exportToCSV(buildExportRecords());
  };

  const dateRangeLabel = DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)
    ? t(DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)!.labelKey)
    : "";

  return (
    <div className="export-tab">
      <h3>{t('admin.export.title')}</h3>
      <p className="text-secondary">{t('admin.export.description')}</p>

      {/* Date Range Pills */}
      <div className="export-date-section">
        <span className="export-date-label">{t('admin.export.dateRange.label')}</span>
        <div className="export-date-pills" role="group" aria-label={t('admin.export.dateRange.label')}>
          {DATE_RANGE_OPTIONS.map(({ value, labelKey }) => (
            <button
              key={String(value)}
              className={`export-date-pill${dateRange === value ? " active" : ""}`}
              onClick={() => { setExportError(""); setDateRange(value); }}
              aria-pressed={dateRange === value}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Box */}
      <div className="export-summary-box" aria-live="polite">
        <div>
          <div className="export-summary-count">{filteredScans.length}</div>
          <div className="export-summary-label">{t('admin.export.stats', { count: filteredScans.length, defaultValue: `${filteredScans.length} scans` })}</div>
        </div>
        <span className="export-summary-range">{dateRangeLabel}</span>
      </div>

      {exportError && (
        <p className="error-message" role="alert">{exportError}</p>
      )}

      {/* Stacked Export Buttons */}
      <div className="export-buttons-stack">
        <button
          className="export-btn-card export-btn-card--primary"
          onClick={handleExportJSON}
          disabled={filteredScans.length === 0}
        >
          <div className="export-btn-card-icon"><FileJson size={22} /></div>
          <div className="export-btn-card-body">
            <span className="export-btn-card-title">{t('admin.export.buttons.exportJson')}</span>
            <span className="export-btn-card-sub">{t('admin.export.buttons.subJson', 'Structured data, great for developers')}</span>
          </div>
        </button>
        <button
          className="export-btn-card"
          onClick={handleExportCSV}
          disabled={filteredScans.length === 0}
        >
          <div className="export-btn-card-icon"><FileText size={22} /></div>
          <div className="export-btn-card-body">
            <span className="export-btn-card-title">{t('admin.export.buttons.exportCsv')}</span>
            <span className="export-btn-card-sub">{t('admin.export.buttons.subCsv', 'Opens in Excel or Google Sheets')}</span>
          </div>
        </button>
        <button
          className="export-btn-card export-btn-card--accent"
          onClick={() => exportTrainingDataset(mapScansToTrainingRecords(scans), "csv")}
          disabled={scans.length === 0}
        >
          <div className="export-btn-card-icon"><Database size={22} /></div>
          <div className="export-btn-card-body">
            <span className="export-btn-card-title">{t('admin.export.buttons.exportTraining', 'Training Manifest')}</span>
            <span className="export-btn-card-sub">{t('admin.export.buttons.subTraining', 'Filtered high-quality labels for model training')}</span>
          </div>
        </button>
      </div>

      <div className="export-info">
        <h4>{t('admin.export.info.title')}</h4>
        <ul>
          {(t('admin.export.info.items', { returnObjects: true }) as unknown as string[]).map((item: string, index: number) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
