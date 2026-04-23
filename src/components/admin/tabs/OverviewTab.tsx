import { useState, useMemo } from "react";
import { BarChart2, Globe, TrendingUp, Droplets, ScanLine, Eye } from "lucide-react";
import type { TFunction } from "i18next";
import type { StoredScan } from "../../../hooks/useScanHistory.ts";
import { ModelVersionPanel } from "../ModelVersionPanel.tsx";
import { SparklineCard } from "../SparklineCard.tsx";
import { MetricCard } from "../../MetricCard.tsx";
import { EmptyState } from "../../EmptyState.tsx";

interface OverviewTabProps {
  stats: {
    totalScans: number;
    activeUsers: number;
    totalConsumedMl: number;
    mae: string;
  };
  scans: StoredScan[];
  onGoToTestLab?: () => void;
  onReview: (scan: StoredScan) => void;
  t: TFunction;
  isRTL: boolean;
  isLoading?: boolean;
}

export function OverviewTab({ stats, scans, onGoToTestLab, onReview, t, isRTL, isLoading }: OverviewTabProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const maxRecentScans = 50;

  const feedbackSummary = useMemo(() => {
    const counts = { about_right: 0, too_high: 0, too_low: 0, way_off: 0 };
    scans.forEach(s => {
      if (s.feedbackRating && s.feedbackRating in counts) {
        counts[s.feedbackRating as keyof typeof counts]++;
      }
    });
    return counts;
  }, [scans]);

  const totalFeedback = feedbackSummary.about_right + feedbackSummary.too_high + feedbackSummary.too_low + feedbackSummary.way_off;
  const relevantScans = scans.slice(0, maxRecentScans);
  const totalPages = Math.ceil(relevantScans.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedScans = relevantScans.slice(startIndex, startIndex + itemsPerPage);

  if (isLoading) {
    return (
      <div className="overview-tab">
        <div className="skeleton skeleton-sparkline" aria-hidden="true" />
        <div className="metrics-grid">
          {[0,1,2,3].map(i => <div key={i} className="skeleton skeleton-metric-card" aria-hidden="true" />)}
        </div>
        <div className="skeleton skeleton-section-block" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="overview-tab">
      <ModelVersionPanel t={t} />
      
      <SparklineCard scans={scans} t={t} locale={isRTL ? 'ar-SA' : 'en-US'} />
      
      <div className="metrics-grid">
        <MetricCard
          icon={<BarChart2 size={20} />}
          value={stats.totalScans}
          label={t('admin.overview.metrics.totalScans')}
        />
        <MetricCard
          icon={<Globe size={20} />}
          value={stats.activeUsers}
          label={t('admin.overview.metrics.activeUsers', 'Active Users')}
        />
        <MetricCard
          icon={<TrendingUp size={20} />}
          value={totalFeedback}
          label={t('admin.overview.metrics.feedbackCount', 'Feedback Count')}
        />
        <MetricCard
          icon={<Droplets size={20} />}
          value={`${stats.totalConsumedMl}${t('common.ml')}`}
          label={t('admin.overview.metrics.totalConsumed')}
        />
        <MetricCard
          icon={<TrendingUp size={20} />}
          value={stats.mae !== "N/A" ? `${stats.mae}%` : "N/A"}
          label={t('admin.overview.metrics.mae', 'Model Error (MAE)')}
          subValue={stats.mae !== "N/A" 
            ? (Number(stats.mae) < 5 ? t('admin.modelVersion.maeExcellent', 'Excellent') : t('admin.modelVersion.maeNeedsImprovement', 'Needs Training')) 
            : t('admin.modelVersion.pendingReview', 'Pending Review')}
        />
      </div>

      <div className="feedback-summary-section">
        <div className="section-header">
          <h2>{t('admin.overview.feedbackSummary.title', 'Feedback Summary')}</h2>
        </div>
        <div className="feedback-stats-grid">
          <div className="feedback-stat-item">
            <span className="feedback-label">{t('admin.overview.feedback.accurate', 'Accurate')}</span>
            <div className="feedback-bar-wrap">
              <div className="feedback-bar feedback-bar--accurate" style={{ width: `${totalFeedback ? (feedbackSummary.about_right / totalFeedback) * 100 : 0}%` }} />
            </div>
            <span className="feedback-value">{feedbackSummary.about_right}</span>
          </div>
          <div className="feedback-stat-item">
            <span className="feedback-label">{t('admin.overview.feedback.tooHigh', 'Too High')}</span>
            <div className="feedback-bar-wrap">
              <div className="feedback-bar feedback-bar--warning" style={{ width: `${totalFeedback ? (feedbackSummary.too_high / totalFeedback) * 100 : 0}%` }} />
            </div>
            <span className="feedback-value">{feedbackSummary.too_high}</span>
          </div>
          <div className="feedback-stat-item">
            <span className="feedback-label">{t('admin.overview.feedback.tooLow', 'Too Low')}</span>
            <div className="feedback-bar-wrap">
              <div className="feedback-bar feedback-bar--warning" style={{ width: `${totalFeedback ? (feedbackSummary.too_low / totalFeedback) * 100 : 0}%` }} />
            </div>
            <span className="feedback-value">{feedbackSummary.too_low}</span>
          </div>
          <div className="feedback-stat-item">
            <span className="feedback-label">{t('admin.overview.feedback.wayOff', 'Way Off')}</span>
            <div className="feedback-bar-wrap">
              <div className="feedback-bar feedback-bar--danger" style={{ width: `${totalFeedback ? (feedbackSummary.way_off / totalFeedback) * 100 : 0}%` }} />
            </div>
            <span className="feedback-value">{feedbackSummary.way_off}</span>
          </div>
        </div>
      </div>

      <div className="recent-scans">
        <div className="recent-scans-header">
          <h2>{t('admin.overview.recentScans.title')}</h2>
          <span className="recent-scans-badge">{t('admin.overview.recentScans.badge')}</span>
        </div>

        {paginatedScans.length === 0 ? (
          <EmptyState
            icon={<ScanLine size={32} />}
            title={t('admin.overview.recentScans.emptyTitle')}
            description={t('admin.overview.recentScans.emptyDescription')}
            cta={onGoToTestLab ? { label: t('admin.overview.recentScans.ctaLabel'), onClick: onGoToTestLab } : undefined}
          />
        ) : (
          <>
            <div className="table-scroll-wrap" tabIndex={0} role="region" aria-label={t('admin.overview.table.caption') || 'Recent Scans'}>
              <table className="scans-table">
                <caption className="sr-only">{t('admin.overview.table.caption')}</caption>
                <thead>
                  <tr>
                    <th>{t('admin.overview.table.date')}</th>
                    <th>{t('admin.overview.table.bottle')}</th>
                    <th>{t('admin.overview.table.fillPercent')}</th>
                    <th>{t('admin.overview.table.consumed')}</th>
                    <th>{t('admin.overview.table.confidence')}</th>
                    <th>{t('common.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedScans.map((scan, idx) => (
                    <tr key={scan.id ?? `row-${idx}`}>
                      <td>{new Date(scan.timestamp.replace(' ', 'T')).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</td>
                      <td>{t(`bottles.${scan.sku}`, { defaultValue: scan.bottleName })}</td>
                      <td>
                        <div className="fill-mini-bar-wrap" aria-label={`${scan.fillPercentage}% ${t('results.fillLevel')}`} title={`${scan.fillPercentage}% ${t('results.fillLevel')}`}>
                          <div className="fill-mini-bar" aria-hidden="true">
                            <div className="fill-mini-bar-inner" style={{ width: `${scan.fillPercentage}%` }} />
                          </div>
                          <span aria-hidden="true">{scan.fillPercentage}%</span>
                        </div>
                      </td>
                      <td>{scan.consumedMl ?? 0}{t('common.ml')}</td>
                      <td>
                        <span className={`confidence-badge-${scan.confidence}`}>
                          {scan.confidence === 'high' ? t('results.confidenceHigh') : 
                           scan.confidence === 'medium' ? t('results.confidenceMedium') : 
                           t('results.confidenceLow')}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-ghost btn-xs btn-icon-text"
                          onClick={() => onReview(scan)}
                        >
                          <Eye size={14} /> {t('common.edit', 'Review')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  {t('admin.overview.pagination.previous', 'Previous')}
                </button>
                <span className="pagination-info">
                  {t('admin.overview.pagination.info', { current: currentPage, total: totalPages, defaultValue: `Page ${currentPage} of ${totalPages}` })}
                </span>
                <button
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  {t('admin.overview.pagination.next', 'Next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
