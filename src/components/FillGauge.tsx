import "./FillGauge.css";

interface FillGaugeProps {
  fillPercentage: number;
}

function getFillColor(percentage: number): string {
  if (percentage > 50) return "var(--color-fill-high)";
  if (percentage >= 25) return "var(--color-fill-medium)";
  return "var(--color-fill-low)";
}

export function FillGauge({ fillPercentage }: FillGaugeProps) {
  const fillColor = getFillColor(fillPercentage);
  const fillHeight = Math.max(0, Math.min(100, fillPercentage));

  return (
    <div className="fill-gauge" aria-label={`${fillPercentage}% full`}>
      <svg
        viewBox="0 0 60 100"
        className="gauge-svg"
        role="img"
        aria-hidden="true"
      >
        {/* Cap */}
        <rect x="15" y="0" width="30" height="6" rx="2" fill="#ccc" />
        {/* Neck */}
        <rect x="18" y="6" width="24" height="12" rx="2" fill="none" stroke="#ccc" strokeWidth="1.5" />
        {/* Body */}
        <rect x="5" y="18" width="50" height="80" rx="6" fill="none" stroke="#ccc" strokeWidth="1.5" />
        {/* Fill */}
        <clipPath id="bodyClip">
          <rect x="5" y="18" width="50" height="80" rx="6" />
        </clipPath>
        <rect
          x="5"
          y={18 + 80 * (1 - fillHeight / 100)}
          width="50"
          height={80 * (fillHeight / 100)}
          fill={fillColor}
          opacity="0.7"
          clipPath="url(#bodyClip)"
          className="fill-rect"
        />
        {/* Meniscus line */}
        {fillPercentage > 0 && fillPercentage < 100 && (
          <line
            x1="6"
            y1={18 + 80 * (1 - fillHeight / 100)}
            x2="54"
            y2={18 + 80 * (1 - fillHeight / 100)}
            stroke={fillColor}
            strokeWidth="1"
            opacity="0.9"
            clipPath="url(#bodyClip)"
            className="meniscus-line"
          />
        )}
      </svg>
    </div>
  );
}
