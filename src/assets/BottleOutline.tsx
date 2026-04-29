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
      <defs>
        <path
          id="afia-bottle-silhouette"
          d="M 223 327 L 197 334 L 192 363 L 196 383 L 148 422 L 137 438 L 129 460 L 137 509 L 136 565 L 128 605 L 100 694 L 98 763 L 110 829 L 130 887 L 143 903 L 168 912 L 260 913 L 298 910 L 312 903 L 324 889 L 337 858 L 358 776 L 362 700 L 352 680 L 362 668 L 363 610 L 350 498 L 323 432 L 277 384 L 280 339 L 274 331 Z"
        />
        <path
          id="afia-bottle-handle"
          d="M 264 333 L 277 343 L 274 387 L 316 428 L 335 467 L 336 477 L 325 497 L 298 515 L 285 535 L 279 612 L 282 638 L 292 653 L 344 674 L 358 696 L 354 784 L 326 876 L 308 901 L 270 909 L 167 908 L 143 898 L 133 884 L 112 825 L 100 753 L 104 689 L 138 573 L 141 514 L 133 458 L 151 424 L 198 386 L 201 375 L 195 369 L 199 337 L 230 331 Z"
        />
      </defs>
      <g fill="none" strokeLinejoin="round" strokeLinecap="round">
        <use href="#afia-bottle-silhouette" stroke="#000000" strokeOpacity="0.55" strokeWidth="9" />
        <use href="#afia-bottle-handle"     stroke="#000000" strokeOpacity="0.55" strokeWidth="9" />
        <use href="#afia-bottle-silhouette" stroke="#FFFFFF" strokeOpacity="0.95" strokeWidth="4" />
        <use href="#afia-bottle-handle"     stroke="#FFFFFF" strokeOpacity="0.95" strokeWidth="4" />
      </g>
    </svg>
  );
});

export default BottleOutline;
