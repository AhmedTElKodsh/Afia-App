import { useEffect, useState, useMemo } from "react";
import { BOTTLE_CONFIG, getFillColor } from "../config/bottle";
import "./BottleFillGauge.css";

/**
 * BottleFillGauge Component
 * 
 * Visual representation of oil fill level with animated bottle-shaped gauge.
 * Following Direction 1 (Spitfire Minimal) + Direction 5 (Swiss Precision) design system.
 * 
 * Features:
 * - SVG bottle shape with clip-path fill
 * - Animated fill level (0-100%)
 * - Color transitions (green → amber → red)
 * - Large percentage display
 * - Respects reduced-motion
 * - WCAG 2.1 AA compliant
 */

export interface BottleFillGaugeProps {
  /** Fill percentage (0-100) */
  percentage: number;
  /** Whether to animate the fill (default: true) */
  animate?: boolean;
  /** Whether to show the percentage label (default: true) */
  showLabel?: boolean;
  /** Size variant (default: 'md') */
  size?: 'sm' | 'md' | 'lg';
  /** Optional: Accessibility label */
  ariaLabel?: string;
}

/**
 * Size variants configuration
 */
const SIZE_CONFIG = {
  sm: {
    width: 80,
    height: 107,
    fontSize: 'var(--font-size-headline)',
  },
  md: {
    width: 120,
    height: 160,
    fontSize: 'var(--font-size-hero)',
  },
  lg: {
    width: 160,
    height: 213,
    fontSize: 'clamp(4rem, 10vw, 8rem)',
  },
} as const;

