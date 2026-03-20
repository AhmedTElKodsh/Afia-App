import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useScanHistory, type StoredScan } from "../hooks/useScanHistory";
import { TimelineGroup } from "./TimelineGroup";
import { EmptyState } from "./EmptyState";
import { MetricCard } from "./MetricCard";
import { InlineConfirm } from "./InlineConfirm";
import { formatDate, formatTime } from "../utils/formatters";
import {
  History,
  Droplets,
  BarChart2,
  ScanLine,
  Search,
  X,
  TrendingUp,
} from "lucide-react";
import { List, type ListProps } from "react-window";
import "./ScanHistory.css";

type DateRange = "all" | 7 | 30;

// Typed list props helper - rowProps should NOT include index/style (provided by List)
type ScanRowProps = {
  scans: StoredScan[];
  onScanClick: (scan: StoredScan) => void;
};

type ScanListProps = Omit<ListProps<ScanRowProps>, 'rowComponent' | 'rowCount' | 'rowHeight' | 'defaultHeight' | 'rowProps'> & {
  scans: StoredScan[];
  onScanClick: (scan: StoredScan) => void;
};

function ScanVirtualizedList({ scans, onScanClick, ...rest }: ScanListProps) {
  return (
    <List<ScanRowProps>
      defaultHeight={Math.min(scans.length * 72, 600)}
      rowCount={scans.length}
      rowHeight={72}
      rowProps={{ scans, onScanClick }}
      rowComponent={VirtualizedScanRow}
      {...rest}
    />
  );
}

// Virtualized row component for large lists
interface VirtualizedScanRowProps {
  index: number;
  style: React.CSSProperties;
  scans: StoredScan[];
  onScanClick: (scan: StoredScan) => void;
}

function VirtualizedScanRow({ index, style, scans, onScanClick }: VirtualizedScanRowProps) {
  const scan = scans[index];
  return (
    <div
      style={style}
      className="virtualized-list-item"
      role="listitem"
      onClick={() => onScanClick(scan)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onScanClick(scan);
        }
      }}
      tabIndex={0}
      aria-label={`${scan.bottleName}, ${formatDate(scan.timestamp)}, ${scan.fillPercentage}% fill remaining`}
    >
      <div className="scan-history-item">
        <div className="scan-history-item__icon">
          <History size={20} />
        </div>
        <div className="scan-history-item__content">
          <p className="scan-history-item__title">{scan.bottleName}</p>
          <p className="scan-history-item__meta">
            {formatDate(scan.timestamp)} &middot; {scan.fillPercentage}% fill
          </p>
        </div>
        <div className="scan-history-item__value">
          {scan.remainingMl}ml
        </div>
      </div>
    </div>
  );
}

// ── Mini Consumption Trend Card ──────────────────────────────────────────────
interface MiniTrendCardProps {
  scans: StoredScan[];
}

