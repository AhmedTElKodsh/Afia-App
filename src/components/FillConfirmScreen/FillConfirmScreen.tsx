// src/components/FillConfirmScreen/FillConfirmScreen.tsx
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AnnotatedImagePanel } from "./AnnotatedImagePanel.tsx";
import { VerticalStepSlider } from "./VerticalStepSlider.tsx";
import { fillMlToPixelY } from "../../utils/fillMlToPixelY.ts";
import "./FillConfirmScreen.css";

interface FillConfirmScreenProps {
  imageDataUrl: string;
  aiEstimatePercent: number;   // 0–100 from API
  bottleCapacityMl: number;
  bottleTopPct: number;        // 0–1, fraction of image natural height
  bottleBottomPct: number;     // 0–1, fraction of image natural height
  onConfirm: (waterMl: number) => void;
  onRetake: () => void;
}

function snapToStep(percent: number, capacity: number, step: number): number {
  const estimated = (percent / 100) * capacity;
  return Math.max(step, Math.min(capacity, Math.round(estimated / step) * step));
}

export function FillConfirmScreen({
  imageDataUrl,
  aiEstimatePercent,
  bottleCapacityMl,
  bottleTopPct,
  bottleBottomPct,
  onConfirm,
  onRetake,
}: FillConfirmScreenProps) {
  const { t } = useTranslation();

  const [waterMl, setWaterMl] = useState<number>(() =>
    snapToStep(aiEstimatePercent, bottleCapacityMl, 55)
  );
  const [announcement, setAnnouncement] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Track container size with ResizeObserver (Safari-safe — do NOT use window.resize)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width: containerW, height: containerH } = containerSize;

  // linePx is DERIVED — never a useState. useMemo recalculates on waterMl OR container resize.
  const linePx = useMemo(() => {
    if (!imageLoaded || !imgRef.current || !containerW || !containerH) return 0;
    return fillMlToPixelY(
      waterMl,
      bottleCapacityMl,
      imgRef.current,
      bottleTopPct,
      bottleBottomPct
    );
  }, [waterMl, bottleCapacityMl, bottleTopPct, bottleBottomPct, containerW, containerH, imageLoaded]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleConfirm = useCallback(() => {
    setAnnouncement(`${t("fillConfirm.confirmed", "Fill level confirmed")}: ${waterMl} ${t("common.ml", "ml")}`);
    onConfirm(waterMl);
  }, [onConfirm, waterMl, t]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Image + slider row */}
      <div
        className="flex flex-row flex-1 items-stretch gap-3 p-3"
        dir={document.documentElement.dir}  // Inherits RTL/LTR from global i18n config
      >
        <VerticalStepSlider
          waterMl={waterMl}
          min={55}
          step={55}
          max={bottleCapacityMl}
          height={containerH || 280}
          onChange={setWaterMl}
          ariaLabel={t("fillConfirm.sliderLabel", "Adjust fill level")}
          ariaUnitLabel={t("common.ml", "ml")}
        />
        <div ref={containerRef} className="flex-1">
          <AnnotatedImagePanel
            imgSrc={imageDataUrl}
            imgRef={imgRef}
            linePx={linePx}
            onLoad={handleImageLoad}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-row gap-3 p-4 border-t border-gray-200">
        <button
          onClick={onRetake}
          className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium text-base focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          style={{ minHeight: "44px" }}
        >
          {t("fillConfirm.retakeButton", "Retake")}
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold text-base focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          style={{ minHeight: "44px" }}
        >
          {t("fillConfirm.confirmButton", "Confirm")} — {waterMl} {t("common.ml", "ml")}
        </button>
      </div>

      {/* Screen reader live region — visually hidden */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {announcement}
      </span>
    </div>
  );
}
