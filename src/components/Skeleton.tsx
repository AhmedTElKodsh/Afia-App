import "./Skeleton.css";

/**
 * Skeleton Loading Component
 *
 * Premium glassmorphic skeleton loaders for lazy-loaded components.
 * Provides visual feedback during loading states and prevents layout shift.
 *
 * Features:
 * - Shimmer animation
 * - Multiple variants (text, card, chart, list)
 * - Accessible with aria-busy
 * - Respects reduced motion
 */

export interface SkeletonProps {
  /** Type of skeleton element */
  variant?: 'text' | 'card' | 'circle' | 'chart' | 'list-item' | 'metric';
  /** Width override */
  width?: string | number;
  /** Height override */
  height?: string | number;
  /** Number of lines for text variant */
  lines?: number;
  /** Custom class name */
  className?: string;
  /** Optional label for screen readers */
  ariaLabel?: string;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = '',
  ariaLabel = 'Loading content...',
}: SkeletonProps) {
  const style = {
    width,
    height,
  } as React.CSSProperties;

  if (variant === 'text') {
    return (
      <div
        className={`skeleton skeleton-text ${className}`}
        style={style}
        aria-busy="true"
        aria-label={ariaLabel}
      >
        {Array.from({ length: lines }).map((_, i) => (
          <span
            key={i}
            className="skeleton-line"
            style={{ width: i === lines - 1 ? '60%' : undefined }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`skeleton skeleton-card ${className}`}
        style={style}
        aria-busy="true"
        aria-label={ariaLabel}
      >
        <div className="skeleton-card__header">
          <span className="skeleton-line skeleton-card__title" />
        </div>
        <div className="skeleton-card__content">
          <span className="skeleton-line" />
          <span className="skeleton-line" style={{ width: '80%' }} />
        </div>
      </div>
    );
  }

  if (variant === 'circle') {
    return (
      <div
        className={`skeleton skeleton-circle ${className}`}
        style={{
          ...style,
          width: width || height || '48px',
          height: height || width || '48px',
          borderRadius: '50%',
        }}
        aria-busy="true"
        aria-label={ariaLabel}
      />
    );
  }

  if (variant === 'chart') {
    return (
      <div
        className={`skeleton skeleton-chart ${className}`}
        style={style}
        aria-busy="true"
        aria-label={ariaLabel}
      >
        <div className="skeleton-chart__bars">
          {Array.from({ length: 7 }).map((_, i) => {
            // Using a simple deterministic "random" height based on index
            // to satisfy React purity rules while keeping the visual variety
            const variety = ((i * 13) % 60) + 20;
            return (
              <div
                key={i}
                className="skeleton-chart__bar"
                style={{
                  height: `${variety}%`,
                  animationDelay: `${i * 100}ms`,
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === 'list-item') {
    return (
      <div
        className={`skeleton skeleton-list-item ${className}`}
        aria-busy="true"
        aria-label={ariaLabel}
      >
        <span className="skeleton-list-item__icon" />
        <div className="skeleton-list-item__content">
          <span className="skeleton-line skeleton-list-item__title" />
          <span className="skeleton-line skeleton-list-item__subtitle" />
        </div>
      </div>
    );
  }

  if (variant === 'metric') {
    return (
      <div
        className={`skeleton skeleton-metric ${className}`}
        style={style}
        aria-busy="true"
        aria-label={ariaLabel}
      >
        <span className="skeleton-line skeleton-metric__icon" />
        <div className="skeleton-metric__values">
          <span className="skeleton-line skeleton-metric__value" />
          <span className="skeleton-line skeleton-metric__label" />
        </div>
      </div>
    );
  }

  return null;
}

/**
 * SkeletonHistory - Pre-configured skeleton for ScanHistory page
 */
export function SkeletonHistory() {
  return (
    <div className="skeleton-history" aria-busy="true" aria-label="Loading scan history...">
      <div className="skeleton-history__header">
        <Skeleton variant="text" width="150px" height="24px" ariaLabel="Loading title" />
        <Skeleton variant="circle" width="60px" height="24px" ariaLabel="Loading count badge" />
      </div>

      <div className="skeleton-history__stats">
        <Skeleton variant="metric" ariaLabel="Loading total scans" />
        <Skeleton variant="metric" ariaLabel="Loading total consumed" />
      </div>

      <Skeleton variant="chart" height="120px" ariaLabel="Loading consumption trend" />

      <div className="skeleton-history__filters">
        <Skeleton variant="text" width="200px" height="40px" ariaLabel="Loading date filters" />
        <Skeleton variant="text" width="100%" height="40px" ariaLabel="Loading search input" />
      </div>

      <div className="skeleton-history__list">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="list-item" ariaLabel={`Loading scan ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonAdmin - Pre-configured skeleton for AdminDashboard
 */
export function SkeletonAdmin() {
  return (
    <div className="skeleton-admin" aria-busy="true" aria-label="Loading admin dashboard...">
      <Skeleton variant="text" width="200px" height="32px" ariaLabel="Loading dashboard title" />

      <div className="skeleton-admin__stats">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" ariaLabel={`Loading stat ${i + 1}`} />
        ))}
      </div>

      <div className="skeleton-admin__content">
        <Skeleton variant="card" height="300px" ariaLabel="Loading dashboard content" />
      </div>
    </div>
  );
}
