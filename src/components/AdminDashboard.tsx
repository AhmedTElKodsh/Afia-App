import { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard,
  Database,
  QrCode,
  Download,
  BarChart2,
  Droplets,
  TrendingUp,
  FileJson,
  FileText,
  ScanLine,
  Globe,
  LogOut,
  Eye,
  EyeOff,
  Menu,
  X,
  ShieldCheck,
  Shield,
  Upload,
  AlertTriangle,
  History,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useScanHistory, type StoredScan } from "../hooks/useScanHistory";
import { exportToCSV, exportToJSON } from "../utils/exportResults";
import { exportTrainingDataset, mapScansToTrainingRecords } from "../utils/trainingExporter";
import { BottleManager } from "./BottleManager";
import { QrMockGenerator } from "./QrMockGenerator";
import { ScanReview } from "./ScanReview";
import { AdminUpload } from "./AdminUpload";
import { getAnalyticsEvents } from "../utils/analytics";
import type { AdminTabItem } from "./AdminTabNav";
import { MetricCard } from "./MetricCard";
import { EmptyState } from "./EmptyState";
import "./AdminDashboard.css";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "";
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "";
const SESSION_KEY = "afia_admin_session";
const SESSION_EXPIRES_KEY = "afia_admin_session_expires";

type AdminTab = "overview" | "bottles" | "qrmock" | "export" | "upload" | "failures";

interface AdminDashboardProps {
  onAuthSuccess?: () => void;
  onLogout?: () => void;
}

