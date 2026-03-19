import { memo } from "react";

interface AfiaLogoProps {
  className?: string;
  height?: number;
}

export const AfiaLogo = memo(({ className, height = 32 }: AfiaLogoProps) => (
  <svg
    height={height}
    viewBox="0 0 120 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Afia"
  >
    <defs>
      <linearGradient id="afiaGradient" x1="0" y1="0" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffcc00" />
        <stop offset="100%" stopColor="#008844" />
      </linearGradient>
    </defs>
    
    {/* Real Afia Logo stylized concept */}
    <g fill="#008844">
      {/* A */}
      <path d="M5 35L15 5L25 35H20L15 20L10 35H5Z" />
      {/* f */}
      <path d="M30 35V10H25V5H30C35 5 38 8 38 12V15H42V20H38V35H30Z" />
      {/* i */}
      <path d="M48 35V10H55V35H48ZM48 5V0H55V5H48Z" />
      {/* a */}
      <path d="M65 35V30C62 33 58 35 54 35C48 35 44 31 44 25C44 19 48 15 54 15C58 15 62 17 65 20V15H72V35H65ZM65 25C65 22 63 20 60 20C57 20 55 22 55 25C55 28 57 30 60 30C63 30 65 28 65 25Z" />
    </g>
    
    {/* Golden leaf accent */}
    <path
      d="M80 15C85 5 95 5 100 15C95 25 85 25 80 15Z"
      fill="#ffcc00"
    />
  </svg>
));
