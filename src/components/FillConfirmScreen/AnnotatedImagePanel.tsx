import { useRef, useEffect, useState } from "react";

interface AnnotatedImagePanelProps {
  imgSrc: string;
  imgRef: React.RefObject<HTMLImageElement | null>;
  containerRef?: React.RefObject<HTMLDivElement>;
  linePx: number;
  onLoad?: () => void;
}

/**
 * Displays a bottle image with a horizontal red dashed line annotation
 * at the specified Y-coordinate (linePx).
 *
 * The image uses object-fit: contain to preserve aspect ratio.
 * The SVG overlay uses the container's pixel dimensions for its viewBox,
 * ensuring linePx (calculated by fillMlToPixelY) maps correctly to the visual position.
 */
export function AnnotatedImagePanel({
  imgSrc,
  imgRef,
  containerRef,
  linePx,
  onLoad,
}: AnnotatedImagePanelProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const activeRef = containerRef ?? internalContainerRef;

  // Track container size for SVG viewBox
  useEffect(() => {
    const el = activeRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeRef]);

  const { width: containerW, height: containerH } = containerSize;

  return (
    <div
      ref={activeRef}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <img
        ref={imgRef}
        src={imgSrc}
        crossOrigin="anonymous"
        onLoad={onLoad}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
      {containerW > 0 && containerH > 0 && (
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
            pointerEvents: "none",
          }}
          viewBox={`0 0 ${containerW} ${containerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line
            x1={0}
            y1={linePx}
            x2={containerW}
            y2={linePx}
            stroke="red"
            strokeWidth={2}
            strokeDasharray="8 4"
          />
        </svg>
      )}
    </div>
  );
}
