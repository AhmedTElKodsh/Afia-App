import { WifiOff, History, RotateCcw } from "lucide-react";
import { OFFLINE_CONFIG } from "../config/offline.ts";
import "./OfflineBanner.css";

/**
 * OfflineBanner Component
 * 
 * Displays network offline state with recovery options.
 * Following Direction 1 (Spitfire Minimal) + Direction 5 (Swiss Precision) design system.
 * 
 * Features:
 * - Clear error messaging
 * - Primary + secondary actions
 * - WCAG 2.1 AA compliant
 * - Premium dark theme
 */

export interface OfflineBannerProps {
  /** Error type (default: 'offline') */
  errorType?: 'offline' | 'camera_error' | 'analysis_error' | 'unknown';
  /** Callback when primary action clicked */
  onRetry?: () => void;
  /** Callback when secondary action clicked */
  onViewHistory?: () => void;
  /** Whether to show as compact inline banner */
  compact?: boolean;
}

export function OfflineBanner({
  errorType = 'offline',
  onRetry,
  onViewHistory,
  compact = false,
}: OfflineBannerProps) {
  const message = OFFLINE_CONFIG.messages[errorType];

  if (!message) {
    return null;
  }

  const IconComponent = errorType === 'offline' ? WifiOff : RotateCcw;

  return (
    <div 
      className={`offline-banner offline-banner--${compact ? 'compact' : 'full'}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="offline-banner-icon" aria-hidden="true">
        <IconComponent size={compact ? 32 : 48} strokeWidth={1.5} />
      </div>

      <div className="offline-banner-content">
        <h3 className="offline-banner-title">{message.title}</h3>
        <p className="offline-banner-description">{message.description}</p>

        <div className="offline-banner-actions">
          {onRetry && (
            <button
              className="offline-banner-btn offline-banner-btn--primary"
              onClick={onRetry}
              type="button"
            >
              <RotateCcw size={16} strokeWidth={2.5} />
              {message.primaryAction}
            </button>
          )}

          {onViewHistory && errorType === 'offline' && message.secondaryAction && (
            <button
              className="offline-banner-btn offline-banner-btn--secondary"
              onClick={onViewHistory}
              type="button"
            >
              <History size={16} strokeWidth={2.5} />
              {message.secondaryAction}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
