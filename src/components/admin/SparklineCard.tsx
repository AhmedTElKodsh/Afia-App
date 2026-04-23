import { useMemo } from "react";
import type { TFunction } from "i18next";
import type { StoredScan } from "../../hooks/useScanHistory.ts";

interface SparklineCardProps {
  scans: StoredScan[];
  t: TFunction;
  locale: string;
}

export function SparklineCard({ scans, t, locale }: SparklineCardProps) {
  const days = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split("T")[0];
      const count = scans.filter((s) => s.timestamp?.startsWith(dayStr)).length;
      result.push({
        label: d.toLocaleDateString(locale, { weekday: "short" }).slice(0, 2),
        count,
        isToday: i === 0,
      });
    }
    return result;
  }, [scans, locale]);

  const maxCount = Math.max(...days.map((d) => d.count), 1);

  return (
    <div className="sparkline-card">
      <div className="sparkline-header">
        <span className="sparkline-title">{t('admin.overview.sparkline.title', 'Scan Activity')}</span>
        <span className="sparkline-period">{t('admin.overview.sparkline.period', 'Last 7 Days')}</span>
      </div>
      <div className="sparkline-bars">
        {days.map((day, i) => (
          <div key={i} className="sparkline-bar-col">
            <div className="sparkline-bar-track">
              <div
                className={`sparkline-bar${day.count > 0 ? " sparkline-bar--active" : ""}${day.isToday ? " sparkline-bar--today" : ""}`}
                style={{ height: `${Math.max((day.count / maxCount) * 100, 4)}%` }}
                title={t('admin.overview.sparkline.barTitle', { defaultValue: '{{label}}: {{count}} scan', label: day.label, count: day.count }) + (day.count !== 1 ? 's' : '')}
              />
            </div>
            <span className="sparkline-day">{day.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
