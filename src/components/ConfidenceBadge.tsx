import { Check, AlertTriangle, X } from "lucide-react";
import { CONFIDENCE_CONFIG, type ConfidenceLevel } from "../config/confidence.ts";
import "./ConfidenceBadge.css";

/**
 * ConfidenceBadge Component
 * 
 * Displays AI confidence level with color-coded badge and plain language explanation.
 * Following Direction 1 (Spitfire Minimal) + Direction 5 (Swiss Precision) design system.
 * 
 * Features:
 * - Color-coded by confidence level (green/amber/red)
 * - Plain language explanations
 * - Icon indicators
 * - WCAG 2.1 AA compliant
 * - Premium dark theme
 */

export interface ConfidenceBadgeProps {
  /** Confidence level from AI */
  level: ConfidenceLevel;
  /** Optional: Custom reason for low confidence */
  reason?: string;
  /** Optional: Custom aria-label */
  ariaLabel?: string;
  /** Optional: ID for aria-describedby to provide additional context */
  ariaDescribedBy?: string;
  /** Size variant (default: 'md') */
  size?: 'sm' | 'md';
}

/**
 * Size variants configuration
 */
const SIZE_CONFIG = {
  sm: {
    padding: 'var(--space-xs) var(--space-sm)',
    fontSize: 'var(--font-size-small)',
    iconSize: 12,
  },
  md: {
    padding: 'var(--space-sm) var(--space-md)',
    fontSize: 'var(--font-size-body)',
    iconSize: 16,
  },
} as const;

export function ConfidenceBadge({
  level,
  reason,
  ariaLabel,
  ariaDescribedBy,
  size = 'md',
}: ConfidenceBadgeProps) {
  const sizeConfig = SIZE_CONFIG[size];
  const colorConfig = CONFIDENCE_CONFIG.colors[level];
  const message = CONFIDENCE_CONFIG.messages[level];

  // Get icon based on confidence level
  const IconComponent = level === 'high' ? Check : level === 'medium' ? AlertTriangle : X;

  return (
    <div
      className={`confidence-badge confidence-badge--${level} confidence-badge--${size}`}
      role="status"
      aria-label={ariaLabel || message}
      aria-describedby={ariaDescribedBy}
      style={{
        '--badge-bg': colorConfig.bg,
        '--badge-border': colorConfig.border,
        '--badge-text': colorConfig.text,
        '--badge-padding': sizeConfig.padding,
        '--badge-font-size': sizeConfig.fontSize,
      } as React.CSSProperties}
    >
      <span className="confidence-icon" aria-hidden="true">
        <IconComponent size={sizeConfig.iconSize} strokeWidth={2.5} />
      </span>
      <span className="confidence-message">{message}</span>
      {reason && level === 'low' && (
        <span className="confidence-reason"> - {reason}</span>
      )}
    </div>
  );
}