export function AdminDashboard({ onAuthSuccess, onLogout }: AdminDashboardProps = {}) {
  const { t, i18n } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<StoredScan | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isMobileNavOpen && navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsMobileNavOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileNavOpen]);

  const { scans, getStats } = useScanHistory();
  const stats = getStats();

  const currentLang = i18n.language || 'en';
  const isRTL = currentLang === 'ar';

  const TABS: AdminTabItem<AdminTab>[] = [
    { id: "overview", label: t('admin.tabs.overview'), icon: <LayoutDashboard size={18} /> },
    { id: "bottles", label: t('admin.tabs.bottles'), icon: <Database size={18} /> },
    { id: "qrmock", label: t('admin.tabs.qrmock'), icon: <QrCode size={18} /> },
    { id: "failures", label: t('admin.tabs.failures', 'Scan Failures'), icon: <AlertTriangle size={18} /> },
    { id: "upload", label: t('admin.upload.tab', 'Training Upload'), icon: <Upload size={18} /> },
    { id: "export", label: t('admin.tabs.export'), icon: <Download size={18} /> },
  ];

  useEffect(() => {
    let mounted = true;

    const checkSession = () => {
      const token = sessionStorage.getItem(SESSION_KEY);
      const expiresAt = Number(sessionStorage.getItem(SESSION_EXPIRES_KEY) || "0");
      if (token && expiresAt > Date.now()) {
        if (mounted) {
          setIsAuthenticated(true);
          onAuthSuccess?.();
        }
      } else {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_EXPIRES_KEY);
        if (mounted) setIsAuthenticated(false);
      }
    };

    checkSession();

    // Auto-logout check every minute
    const interval = setInterval(checkSession, 60_000);

    // Brief loading gate so the overview renders data instead of zeros
    const timer = setTimeout(() => { if (mounted) setIsLoading(false); }, 200);

    return () => {
      mounted = false;
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Local password check when no worker is configured
    if (!WORKER_URL) {
      if (!ADMIN_PASSWORD) {
        setError(t('admin.login.errorNotConfigured'));
        return;
      }
      if (password === ADMIN_PASSWORD) {
        const expiresAt = Date.now() + 3600000;
        sessionStorage.setItem(SESSION_KEY, btoa(`${expiresAt}:local`));
        sessionStorage.setItem(SESSION_EXPIRES_KEY, String(expiresAt));
        setIsAuthenticated(true);
        onAuthSuccess?.();
      } else {
        setError(t('admin.login.errorInvalid'));
      }
      return;
    }

    try {
      const res = await fetch(`${WORKER_URL}/admin/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json() as { token: string; expiresAt: number };
        const { token, expiresAt } = data;
        sessionStorage.setItem(SESSION_KEY, token);
        sessionStorage.setItem(SESSION_EXPIRES_KEY, String(expiresAt));
        setIsAuthenticated(true);
        onAuthSuccess?.();
      } else if (res.status === 401) {
        setError(t('admin.login.errorInvalid'));
      } else if (res.status === 503) {
        // Worker has no ADMIN_PASSWORD secret — fall back to local env check (POC only)
        if (ADMIN_PASSWORD && password === ADMIN_PASSWORD) {
          const expiresAt = Date.now() + 3600000;
          sessionStorage.setItem(SESSION_KEY, btoa(`${expiresAt}:local`));
          sessionStorage.setItem(SESSION_EXPIRES_KEY, String(expiresAt));
          setIsAuthenticated(true);
          onAuthSuccess?.();
        } else if (ADMIN_PASSWORD) {
          setError(t('admin.login.errorInvalid'));
        } else {
          setError(t('admin.login.errorNotConfigured'));
        }
      } else {
        setError(t('errors.generic'));
      }
    } catch {
      setError(t('errors.network'));
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_EXPIRES_KEY);
    setIsAuthenticated(false);
    onLogout?.();
  };

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="login-card">
          <div className="login-icon-wrap" aria-hidden="true">
            <ShieldCheck size={32} strokeWidth={1.5} />
          </div>
          <h1>{t('admin.login.title')}</h1>
          <p className="text-secondary">{t('admin.login.subtitle')}</p>
          <form onSubmit={handleLogin}>
            <label htmlFor="admin-pw-input" className="sr-only">
              {t('admin.login.passwordPlaceholder')}
            </label>
            <div className="password-input-wrap">
              <input
                id="admin-pw-input"
                type={showPassword ? 'text' : 'password'}
                className="password-input"
                placeholder={t('admin.login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? t('admin.login.hidePassword', 'Hide password') : t('admin.login.showPassword', 'Show password')}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && <p className="error-message" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary btn-full">
              {t('admin.login.loginButton')}
            </button>
          </form>
          <button className="btn btn-link" onClick={() => window.history.back()}>
            ← {t('admin.login.backToApp')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard layout" dir={isRTL ? 'rtl' : 'ltr'}>
      <a href="#admin-main" className="skip-to-main">
        {t('admin.login.skipToContent')}
      </a>

      <header ref={navRef} className="top-navbar">
        <div className="brand">
          <div className="brand-logo"><Shield size={18} strokeWidth={2.5} /></div>
          <div className="brand-text">
            <div className="brand-name">Afia Tracker</div>
            <div className="brand-sub">{t('admin.header.brandSub', 'Admin Console')}</div>
          </div>
        </div>

        <button 
          className="mobile-menu-toggle" 
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          aria-label={t('admin.menu.toggle', 'Toggle Menu')}
        >
          {isMobileNavOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <nav className={`nav-items-container ${isMobileNavOpen ? 'open' : ''}`}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id as AdminTab); setIsMobileNavOpen(false); }}
            >
              <span className="nav-icon">{tab.icon}</span> 
              <span className="nav-label">{tab.label}</span>
            </button>
          ))}
          
          <div className="nav-divider"></div>
          
          <button
            className="nav-item"
            onClick={() => { toggleLanguage(); setIsMobileNavOpen(false); }}
            aria-label={isRTL ? 'Switch to English' : 'التبديل للعربية'}
            title={isRTL ? 'Switch to English' : 'التبديل للعربية'}
          >
            <span className="nav-icon"><Globe size={18} /></span> 
            <span className="nav-label">{isRTL ? 'EN' : 'عربي'}</span>
          </button>
          
          <button 
            className="nav-item text-danger" 
            onClick={handleLogout}
          >
            <span className="nav-icon"><LogOut size={18} /></span>
            <span className="nav-label">{t('admin.login.logoutButton')}</span>
          </button>
        </nav>
      </header>

      <main id="admin-main" className="main">
        {selectedScan ? (
          <ScanReview 
            scan={selectedScan} 
            onBack={() => setSelectedScan(null)} 
            onSave={(correction) => {
              console.log("Correction saved:", correction);
              setSelectedScan(null);
            }} 
          />
        ) : (
          <>
            <header className="page-header">
               <h1 className="page-title">{TABS.find(t => t.id === activeTab)?.label}</h1>
            </header>
            <div 
              className="tab-panel-content" 
              key={activeTab}
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
            >
            {activeTab === "overview" && (
                <OverviewTab 
                  stats={stats} 
                  scans={scans} 
                  onGoToTestLab={() => window.history.back()} 
                  onReview={(scan) => setSelectedScan(scan)}
                  t={t} 
                  isRTL={isRTL} 
                  isLoading={isLoading} 
                />
              )}
              {activeTab === "bottles" && <BottleManager />}
              {activeTab === "qrmock" && <QrMockGenerator />}
              {activeTab === "failures" && <FailuresTab t={t} isRTL={isRTL} />}
              {activeTab === "export" && <ExportTab scans={scans} t={t} />}
              {activeTab === "upload" && <AdminUpload />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ── Sparkline Card ────────────────────────────────────────────────────────────
function SparklineCard({ scans, t, locale }: { scans: StoredScan[], t: TFunction, locale: string }) {
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
                title={`${day.label}: ${day.count} scan${day.count !== 1 ? "s" : ""}`}
              />
            </div>
            <span className="sparkline-day">{day.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────
interface OverviewTabProps {
  stats: ReturnType<ReturnType<typeof useScanHistory>["getStats"]>;
  scans: ReturnType<typeof useScanHistory>["scans"];
  onGoToTestLab?: () => void;
  onReview: (scan: StoredScan) => void;
  t: TFunction;
  isRTL: boolean;
  isLoading?: boolean;
}

function OverviewTab({ stats, scans, onGoToTestLab, onReview, t, isRTL, isLoading }: OverviewTabProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const maxRecentScans = 50;

  // All hooks must be called before any early returns
  const feedbackSummary = useMemo(() => {
    const counts = { accurate: 0, too_high: 0, too_low: 0, way_off: 0 };
    scans.forEach(s => {
      if (s.feedbackRating && s.feedbackRating in counts) {
        counts[s.feedbackRating as keyof typeof counts]++;
      }
    });
    return counts;
  }, [scans]);

  const totalFeedback = feedbackSummary.accurate + feedbackSummary.too_high + feedbackSummary.too_low + feedbackSummary.way_off;
  const relevantScans = scans.slice(0, maxRecentScans);
  const totalPages = Math.ceil(relevantScans.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedScans = relevantScans.slice(startIndex, startIndex + itemsPerPage);

  // Skeleton — shown until localStorage is read (≤200ms)
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
          subValue={stats.mae !== "N/A" ? (Number(stats.mae) < 5 ? "Excellent" : "Needs Training") : "Pending Review"}
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
              <div className="feedback-bar feedback-bar--accurate" style={{ width: `${totalFeedback ? (feedbackSummary.accurate / totalFeedback) * 100 : 0}%` }} />
            </div>
            <span className="feedback-value">{feedbackSummary.accurate}</span>
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
                      <td>{scan.bottleName}</td>
                      <td>
                        <div className="fill-mini-bar-wrap" aria-label={`${scan.fillPercentage}% full`} title={`${scan.fillPercentage}% full`}>
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

// ── Export Tab ────────────────────────────────────────────────────────────────
interface ExportTabProps {
  scans: ReturnType<typeof useScanHistory>["scans"];
  t: TFunction;
}

const DATE_RANGE_OPTIONS = [
  { value: "all" as const, labelKey: "admin.export.dateRange.allTime" },
  { value: 7 as const, labelKey: "admin.export.dateRange.last7Days" },
  { value: 30 as const, labelKey: "admin.export.dateRange.last30Days" },
];

function ExportTab({ scans, t }: ExportTabProps) {
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
// -- Failures Tab -------------------------------------------------------------
function FailuresTab({ t, isRTL }: { t: TFunction, isRTL: boolean }) {
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
