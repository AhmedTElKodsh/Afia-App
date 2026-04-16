import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import * as Slider from "@radix-ui/react-slider";
import { Check, RotateCcw } from "lucide-react";
import type { AnalysisResult } from "../state/appState.ts";
import { fillPctToPixelY } from "../utils/coordinateMapping.ts";
import { CupVisualization } from "./CupVisualization.tsx";
import { hapticFeedback } from "../utils/haptics.ts";
import "./FillConfirm.css";

interface FillConfirmProps {
  capturedImage: string;
  result: AnalysisResult;
  onConfirm: (finalFillPercentage: number) => void;
  onRetake: () => void;
  totalVolumeMl?: number;
  bottleTopPct?: number;
  bottleBottomPct?: number;
}

const STEP_ML = 55;

export function FillConfirm({
  capturedImage,
  result,
  onConfirm,
  onRetake,
  totalVolumeMl = 1500,
  bottleTopPct = 3,
  bottleBottomPct = 97,
}: FillConfirmProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  // Calculate percentage for a single 55ml step
  const stepPercentage = (STEP_ML / totalVolumeMl) * 100;

  const [fillValue, setFillValue] = useState<number>(() => {
    const rawPct = result.fillPercentage;
    // Neglect if below 55ml
    if ((rawPct / 100) * totalVolumeMl < STEP_ML) return 0;
    // Snap to nearest 55ml step
    return Math.round(rawPct / stepPercentage) * stepPercentage;
  });

  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [lineY, setLineY] = useState(0);

  const consumedMl = useMemo(() => {
    const remaining = (fillValue / 100) * totalVolumeMl;
    return Math.max(0, totalVolumeMl - remaining);
  }, [fillValue, totalVolumeMl]);

  // Update line position when fillValue or image dimensions change
  useEffect(() => {
    if (imgLoaded && imgRef.current) {
      const y = fillPctToPixelY(
        fillValue,
        imgRef.current,
        bottleTopPct,
        bottleBottomPct
      );
      setLineY(y);
    }
  }, [fillValue, imgLoaded, bottleTopPct, bottleBottomPct]);

  // Recalculate on resize
  useEffect(() => {
    const handleResize = () => {
      if (imgRef.current) {
        const y = fillPctToPixelY(fillValue, imgRef.current, bottleTopPct, bottleBottomPct);
        setLineY(y);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fillValue, bottleTopPct, bottleBottomPct]);

  return (
    <div className={`fill-confirm ${isRtl ? "rtl" : "ltr"}`}>
      <div className="fill-confirm-header">
        <h1>{t("common.confirm")}</h1>
        <p className="text-secondary">{t("camera.guideText")}</p>
      </div>

      <div className="fill-confirm-main">
        {/* Vertical Slider Section */}
        <div className="slider-container">
          <div className="slider-section">
            <Slider.Root
              className="SliderRoot"
              value={[fillValue]}
              onValueChange={([val]) => {
                if (val !== fillValue) hapticFeedback.selection();
                setFillValue(val);
              }}
              onValueCommit={() => hapticFeedback.submit()}
              max={100}
              min={0}
              step={stepPercentage}
              orientation="vertical"
            >
              <Slider.Track className="SliderTrack">
                <Slider.Range className="SliderRange" />
              </Slider.Track>
              <Slider.Thumb className="SliderThumb" aria-label="Fill Level" />
            </Slider.Root>
          </div>
          
          {/* Cup Visualization attached to the side of the slider */}
          <div className="visualization-overlay">
            <CupVisualization volumeMl={consumedMl} />
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
        <div className="volume-summary">
          <div className="volume-item">
            <span className="label">Consumed:</span>
            <span className="value">{Math.round(consumedMl)}ml</span>
          </div>
          <div className="volume-item">
            <span className="label">Remaining:</span>
            <span className="value">{Math.round((fillValue / 100) * totalVolumeMl)}ml</span>
          </div>
        </div>
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
