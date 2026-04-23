// src/components/FillConfirmScreen/FillConfirmScreen.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AnnotatedImagePanel } from "./AnnotatedImagePanel.tsx";
import { VerticalStepSlider } from "./VerticalStepSlider.tsx";
import { CupVisualization } from "./CupVisualization.tsx";
import { fillMlToPixelY } from "../../utils/fillMlToPixelY.ts";
import { ML_PER_VOLUME_STEP } from "../../../shared/volumeCalculator.ts";
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
    snapToStep(aiEstimatePercent, bottleCapacityMl, ML_PER_VOLUME_STEP)
  );
  const [announcement, setAnnouncement] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [linePx, setLinePx] = useState(0);

  const recomputeLinePx = useCallback(
    (nextWaterMl: number) => {
      const imgEl = imgRef.current;
      if (!imageLoaded || !imgEl) return;
      setLinePx(
        fillMlToPixelY(
          nextWaterMl,
          bottleCapacityMl,
          imgEl,
          bottleTopPct,
          bottleBottomPct
        )
      );
    },
    [bottleBottomPct, bottleCapacityMl, bottleTopPct, imageLoaded]
  );

  // Track container size with ResizeObserver (Safari-safe — do NOT use window.resize)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
      // ResizeObserver fires outside render; safe place to re-measure DOM and update derived state.
      recomputeLinePx(waterMl);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [recomputeLinePx, waterMl]);

  const { width: containerW, height: containerH } = containerSize;

  // Keep linePx in sync when slider changes (post-render, ref is stable).
  const handleSliderChange = useCallback(
    (nextWaterMl: number) => {
      setWaterMl(nextWaterMl);
      if (containerW && containerH) {
        recomputeLinePx(nextWaterMl);
      }
    },
    [containerH, containerW, recomputeLinePx]
  );

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    // After image load, measure once to initialize line position.
    if (containerW && containerH) {
      recomputeLinePx(waterMl);
    }
  }, [containerH, containerW, recomputeLinePx, waterMl]);

  const handleConfirm = useCallback(() => {
    setAnnouncement(`${t("fillConfirm.confirmed", "Fill level confirmed")}: ${waterMl} ${t("common.ml", "ml")}`);
    onConfirm(waterMl);
  }, [onConfirm, waterMl, t]);

  return (
    <div className="fill-confirm flex flex-col h-full bg-white">
      {/* Image + slider row */}
      <div
        className="flex flex-row flex-1 items-stretch gap-3 p-3"
        dir={document.documentElement.dir}  // Inherits RTL/LTR from global i18n config
      >
        <div className="flex flex-col items-center gap-2">
          <VerticalStepSlider
            waterMl={waterMl}
            min={ML_PER_VOLUME_STEP}
            step={ML_PER_VOLUME_STEP}
            max={bottleCapacityMl}
            height={containerH || 280}
            onChange={handleSliderChange}
            ariaLabel={t("fillConfirm.sliderLabel", "Adjust fill level")}
            ariaUnitLabel={t("common.ml", "ml")}
          />
          <CupVisualization waterMl={waterMl} />
        </div>
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
