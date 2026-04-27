// src/components/FillConfirmScreen/FillConfirmScreen.tsx
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AnnotatedImagePanel } from "./AnnotatedImagePanel.tsx";
import { VerticalStepSlider } from "./VerticalStepSlider.tsx";
import { CupVisualization } from "./CupVisualization.tsx";
import { formatCupText } from "../../utils/formatters.ts";
import { fillMlToPixelY } from "../../utils/fillMlToPixelY.ts";
import { hapticFeedback } from "../../utils/haptics.ts";
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
  // Allow 0 so truly-empty bottles show disabled state instead of forcing 55ml
  return Math.max(0, Math.min(capacity, Math.round(estimated / step) * step));
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

  // currentLevelMl is fixed — represents the AI-detected oil level
  const currentLevelMl = useMemo(
    () => snapToStep(aiEstimatePercent, bottleCapacityMl, 55),
    [aiEstimatePercent, bottleCapacityMl]
  );

  // Maximum the user can take out while always leaving at least 55ml
  const maxTaken = Math.max(0, currentLevelMl - 55);

  // Disabled when there is nothing to take (≤55ml in bottle)
  const isDisabled = maxTaken === 0;

  // takenMl = how much the user is planning to dispense
  const [takenMl, setTakenMl] = useState(0);
  const remainingMl = currentLevelMl - takenMl;
  const [announcement, setAnnouncement] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });

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

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !imageLoaded) return;
    setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  }, [imageLoaded]);

  const { width: containerW, height: containerH } = containerSize;

  // Red line is FIXED at currentLevelMl — it does not follow the slider
  const linePx = useMemo(() => {
    if (!imageLoaded || !imgDimensions.width || !imgDimensions.height || !containerW || !containerH) return 0;
    const tempImg = document.createElement("img");
    tempImg.width = imgDimensions.width;
    tempImg.height = imgDimensions.height;
    return fillMlToPixelY(
      currentLevelMl,
      bottleCapacityMl,
      tempImg,
      bottleTopPct,
      bottleBottomPct
    );
  }, [currentLevelMl, bottleCapacityMl, bottleTopPct, bottleBottomPct, containerW, containerH, imageLoaded, imgDimensions]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  // Slider value is inverted: maxTaken at top (0 taken) → 0 at bottom (maxTaken taken)
  const handleSliderChange = useCallback((invertedValue: number) => {
    setTakenMl(maxTaken - invertedValue);
    hapticFeedback.selection();
  }, [maxTaken]);

  const handleConfirm = useCallback(() => {
    setAnnouncement(
      `${t("fillConfirm.confirmed", "Fill level confirmed")}: ${remainingMl} ${t("common.ml", "ml")}`
    );
    onConfirm(remainingMl);
  }, [onConfirm, remainingMl, t]);

  const takenCupText = formatCupText(takenMl, t);
  const remainingCupText = formatCupText(remainingMl, t);

  return (
    <div className="fill-confirm flex flex-col h-full bg-white">
      {/* Image + slider row */}
      <div
        className="flex flex-row flex-1 items-stretch gap-3 p-3"
        dir={document.documentElement.dir}
      >
        <div ref={containerRef} className="flex-1">
          <AnnotatedImagePanel
            imgSrc={imageDataUrl}
            imgRef={imgRef}
            linePx={linePx}
            onLoad={handleImageLoad}
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          {isDisabled ? (
            <p
              className="text-xs text-gray-500 text-center px-1 max-w-[60px]"
              role="status"
              data-testid="disabled-message"
            >
              {t("fillConfirm.lessThan55ml", "< ¼ cup remaining")}
            </p>
          ) : (
            <>
              {/* Inverted slider: thumb starts at TOP (0 taken), drags DOWN to take out */}
              <VerticalStepSlider
                waterMl={maxTaken - takenMl}
                min={0}
                step={55}
                max={maxTaken}
                height={containerH || 280}
                onChange={handleSliderChange}
                ariaLabel={t("fillConfirm.sliderLabelTakeOut", "Adjust oil to take out")}
                ariaUnitLabel={t("common.ml", "ml")}
              />
              <CupVisualization waterMl={takenMl} />
            </>
          )}
        </div>
      </div>

      {/* Dispensing info */}
      <div className="px-4 py-2 border-t border-gray-100 text-sm text-gray-700 space-y-1">
        <p data-testid="taking-out-text">
          <span className="font-medium">{t("fillConfirm.takingOut", "You're taking out")}:</span>{" "}
          {takenMl} {t("common.ml", "ml")} = {takenCupText}
        </p>
        <p data-testid="will-remain-text">
          <span className="font-medium">{t("fillConfirm.willRemain", "Will remain")}:</span>{" "}
          {remainingMl} {t("common.ml", "ml")} = {remainingCupText}
        </p>
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
          data-testid="confirm-button"
        >
          {t("fillConfirm.confirmButton", "Confirm")} — {remainingMl} {t("common.ml", "ml")}
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
