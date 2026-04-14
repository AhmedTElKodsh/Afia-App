import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import * as Slider from "@radix-ui/react-slider";
import { Check, RotateCcw } from "lucide-react";
import type { AnalysisResult } from "../state/appState.ts";
import { fillPctToPixelY } from "../utils/coordinateMapping.ts";
import "./FillConfirm.css";

interface FillConfirmProps {
  capturedImage: string;
  result: AnalysisResult;
  onConfirm: (finalFillPercentage: number) => void;
  onRetake: () => void;
}

export function FillConfirm({
  capturedImage,
  result,
  onConfirm,
  onRetake,
}: FillConfirmProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [fillValue, setFillValue] = useState<number>(() => {
    // Snap to nearest 55ml step if possible, or just use AI result
    return Math.max(5, Math.round(result.fillPercentage));
  });

  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [lineY, setLineY] = useState(0);

  // Update line position when fillValue or image dimensions change
  useEffect(() => {
    if (imgLoaded && imgRef.current) {
      const y = fillPctToPixelY(
        fillValue,
        imgRef.current,
        10, // Default bottle top % (should ideally come from registry)
        90  // Default bottle bottom %
      );
      setLineY(y);
    }
  }, [fillValue, imgLoaded]);

  // Recalculate on resize
  useEffect(() => {
    const handleResize = () => {
      if (imgRef.current) {
        const y = fillPctToPixelY(fillValue, imgRef.current, 10, 90);
        setLineY(y);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fillValue]);

  return (
    <div className={`fill-confirm ${isRtl ? "rtl" : "ltr"}`}>
      <div className="fill-confirm-header">
        <h1>{t("common.confirm")}</h1>
        <p className="text-secondary">{t("camera.guideText")}</p>
      </div>

      <div className="fill-confirm-main">
        {/* Vertical Slider Section */}
        <div className="slider-section">
          <Slider.Root
            className="SliderRoot"
            value={[fillValue]}
            onValueChange={([val]) => setFillValue(val)}
            max={100}
            min={5}
            step={5} // Approx 55ml for a 1.1L bottle is ~5%
            orientation="vertical"
          >
            <Slider.Track className="SliderTrack">
              <Slider.Range className="SliderRange" />
            </Slider.Track>
            <Slider.Thumb className="SliderThumb" aria-label="Fill Level" />
          </Slider.Root>
          <div className="value-label">
            <span className="value-number">{fillValue}</span>
            <span className="value-unit">%</span>
          </div>
        </div>

        {/* Image Display Section */}
        <div className="image-section">
          <img
            ref={imgRef}
            src={`data:image/jpeg;base64,${capturedImage}`}
            alt="Captured bottle"
            className="captured-img"
            onLoad={() => setImgLoaded(true)}
          />
          {imgLoaded && (
            <svg className="overlay-svg" aria-hidden="true">
              <line
                x1="0"
                y1={lineY}
                x2="100%"
                y2={lineY}
                className="measurement-line"
              />
            </svg>
          )}
        </div>
      </div>

      <div className="fill-confirm-footer">
        <p className="hint-text text-secondary">
          {t("feedback.yourEstimate")}
        </p>
        <div className="action-buttons">
          <button className="btn btn-outline" onClick={onRetake}>
            <RotateCcw size={18} />
            {t("camera.retake")}
          </button>
          <button
            className="btn btn-primary btn-success"
            onClick={() => onConfirm(fillValue)}
          >
            <Check size={18} />
            {t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
