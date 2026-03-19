import { useRef, useEffect } from "react";
import "./BottleOverlay.css";

interface BottleOverlayProps {
  capturedImage: string; // Base64 image from camera
  fillPercentage: number;
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
      const primaryColor = rootStyle.getPropertyValue('--color-primary').trim() || "#f5c518";
      const fontFamily = rootStyle.getPropertyValue('--font-family').trim().split(',')[0].replace(/['"]/g, '') || "Outfit";
      const textSecondary = rootStyle.getPropertyValue('--color-text-secondary').trim() || "rgba(255, 255, 255, 0.72)";

      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the original image
      ctx.drawImage(img, 0, 0);

      const remainingVolumeMl = (fillPercentage / 100) * totalVolumeMl;
      const consumedVolumeMl = totalVolumeMl - remainingVolumeMl;

      // Fill line position: fillPercentage applies from bottom
      // If bottle is 100% full, fill line is at top; 0% = bottom
      const fillLineY = canvas.height * (1 - fillPercentage / 100);

      // Draw semi-transparent overlay above fill line (empty portion)
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(0, 0, canvas.width, fillLineY);

      // Draw fill level line
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = Math.max(3, canvas.width * 0.005);
      ctx.beginPath();
      ctx.moveTo(0, fillLineY);
      ctx.lineTo(canvas.width, fillLineY);
      ctx.stroke();

      // Calculate marker positions (volume fractions)
      const markerFractions = [0.25, 0.5, 0.75];
      const markerPositions = markerFractions.map((fraction) => ({
        y: canvas.height * (1 - fraction),
        ml: Math.round(fraction * totalVolumeMl),
        cups: +(fraction * totalVolumeMl / 240).toFixed(1),
      }));

      // Draw markers
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.font = `bold ${Math.max(12, canvas.width * 0.035)}px ${fontFamily}, Arial`;
      ctx.textAlign = "left";

      markerPositions.forEach((marker) => {
        // Short tick mark
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.05, marker.y);
        ctx.lineTo(canvas.width * 0.15, marker.y);
        ctx.stroke();

        // Label
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = `${Math.max(10, canvas.width * 0.03)}px ${fontFamily}, Arial`;
        ctx.fillText(`${marker.ml}ml`, canvas.width * 0.17, marker.y + 4);
      });

      // Draw current fill level indicator
      const currentFillText = `${Math.round(remainingVolumeMl)}ml / ${Math.round(fillPercentage)}%`;
      const indicatorY = fillLineY - Math.max(25, canvas.height * 0.03);

      // Indicator background
      ctx.fillStyle = primaryColor;
      const indicatorMetrics = ctx.measureText(currentFillText);
      const indicatorPadX = 12;
      const indicatorPadY = 6;
      const indicatorW = indicatorMetrics.width + indicatorPadX * 2;
      const indicatorH = Math.max(28, canvas.height * 0.04);
      const indicatorX = canvas.width / 2 - indicatorW / 2;

      ctx.save();
      ctx.beginPath();
      const r = 6;
      ctx.moveTo(indicatorX + r, indicatorY - indicatorH);
      ctx.lineTo(indicatorX + indicatorW - r, indicatorY - indicatorH);
      ctx.quadraticCurveTo(indicatorX + indicatorW, indicatorY - indicatorH, indicatorX + indicatorW, indicatorY - indicatorH + r);
      ctx.lineTo(indicatorX + indicatorW, indicatorY - indicatorPadY);
      ctx.quadraticCurveTo(indicatorX + indicatorW, indicatorY, indicatorX + indicatorW - r, indicatorY);
      ctx.lineTo(indicatorX + r, indicatorY);
      ctx.quadraticCurveTo(indicatorX, indicatorY, indicatorX, indicatorY - indicatorPadY);
      ctx.lineTo(indicatorX, indicatorY - indicatorH + r);
      ctx.quadraticCurveTo(indicatorX, indicatorY - indicatorH, indicatorX + r, indicatorY - indicatorH);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Indicator text
      ctx.fillStyle = "#000000";
      ctx.font = `bold ${Math.max(14, canvas.width * 0.04)}px ${fontFamily}, Arial`;
      ctx.textAlign = "center";
      ctx.fillText(currentFillText, canvas.width / 2, indicatorY - indicatorPadY * 1.5);

      // Draw "Consumed" label in the empty portion
      if (fillPercentage < 95) {
        const consumedLabel = `Empty: ${Math.round(consumedVolumeMl)}ml`;
        ctx.fillStyle = textSecondary;
        ctx.font = `${Math.max(12, canvas.width * 0.035)}px ${fontFamily}, Arial`;
        ctx.textAlign = "center";
        ctx.fillText(consumedLabel, canvas.width / 2, canvas.height * 0.15);
      }
    };

    img.src = capturedImage;
  }, [capturedImage, fillPercentage, totalVolumeMl]);

  return (
    <div className="bottle-overlay-container">
      <canvas ref={canvasRef} className="bottle-overlay-canvas" />
      <div className="overlay-legend">
        <div className="legend-item">
          <span className="legend-line" style={{ borderColor: "var(--color-primary)" }}></span>
          <span className="legend-label">Current Fill Level</span>
        </div>
        <div className="legend-item">
          <span className="legend-line" style={{ borderColor: "var(--color-text-primary)" }}></span>
          <span className="legend-label">Volume Markers</span>
        </div>
      </div>
    </div>
  );
}