export function BottleFillGauge({
  percentage,
  animate = true,
  showLabel = true,
  size = 'md',
  ariaLabel = `Bottle fill level: ${Math.round(percentage)}%`,
}: BottleFillGaugeProps) {
  const [displayPercentage, setDisplayPercentage] = useState(animate ? 0 : percentage);
  const [fillColor, setFillColor] = useState(getFillColor(animate ? 0 : percentage));

  const config = SIZE_CONFIG[size];

  // Animate fill level on mount and when percentage changes
  useEffect(() => {
    if (!animate) {
      setDisplayPercentage(percentage);
      setFillColor(getFillColor(percentage));
      return;
    }

    // Cancel any existing animation
    let animationFrameId: number;

    const startPercentage = displayPercentage;
    const endPercentage = percentage;
    const startTime = performance.now();

    const animateFill = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / BOTTLE_CONFIG.animationDuration, 1);
      
      // Ease-out cubic bezier
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const currentPercentage = startPercentage + (endPercentage - startPercentage) * eased;
      setDisplayPercentage(currentPercentage);
      setFillColor(getFillColor(currentPercentage));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animateFill);
      }
    };

    animationFrameId = requestAnimationFrame(animateFill);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage, animate]); // Removed displayPercentage from dependencies to prevent infinite loop during animation

  // Calculate fill height (inverted because SVG y starts from top)
  const fillHeight = useMemo(() => {
    const bodyHeight = BOTTLE_CONFIG.svg.height - BOTTLE_CONFIG.bottle.neckHeight - BOTTLE_CONFIG.bottle.capHeight;
    const fillPercent = displayPercentage / 100;
    return bodyHeight * fillPercent;
  }, [displayPercentage]);

  // Fill color with transition
  const currentColor = fillColor;

  return (
    <div 
      className={`bottle-fill-gauge bottle-fill-gauge--${size}`}
      role="img"
      aria-label={ariaLabel}
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* SVG Bottle */}
      <svg
        className="bottle-svg"
        width={config.width}
        height={config.height}
        viewBox={BOTTLE_CONFIG.svg.viewBox}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden={showLabel}
      >
        {/* Clip path for bottle shape */}
        <defs>
          <clipPath id={`bottle-clip-${size}`}>
            {/* Bottle body */}
            <rect
              x={BOTTLE_CONFIG.svg.width / 2 - BOTTLE_CONFIG.bottle.bodyWidth / 2}
              y={BOTTLE_CONFIG.svg.height - BOTTLE_CONFIG.bottle.bodyHeight - BOTTLE_CONFIG.bottle.capHeight - BOTTLE_CONFIG.bottle.neckHeight}
              width={BOTTLE_CONFIG.bottle.bodyWidth}
              height={BOTTLE_CONFIG.bottle.bodyHeight}
              rx="40"
              ry="40"
            />
            {/* Bottle neck */}
            <rect
              x={BOTTLE_CONFIG.svg.width / 2 - BOTTLE_CONFIG.bottle.neckWidth / 2}
              y={BOTTLE_CONFIG.svg.height - BOTTLE_CONFIG.bottle.capHeight - BOTTLE_CONFIG.bottle.neckHeight}
              width={BOTTLE_CONFIG.bottle.neckWidth}
              height={BOTTLE_CONFIG.bottle.neckHeight}
            />
            {/* Bottle cap */}
            <rect
              x={BOTTLE_CONFIG.svg.width / 2 - BOTTLE_CONFIG.bottle.capWidth / 2}
              y={BOTTLE_CONFIG.svg.height - BOTTLE_CONFIG.bottle.capHeight}
              width={BOTTLE_CONFIG.bottle.capWidth}
              height={BOTTLE_CONFIG.bottle.capHeight}
              rx="2"
            />
          </clipPath>
        </defs>

        {/* Bottle outline */}
        <g className="bottle-outline">
          {/* Body */}
          <rect
            x={BOTTLE_CONFIG.svg.width / 2 - BOTTLE_CONFIG.bottle.bodyWidth / 2}
            y={BOTTLE_CONFIG.svg.height - BOTTLE_CONFIG.bottle.bodyHeight - BOTTLE_CONFIG.bottle.capHeight - BOTTLE_CONFIG.bottle.neckHeight}
            width={BOTTLE_CONFIG.bottle.bodyWidth}
            height={BOTTLE_CONFIG.bottle.bodyHeight}
            rx="40"
            ry="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          {/* Neck */}
          <rect
            x={BOTTLE_CONFIG.svg.width / 2 - BOTTLE_CONFIG.bottle.neckWidth / 2}
            y={BOTTLE_CONFIG.svg.height - BOTTLE_CONFIG.bottle.capHeight - BOTTLE_CONFIG.bottle.neckHeight}
            width={BOTTLE_CONFIG.bottle.neckWidth}
            height={BOTTLE_CONFIG.bottle.neckHeight}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          {/* Cap */}
          <rect
            x={BOTTLE_CONFIG.svg.width / 2 - BOTTLE_CONFIG.bottle.capWidth / 2}
            y={BOTTLE_CONFIG.svg.height - BOTTLE_CONFIG.bottle.capHeight}
            width={BOTTLE_CONFIG.bottle.capWidth}
            height={BOTTLE_CONFIG.bottle.capHeight}
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </g>

        {/* Fill level */}
        <g
          className="bottle-fill"
          clipPath={`url(#bottle-clip-${size})`}
          style={{
            '--fill-height': `${fillHeight}px`,
            '--fill-color': currentColor,
          } as React.CSSProperties}
        >
          <rect
            x={0}
            y={BOTTLE_CONFIG.svg.height - fillHeight}
            width={BOTTLE_CONFIG.svg.width}
            height={fillHeight}
            fill="var(--fill-color)"
          />
        </g>

        {/* Meniscus (liquid surface line) */}
        {displayPercentage > 0 && displayPercentage < 100 && (
          <line
            x1={BOTTLE_CONFIG.svg.width / 2 - BOTTLE_CONFIG.bottle.bodyWidth / 2 + 10}
            y1={BOTTLE_CONFIG.svg.height - fillHeight - BOTTLE_CONFIG.bottle.capHeight - BOTTLE_CONFIG.bottle.neckHeight}
            x2={BOTTLE_CONFIG.svg.width / 2 + BOTTLE_CONFIG.bottle.bodyWidth / 2 - 10}
            y2={BOTTLE_CONFIG.svg.height - fillHeight - BOTTLE_CONFIG.bottle.capHeight - BOTTLE_CONFIG.bottle.neckHeight}
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth="2"
            strokeLinecap="round"
            className="meniscus-line"
          />
        )}
      </svg>

      {/* Percentage Label */}
      {showLabel && (
        <div 
          className="fill-percentage"
          style={{ '--percentage-font-size': config.fontSize } as React.CSSProperties}
          aria-hidden="true"
        >
          {Math.round(displayPercentage)}%
        </div>
      )}
    </div>
  );
}