function MiniTrendCard({ scans }: MiniTrendCardProps) {
  const { t } = useTranslation();
  const days = useMemo(() => {
    const result: { label: string; consumed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split("T")[0];
      const consumed = scans
        .filter((s) => {
          if (!s.timestamp) return false;
          // Normalize space-separated timestamps to ISO before comparing
          const normalized = s.timestamp.includes("T")
            ? s.timestamp
            : s.timestamp.replace(" ", "T");
          return normalized.startsWith(dayStr);
        })
        .reduce((sum, s) => sum + s.consumedMl, 0);
      result.push({
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        consumed,
      });
    }
    return result;
  }, [scans]);

  const maxConsumed = Math.max(...days.map((d) => d.consumed), 1);

  return (
    <div className="mini-trend-card card card-compact">
      <div className="mini-trend-header">
        <div className="mini-trend-title">
          <TrendingUp size={14} />
          <span>{t('history.consumptionTrend')}</span>
        </div>
        <span className="mini-trend-sub">{t('history.last7Days')}</span>
      </div>
      <div className="mini-trend-bars">
        {days.map((day, i) => (
          <div key={i} className="mini-trend-bar-col">
            <div className="mini-trend-bar-track">
              <div
                className={`mini-trend-bar${day.consumed > 0 ? " mini-trend-bar--active" : ""}`}
                style={{
                  height: `${Math.max((day.consumed / maxConsumed) * 100, 4)}%`,
                }}
                title={`${day.label}: ${day.consumed}ml`}
              />
            </div>
            <span className="mini-trend-day">{day.label.slice(0, 2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
interface ScanHistoryProps {
  onNavigateToScan?: () => void;
}

export function ScanHistory({ onNavigateToScan }: ScanHistoryProps = {}) {
  const { t } = useTranslation();
  const { scans, searchScans, getScansByDateRange, deleteScan, clearHistory, getStats } =
    useScanHistory();
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScan, setSelectedScan] = useState<StoredScan | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const filteredScans = useMemo(() => {
    let filtered =
      dateRange === "all" ? scans : getScansByDateRange(dateRange as number);
    if (searchQuery.trim()) {
      filtered = searchScans(searchQuery);
    }
    return filtered;
  }, [scans, dateRange, searchQuery, getScansByDateRange, searchScans]);

  const stats = useMemo(() => getStats(), [getStats]);

  if (scans.length === 0) {
    return (
      <div className="scan-history scan-history-empty">
        <EmptyState
          icon={<ScanLine size={36} />}
          title={t('history.empty')}
          description={t('history.emptyDescription')}
          cta={onNavigateToScan ? { label: t('history.scanCta'), onClick: onNavigateToScan } : undefined}
        />
      </div>
    );
  }

  return (
    <div className="scan-history">
      {/* ── Header ── */}
      <header className="history-header">
        <h2>{t('history.title')}</h2>
        <span className="history-count-badge">{t('history.scansCount', { count: scans.length })}</span>
      </header>

      {/* ── Stats row ── */}
      <div className="history-stats-row">
        <MetricCard
          icon={<BarChart2 size={18} />}
          value={stats.totalScans}
          label={t('history.totalScans')}
        />
        <MetricCard
          icon={<Droplets size={18} />}
          value={`${stats.totalConsumedMl}${t('common.ml')}`}
          label={t('history.totalConsumed')}
        />
      </div>

      {/* ── Mini Trend Chart ── */}
      <MiniTrendCard scans={scans} />

      {/* ── Filters ── */}
      <div className="history-filters">
        {/* Date range pills */}
        <div className="date-range-filter" role="group" aria-label="Date range">
          {(
            [
              { value: "all", label: t('history.filterAll') },
              { value: 7, label: t('history.filter7Days') },
              { value: 30, label: t('history.filter30Days') },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              className={`pill-btn${dateRange === value ? " active" : ""}`}
              onClick={() => setDateRange(value)}
              aria-pressed={dateRange === value}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="search-wrap">
          <Search size={15} className="search-icon" aria-hidden="true" />
          <input
            type="text"
            className="search-input"
            placeholder={t('history.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t('history.searchAriaLabel')}
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => setSearchQuery("")}
              aria-label={t('history.clearSearch')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── History List ── */}
      <div className="history-list">
        {filteredScans.length === 0 ? (
          <EmptyState
            icon={<History size={28} />}
            title={t('history.noResults')}
            description={t('history.noResultsDesc')}
          />
        ) : filteredScans.length > 100 ? (
          /* Virtualized list for large datasets (100+ scans) */
          <ScanVirtualizedList
            scans={filteredScans}
            onScanClick={setSelectedScan}
            className="virtualized-list"
            role="list"
            aria-label={t('history.listAriaLabel')}
          />
        ) : (
          <TimelineGroup
            scans={filteredScans}
            onScanClick={setSelectedScan}
          />
        )}
      </div>

      {/* ── Clear history ── */}
      {scans.length > 0 && (
        <div className="history-actions">
          {confirmClear ? (
            <InlineConfirm
              message={t('history.clearConfirm')}
              confirmLabel={t('history.clearConfirmYes')}
              onConfirm={() => {
                clearHistory();
                setConfirmClear(false);
              }}
              onCancel={() => setConfirmClear(false)}
            />
          ) : (
            <button
              className="btn btn-danger"
              onClick={() => setConfirmClear(true)}
              aria-label={t('history.clearHistoryAriaLabel')}
            >
              {t('history.clearHistory')}
            </button>
          )}
        </div>
      )}

      {/* ── Scan detail modal ── */}
      {selectedScan && (
        <ScanDetailModal
          scan={selectedScan}
          onClose={() => setSelectedScan(null)}
          onDelete={() => {
            deleteScan(selectedScan.id);
            setSelectedScan(null);
          }}
        />
      )}
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
interface ScanDetailModalProps {
  scan: StoredScan;
  onClose: () => void;
  onDelete: () => void;
}

function ScanDetailModal({ scan, onClose, onDelete }: ScanDetailModalProps) {
  const { t } = useTranslation();
  return (
    <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="scan-detail-title"
        >
        <header className="modal-header">
          <h3 id="scan-detail-title">{t('history.scanDetails')}</h3>
          <button className="modal-close" onClick={onClose} aria-label={t('history.closeScanDetails')}>
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        <div className="modal-body">
          <div className="detail-section">
            <h4>{t('history.bottle')}</h4>
            <p className="detail-value">{scan.bottleName}</p>
            <p className="detail-meta">{t('history.skuLabel', { sku: scan.sku })}</p>
          </div>

          <div className="detail-section">
            <h4>{t('history.dateTime')}</h4>
            <p className="detail-value">{formatDate(scan.timestamp)}</p>
            <p className="detail-meta">{formatTime(scan.timestamp)}</p>
          </div>

          <div className="detail-section">
            <h4>{t('history.fillLevel')}</h4>
            <div className="fill-detail">
              <span className="fill-percent">{scan.fillPercentage}%</span>
              <span className="fill-label">{t('history.remaining')}</span>
            </div>
          </div>

          <div className="detail-section">
            <h4>{t('results.volume')}</h4>
            <div className="volume-detail">
              <div>
                <span className="volume-label">{t('results.remaining')}</span>
                <span className="volume-value">{scan.remainingMl}{t('common.ml')}</span>
              </div>
              <div>
                <span className="volume-label">{t('results.consumed')}</span>
                <span className="volume-value">{scan.consumedMl}{t('common.ml')}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h4>{t('history.confidence')}</h4>
            <div className={`confidence-detail-${scan.confidence ?? "unknown"}`}>
              {scan.confidence
                ? scan.confidence.charAt(0).toUpperCase() + scan.confidence.slice(1)
                : t('history.confidenceUnknown')}
            </div>
          </div>

          {scan.feedbackRating && (
            <div className="detail-section">
              <h4>{t('history.yourFeedback')}</h4>
              <p className="detail-value">{scan.feedbackRating.replace("_", " ")}</p>
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <button className="btn btn-danger" onClick={onDelete}>
            {t('common.delete')}
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            {t('common.close')}
          </button>
        </footer>
      </div>
    </div>
  );
}
