import { useEffect, useState, useRef } from "react";
import "./LiquidGauge.css";

export interface LiquidGaugeProps {
  /** Fill percentage 0-100 */
  percentage: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Sub-label beneath the percentage (e.g. "270ml used") */
  sublabel?: string;
  /** Whether to run the counter animation on mount */
  animate?: boolean;
}

const SIZE_PX: Record<NonNullable<LiquidGaugeProps["size"]>, number> = {
  sm: 60,
  md: 120,
  lg: 180,
};

export function LiquidGauge({
  percentage,
  size = "md",
  sublabel,
  animate = true,
}: LiquidGaugeProps) {
  const [display, setDisplay] = useState(animate ? 0 : percentage);
  const [prevPercentage, setPrevPercentage] = useState(percentage);
  const rafRef = useRef<number | null>(null);

  // Update display directly if not animating
  if (!animate && percentage !== prevPercentage) {
    setPrevPercentage(percentage);
    setDisplay(percentage);
  }

  useEffect(() => {
    if (!animate) {
      return;
    }

    const start = performance.now();
    const from = 0;
    const to = Math.max(0, Math.min(100, percentage));
    const duration = 900;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [percentage, animate]);

  const pct = Math.round(display);
  const dim = SIZE_PX[size];
  const gaugePct = `${display.toFixed(1)}%`;

  // Glow color follows fill level
  const glowColor =
    pct >= 60
      ? "var(--color-fill-high)"
      : pct >= 30
      ? "var(--color-fill-medium)"
      : "var(--color-fill-low)";

  return (
    <div
      className={`liquid-gauge liquid-gauge--${size}`}
      style={{ "--gauge-dim": `${dim}px`, "--gauge-pct": gaugePct, "--gauge-glow": glowColor } as React.CSSProperties}
      role="img"
      aria-label={`Bottle fill level: ${pct}%`}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Ring — isolated element so its mask doesn't clip siblings */}
      <div className="liquid-gauge__ring" aria-hidden="true" />

      {/* Center text — sibling, unaffected by ring's mask */}
      <div className="liquid-gauge__center">
        <span className="liquid-gauge__pct">{pct}%</span>
        {sublabel && size !== "sm" && (
          <span className="liquid-gauge__sub">{sublabel}</span>
        )}
      </div>
    </div>
  );
}
