import { useRef, useEffect } from "react";
import { getBottleBySku, ACTIVE_SKU } from "../../shared/bottleRegistry.ts";
import "./BottleOverlay.css";

interface BottleOverlayProps {
  capturedImage: string; // Base64 image from camera
  fillPercentage: number;
  targetFillPercentage?: number;
  bottleHeightMm: number;
  bottleName: string;
  totalVolumeMl: number;
}

/**
 * Bottle Overlay Component
 * Displays the captured bottle photo with volume markings overlaid
 * Shows fill level line with ml and cup measurements
 */
export function BottleOverlay({
  capturedImage,
  fillPercentage,
  targetFillPercentage,
  totalVolumeMl,
}: BottleOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Get theme colors and fonts
      const rootStyle = getComputedStyle(document.documentElement);
      const fontFamily = rootStyle.getPropertyValue('--font-family').trim().split(',')[0].replace(/['"]/g, '') || "Outfit";

      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the original image
      ctx.drawImage(img, 0, 0);

      const bottle = getBottleBySku(ACTIVE_SKU);
      const calibrationPoints = bottle?.geometry.calibrationPoints || [];
      
      // Calculate Y for any ML using calibration table
      const getYForMl = (ml: number) => {
        if (ml <= 0) return canvas.height;
        if (ml >= totalVolumeMl) return 0;
        
        // Find height percentage for this ML
        let heightPct = 0;
        if (calibrationPoints.length >= 2) {
          for (let i = 1; i < calibrationPoints.length; i++) {
            const lo = calibrationPoints[i - 1];
            const hi = calibrationPoints[i];
            if (ml <= hi.remainingMl) {
              const range = hi.remainingMl - lo.remainingMl;
              const t = range === 0 ? 0 : (ml - lo.remainingMl) / range;
              heightPct = lo.fillHeightPct + t * (hi.fillHeightPct - lo.fillHeightPct);
              break;
            }
          }
        } else {
          heightPct = (ml / totalVolumeMl) * 100;
        }
        
        return canvas.height * (1 - heightPct / 100);
      };

      const fillLineY = canvas.height * (1 - fillPercentage / 100);

      // 1. Draw "Consumed" overlay (Above red line)
      // Darkened, slightly semi-transparent to distinguish from remaining oil
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(0, 0, canvas.width, fillLineY);

      // 2. Draw "Remaining" tint (Optional: subtle enhancement)
      // ctx.fillStyle = "rgba(245, 197, 24, 0.05)"; // Very subtle gold tint
      // ctx.fillRect(0, fillLineY, canvas.width, canvas.height - fillLineY);

      // 3. Draw Side Scale (Ruler)
      const scaleX = canvas.width * 0.05;
      
      // Draw MM marks (Aesthetic background)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      const mmSteps = 270; // 270mm height
      for (let i = 0; i <= mmSteps; i += 5) {
        const y = canvas.height * (1 - i / mmSteps);
        const isMajorMm = i % 10 === 0;
        ctx.beginPath();
        ctx.moveTo(scaleX, y);
        ctx.lineTo(scaleX + (isMajorMm ? 8 : 4), y);
        ctx.stroke();
      }

      // Draw Cup/ML Ticks
      // Intervals: 55ml (1/4 cup), 110ml (1/2 cup), 165ml (3/4 cup), 220ml (1 cup)
      const cupMl = 220;
      const quarterCupMl = 55;

      for (let m = quarterCupMl; m <= totalVolumeMl; m += quarterCupMl) {
        const y = getYForMl(m);
        const isFullCup = m % cupMl === 0;
        const isHalfCup = m % 110 === 0 && !isFullCup;
        
        // Draw Tick
        ctx.strokeStyle = isFullCup ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)";
        ctx.lineWidth = isFullCup ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(scaleX, y);
        ctx.lineTo(scaleX + (isFullCup ? 20 : 12), y);
        ctx.stroke();

        // Draw Label for Full/Half cups
        if (isFullCup || isHalfCup) {
          const cupValue = m / cupMl;
          let label = "";
          if (isFullCup) label = `${cupValue} Cup${cupValue > 1 ? 's' : ''}`;
          else if (isHalfCup) label = `${Math.floor(cupValue)}½ Cup`;
          if (cupValue === 0.5) label = "½ Cup";

          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.font = `${isFullCup ? 'bold' : ''} ${Math.max(10, canvas.width * 0.03)}px ${fontFamily}`;
          ctx.textAlign = "left";
          ctx.fillText(label, scaleX + 25, y + 4);
          
          // Small ML label below
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.font = `${Math.max(8, canvas.width * 0.025)}px ${fontFamily}`;
          ctx.fillText(`${m}ml`, scaleX + 25, y + 15);
        }
      }

      // 4. Draw Main Red Line (Locked to meniscus)
      ctx.strokeStyle = "#FF3B30"; // Bright Red
      ctx.lineWidth = Math.max(4, canvas.width * 0.008);
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(255, 59, 48, 0.5)";
      ctx.beginPath();
      ctx.moveTo(0, fillLineY);
      ctx.lineTo(canvas.width, fillLineY);
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // 4b. Draw Target Line (Planned Pour)
      if (targetFillPercentage !== undefined && Math.abs(targetFillPercentage - fillPercentage) > 0.5) {
        const targetLineY = canvas.height * (1 - targetFillPercentage / 100);
        
        // Draw dashed white line for target
        ctx.setLineDash([10, 5]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = Math.max(2, canvas.width * 0.004);
        ctx.beginPath();
        ctx.moveTo(0, targetLineY);
        ctx.lineTo(canvas.width, targetLineY);
        ctx.stroke();
        ctx.setLineDash([]); // Reset
        
        // Draw planned area shading (between red and target)
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.fillRect(0, fillLineY, canvas.width, targetLineY - fillLineY);
      }

      // 5. Draw Indicator Badge
      const remainingMl = (fillPercentage / 100) * totalVolumeMl; // This is approximate, but good for UI
      // Use the actual calibrated ML if possible
      const actualRemainingMl = bottle?.geometry.calibrationPoints 
        ? Math.round(interpolateCalibration(fillPercentage, bottle.geometry.calibrationPoints))
        : Math.round(remainingMl);

      const currentFillText = `${actualRemainingMl}ml`;
      const indicatorY = fillLineY;

      ctx.fillStyle = "#FF3B30";
      ctx.font = `bold ${Math.max(14, canvas.width * 0.045)}px ${fontFamily}`;
      ctx.textAlign = "right";
      ctx.fillText(currentFillText, canvas.width - 15, indicatorY - 10);
      
      const cupCount = actualRemainingMl / cupMl;
      const full = Math.floor(cupCount);
      const frac = cupCount - full;
      let fracStr = "";
      if (frac >= 0.125 && frac < 0.375) fracStr = "¼";
      else if (frac >= 0.375 && frac < 0.625) fracStr = "½";
      else if (frac >= 0.625 && frac < 0.875) fracStr = "¾";
      
      const cupLabel = `~ ${full > 0 ? full : ""}${fracStr} Cups`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = `${Math.max(10, canvas.width * 0.035)}px ${fontFamily}`;
      ctx.fillText(cupLabel, canvas.width - 15, indicatorY + 20);
    };

    function interpolateCalibration(pct: number, points: any[]) {
      if (pct <= points[0].fillHeightPct) return points[0].remainingMl;
      const last = points[points.length - 1];
      if (pct >= last.fillHeightPct) return last.remainingMl;
      for (let i = 1; i < points.length; i++) {
        const lo = points[i - 1];
        const hi = points[i];
        if (pct <= hi.fillHeightPct) {
          const t = (pct - lo.fillHeightPct) / (hi.fillHeightPct - lo.fillHeightPct);
          return lo.remainingMl + t * (hi.remainingMl - lo.remainingMl);
        }
      }
      return last.remainingMl;
    }

    img.src = capturedImage;
  }, [capturedImage, fillPercentage, targetFillPercentage, totalVolumeMl]);

  return (
    <div className="bottle-overlay-container">
      <canvas ref={canvasRef} className="bottle-overlay-canvas" />
    </div>
  );
}

