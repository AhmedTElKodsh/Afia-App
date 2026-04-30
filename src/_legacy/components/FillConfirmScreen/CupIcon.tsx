interface CupIconProps {
  fill: "empty" | "quarter" | "half" | "three-quarters" | "full";
  size?: number;
}

export function CupIcon({ fill, size = 32 }: CupIconProps) {
  const fillColor = "#3b82f6"; // blue-500
  const emptyColor = "#e5e7eb"; // gray-200
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Cup outline (trapezoid shape) */}
      <path
        d="M6 4 L18 4 L16 20 L8 20 Z"
        stroke="#374151"
        strokeWidth="1.5"
        fill={fill === "empty" ? emptyColor : "none"}
      />
      
      {/* Fill indicator - Trapezoid sections based on height */}
      {/* Base: y=20, Top: y=4, Height=16 */}
      
      {fill === "quarter" && (
        <path
          d="M7.5 16 L16.5 16 L16 20 L8 20 Z"
          fill={fillColor}
        />
      )}
      
      {fill === "half" && (
        <path
          d="M7 12 L17 12 L16 20 L8 20 Z"
          fill={fillColor}
        />
      )}

      {fill === "three-quarters" && (
        <path
          d="M6.5 8 L17.5 8 L16 20 L8 20 Z"
          fill={fillColor}
        />
      )}
      
      {fill === "full" && (
        <path
          d="M6 4 L18 4 L16 20 L8 20 Z"
          fill={fillColor}
        />
      )}
      
      {/* Handle */}
      <path
        d="M18 8 Q21 8 21 11 Q21 14 18 14"
        stroke="#374151"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}
