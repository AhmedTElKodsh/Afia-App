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
          d="M 200 64 L 258 64 L 260 138 L 268 148 L 268 196 C 282 220 320 240 372 290 C 398 322 405 360 390 396 C 372 432 358 466 358 506 C 358 600 368 696 388 768 C 396 848 388 916 366 952 L 96 952 C 74 916 66 848 74 768 C 94 696 104 600 104 506 C 104 458 96 416 86 376 C 76 318 96 268 192 196 L 192 148 L 200 138 Z"
        />
        <path
          id="afia-bottle-handle"
          d="M 350 312 C 386 314 400 346 394 382 C 392 418 378 444 350 448 C 332 448 326 426 326 396 C 326 366 332 312 350 312 Z"
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
