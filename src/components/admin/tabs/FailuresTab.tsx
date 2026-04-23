import { History } from "lucide-react";
import type { TFunction } from "i18next";
import { getAnalyticsEvents } from "../../../utils/analytics.ts";
import { EmptyState } from "../../EmptyState.tsx";

interface FailuresTabProps {
  t: TFunction;
  isRTL: boolean;
}

export function FailuresTab({ t, isRTL }: FailuresTabProps) {
  const events = getAnalyticsEvents().filter((e: any) => e.type === "scan_failed");

  return (
    <div className="failures-tab">
      <div className="section-header">
        <h2>{t("admin.failures.title", "Camera Guidance Rejections")}</h2>
        <span className="recent-scans-badge">{events.length}</span>
      </div>
      <p className="text-secondary" style={{ marginBottom: "var(--space-md)" }}>
        {t("admin.failures.description", "Logs of real-time rejections (blur, low light, wrong brand) to help refine Stage 1/2 logic.")}
      </p>

      {events.length === 0 ? (
        <EmptyState
          icon={<History size={32} />}
          title={t("admin.failures.emptyTitle", "No failures logged")}
          description={t("admin.failures.emptyDescription", "Guidance rejections will appear here once users start scanning.")}
        />
      ) : (
        <div className="table-scroll-wrap">
          <table className="scans-table">
            <thead>
              <tr>
                <th>{t("admin.overview.table.date")}</th>
                <th>{t("admin.failures.reason", "Reason")}</th>
                <th>{t("admin.failures.details", "Details")}</th>
              </tr>
            </thead>
            <tbody>
              {[...events].reverse().map((event, idx) => (
                <tr key={idx}>
                  <td>{new Date(event.timestamp).toLocaleString(isRTL ? "ar-SA" : "en-US")}</td>
                  <td>
                    <span className="badge badge-error">{String(event.properties.reason).toUpperCase()}</span>
                  </td>
                  <td className="text-caption">
                    <pre style={{ margin: 0, fontSize: "10px" }}>{JSON.stringify(event.properties, null, 2)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
