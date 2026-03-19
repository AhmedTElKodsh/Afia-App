import "./LoadingShell.css";

type ShellVariant = "history" | "scan" | "admin";

interface LoadingShellProps {
  /** Which view is loading — determines skeleton shape */
  variant?: ShellVariant;
}

/**
 * LoadingShell
 *
 * Skeleton placeholder shown inside <Suspense> while a lazy component loads.
 * H10/L4 fix: Replaces the jarring "Loading..." text flash with a
 * context-appropriate animated skeleton that matches the target view structure.
 */
export function LoadingShell({ variant = "scan" }: LoadingShellProps) {
  if (variant === "history") {
    return (
      <div className="loading-shell loading-shell--history" aria-busy="true" aria-label="Loading history">
        {/* Header skeleton */}
        <div className="skeleton skeleton-bar sh-header" />
        {/* Stats row */}
        <div className="sh-stats-row">
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </div>
        {/* Trend chart */}
        <div className="skeleton skeleton-card sh-trend" />
        {/* Pills */}
        <div className="sh-pills">
          <div className="skeleton skeleton-pill" />
          <div className="skeleton skeleton-pill" style={{ width: 72 }} />
          <div className="skeleton skeleton-pill" style={{ width: 80 }} />
        </div>
        {/* Timeline items */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-card sh-item" style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
    );
  }

  if (variant === "admin") {
    return (
      <div className="loading-shell loading-shell--admin" aria-busy="true" aria-label="Loading dashboard">
        {/* Stat cards */}
        <div className="sh-admin-stats">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-card sh-admin-card" style={{ animationDelay: `${i * 0.07}s` }} />
          ))}
        </div>
        {/* Chart placeholder */}
        <div className="skeleton skeleton-card sh-admin-chart" />
        {/* Table rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-bar sh-admin-row" style={{ animationDelay: `${i * 0.06}s` }} />
        ))}
      </div>
    );
  }

  // default: scan/landing
  return (
    <div className="loading-shell loading-shell--scan" aria-busy="true" aria-label="Loading">
      <div className="skeleton skeleton-pill sh-pill-center" />
      <div className="skeleton sh-gauge-circle" />
      <div className="skeleton skeleton-card sh-card" />
      <div className="skeleton skeleton-bar sh-btn" />
      <div className="skeleton skeleton-card sh-sparkline" />
    </div>
  );
}
