import { useTranslation } from "react-i18next";
import type { StoredScan } from "../hooks/useScanHistory";
import { formatDate, formatTime } from "../utils/formatters";
import "./TimelineGroup.css";

interface TimelineGroupProps {
  scans: StoredScan[];
  onScanClick: (scan: StoredScan) => void;
}

/** Normalize any timestamp format to a JS-parseable ISO string */
function normalizeTimestamp(raw: string): string {
  if (!raw) return "";
  if (raw.includes("T")) return raw;
  return raw.replace(" ", "T");
}

function groupByMonth(
  scans: StoredScan[],
  locale: string,
  t: (key: string, options?: { defaultValue?: string }) => string
): { month: string; scans: StoredScan[] }[] {
  const groups = new Map<string, StoredScan[]>();
  scans.forEach((scan) => {
    const date = new Date(normalizeTimestamp(scan.timestamp));
    // Guard: invalid date gets grouped under a fallback key
    const key = isNaN(date.getTime())
      ? t('common.unknownDate', { defaultValue: 'Unknown Date' })
      : date.toLocaleDateString(locale, {
          month: "long",
          year: "numeric",
        });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(scan);
  });
  return Array.from(groups.entries()).map(([month, s]) => ({ month, scans: s }));
}

export function TimelineGroup({ scans, onScanClick }: TimelineGroupProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';
  const groups = groupByMonth(scans, locale, t);

  return (
    <div className="timeline-groups" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {groups.map(({ month, scans: monthScans }) => (
        <div key={month} className="timeline-group">
          <div className="timeline-group-header">
            <span className="timeline-month">{month}</span>
            <span className="timeline-badge">{monthScans.length}</span>
          </div>
          <div className="timeline-items card card-compact">
            {monthScans.map((scan, i) => {
              const localizedBottleName = t(`bottles.${scan.sku}`, { defaultValue: scan.bottleName });
              return (
                <div
                  key={scan.id ?? `${scan.sku ?? "scan"}-${i}`}
                  className={[
                    "timeline-item",
                    i === 0 ? "timeline-item--latest" : "",
                    i === monthScans.length - 1 ? "timeline-item--last" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onScanClick(scan)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onScanClick(scan)}
                  aria-label={`${localizedBottleName} — ${scan.fillPercentage}% ${t('results.fillLevel')}`}
                >
                  <div className="timeline-dot-wrap">
                    <div className="timeline-dot" />
                    {i < monthScans.length - 1 && (
                      <div className="timeline-line" />
                    )}
                  </div>

                  <div className="timeline-info">
                    <div className="timeline-name">{localizedBottleName}</div>
                    <div className="timeline-meta">
                      {formatDate(scan.timestamp)} · {formatTime(scan.timestamp)}{" "}
                      · {scan.consumedMl}{t('common.ml')} {t('results.consumed')}
                    </div>
                  </div>

                  <div className="timeline-fill-section">
                    <div className="timeline-fill-bar">
                      <div
                        className="timeline-fill-inner"
                        style={{
                          width: `${Math.max(scan.fillPercentage, 2)}%`,
                        }}
                      />
                    </div>
                    <span className="timeline-pct">{scan.fillPercentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
