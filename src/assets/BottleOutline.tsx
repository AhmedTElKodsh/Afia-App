import { memo } from 'react';

interface BottleOutlineProps {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

const BottleOutline = memo(function BottleOutline({ className, "aria-hidden": ariaHidden }: BottleOutlineProps) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 460 1024"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden={ariaHidden}
    >
      <g
        fill="none"
        stroke="rgba(255,255,255,0.85)"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth="7"
      >
        {/* Cap */}
        <path
          d="M 223.7 326.9 L 197.3 334.1 L 192.3 363.3 L 196.0 383.0 L 264.8 383.0 L 274.9 363.3 L 274.9 331.2 Z"
          vectorEffect="non-scaling-stroke"
        />
        {/* Neck */}
        <path
          d="M 196.0 383.0 L 148.5 422.4 L 137.4 438.3 L 129.0 460.8 L 137.4 509.5 L 198.2 386.1 L 201.5 375.1 L 195.5 369.7 L 199.7 337.2 L 230.5 331.2 L 264.8 333.3 L 277.6 344.0 L 274.9 387.8 L 316.7 428.9 L 335.5 467.3 L 336.4 477.4 L 325.8 497.5"
          vectorEffect="non-scaling-stroke"
        />
        {/* Shoulder */}
        <path
          d="M 137.4 509.5 L 136.5 565.4 L 128.1 605.5 L 138.3 573.5 L 141.5 514.6 L 133.1 458.4 L 151.1 424.3 L 325.8 497.5 L 298.5 515.5 L 285.7 535.3 L 279.7 612.9"
          vectorEffect="non-scaling-stroke"
        />
        {/* Body */}
        <path
          d="M 128.1 605.5 L 100.1 694.9 L 98.3 763.9 L 110.1 829.4 L 104.3 689.6 L 279.7 612.9 L 282.4 638.4 L 292.1 653.3 L 344.6 674.9 L 358.4 696.8 L 354.4 784.9 L 362.4 668.2 L 363.3 610.7 L 351.5 498.4"
          vectorEffect="non-scaling-stroke"
        />
        {/* Handle */}
        <path
          d="M 323.1 432.6 L 351.5 498.4 L 363.3 610.7 L 362.4 668.2 L 352.4 680.6 L 362.4 696.8 L 358.4 776.6 L 337.7 859.0"
          vectorEffect="non-scaling-stroke"
        />
        {/* Base */}
        <path
          d="M 110.1 829.4 L 130.4 887.5 L 143.2 903.7 L 168.3 912.4 L 260.4 913.3 L 298.5 910.7 L 312.4 903.7 L 324.0 889.2 L 337.7 859.0 L 326.2 877.1 L 308.9 902.0 L 270.5 910.3 L 167.4 909.0 L 143.2 899.5 L 133.1 885.8 L 112.0 826.0"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
});

export default BottleOutline;
