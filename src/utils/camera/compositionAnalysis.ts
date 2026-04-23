import { getProcessingCanvas } from './canvasUtils.ts';
import { CAMERA_CONFIG } from '../../config/camera.ts';

export interface CompositionAssessment {
  isCentered: boolean;
  isLevel: boolean;
  distance: 'too-close' | 'too-far' | 'good' | 'not-detected';
  visibility: number;
  bottleDetected: boolean;
  widthFraction: number;
  centroidX: number;
  isBrandMatch: boolean;
  brandFindings: string[];
}

export function verifyBrandAfia(
  imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): { isMatch: boolean; confidence: number; findings: string[] } {
  try {
    const { canvas, ctx } = getProcessingCanvas();
    const W = 80;
    const H = 80;
    canvas.width = W;
    canvas.height = H;
    const srcW = (imageSource as HTMLVideoElement).videoWidth || (imageSource as HTMLImageElement).naturalWidth || W;
    const srcH = (imageSource as HTMLVideoElement).videoHeight || (imageSource as HTMLImageElement).naturalHeight || H;
    ctx.drawImage(imageSource, srcW * 0.2, srcH * 0.3, srcW * 0.6, srcH * 0.4, 0, 0, W, H);
    const imageData = ctx.getImageData(0, 0, W, H);
    const data = imageData.data;
    let greenPixels = 0, redPixels = 0, highContrastPixels = 0;
    const findings: string[] = [];

    const hsvCfg = CAMERA_CONFIG.detection.hsv;
    const brandCfg = CAMERA_CONFIG.brand;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const rN = r / 255, gN = g / 255, bN = b / 255;
      const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN), delta = max - min;
      const v = max * 100, s = max > 0 ? (delta / max) * 100 : 0;
      let h = 0;
      if (delta > 0) {
        if (max === rN) h = ((gN - bN) / delta % 6) * 60;
        else if (max === gN) h = ((bN - rN) / delta + 2) * 60;
        else h = ((rN - gN) / delta + 4) * 60;
        if (h < 0) h += 360;
      }
      
      // Green Band
      if (h >= hsvCfg.greenBand.h[0] && h <= hsvCfg.greenBand.h[1] && s > hsvCfg.greenBand.s[0] * 100 && v > hsvCfg.greenBand.v[0] * 100) greenPixels++;
      
      // Red Heart (Handling Wrap-around)
      const isRed = (h >= hsvCfg.brandRedAlt.h[0] && h <= hsvCfg.brandRedAlt.h[1]) || (h >= hsvCfg.brandRed.h[0] && h <= hsvCfg.brandRed.h[1]);
      if (isRed && s > hsvCfg.brandRed.s[0] * 100 && v > hsvCfg.brandRed.v[0] * 100) redPixels++;
      
      // High Contrast Text
      if (v > hsvCfg.highContrast.v[0] * 100 && s < hsvCfg.highContrast.s[1] * 100) highContrastPixels++;
    }
    const total = W * H;
    const greenRatio = greenPixels / total, redRatio = redPixels / total, textRatio = highContrastPixels / total;
    let confidence = 0;
    
    if (greenRatio > brandCfg.minRatios.greenBand) { confidence += brandCfg.weights.greenBand; findings.push("green_band"); }
    if (redRatio > brandCfg.minRatios.heartLogo) { confidence += brandCfg.weights.heartLogo; findings.push("heart_logo"); }
    if (textRatio > brandCfg.minRatios.textContrast) { confidence += brandCfg.weights.textContrast; findings.push("text_contrast"); }
    
    const isMatch = greenRatio > brandCfg.matchCriteria.minGreen && (redRatio > brandCfg.matchCriteria.minSecondary || textRatio > brandCfg.matchCriteria.minTertiary);
    return { isMatch, confidence, findings };
  } catch (error) {
    console.error("Brand verification error:", error);
    return { isMatch: false, confidence: 0, findings: [] };
  }
}

export function analyzeComposition(
  imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): CompositionAssessment {
  try {
    const { canvas, ctx } = getProcessingCanvas();
    const cfg = CAMERA_CONFIG.detection;
    const thresh = cfg.thresholds;
    
    const W = 60, H = 100;
    canvas.width = W; canvas.height = H;
    const srcEl = imageSource as HTMLVideoElement;
    const srcW = srcEl.videoWidth || (imageSource as HTMLImageElement).naturalWidth || (imageSource as HTMLCanvasElement).width || W;
    const srcH = srcEl.videoHeight || (imageSource as HTMLImageElement).naturalHeight || (imageSource as HTMLCanvasElement).height || H;
    
    if (srcW === 0 || srcH === 0) {
      return { isCentered: false, isLevel: true, distance: 'not-detected', visibility: 0, bottleDetected: false, widthFraction: 0, centroidX: 0.5, isBrandMatch: false, brandFindings: [] };
    }
    
    ctx.drawImage(imageSource, srcW * cfg.crop.xStart, srcH * cfg.crop.yStart, srcW * (cfg.crop.xEnd - cfg.crop.xStart), srcH * (cfg.crop.yEnd - cfg.crop.yStart), 0, 0, W, H);
    const imageData = ctx.getImageData(0, 0, W, H);
    const data = imageData.data;
    let minRow = H, maxRow = -1, minCol = W, maxCol = -1, matchCount = 0, totalMatchX = 0;
    const rowCounts = new Array<number>(H).fill(0);
    
    const greenH = cfg.hsv.greenBand.h, greenS = cfg.hsv.greenBand.s, greenV = cfg.hsv.greenBand.v;
    const oilH = cfg.hsv.oilAmber.h, oilS = cfg.hsv.oilAmber.s, oilV = cfg.hsv.oilAmber.v;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;
        const rN = data[idx] / 255, gN = data[idx+1] / 255, bN = data[idx+2] / 255;
        const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN), delta = max - min;
        const v = max, s = max > 0 ? delta / max : 0;
        let h = 0;
        if (delta > 0) {
          if (max === rN) h = ((gN - bN) / delta % 6) * 60;
          else if (max === gN) h = ((bN - rN) / delta + 2) * 60;
          else h = ((rN - gN) / delta + 4) * 60;
          if (h < 0) h += 360;
        }
        
        const isGreen = h >= greenH[0] && h <= greenH[1] && s >= greenS[0] && v >= greenV[0];
        const isOil = h >= oilH[0] && h <= oilH[1] && s >= oilS[0] && v >= oilV[0];

        if (isGreen || isOil) {
          matchCount++; totalMatchX += x;
          if (x < minCol) minCol = x; if (x > maxCol) maxCol = x;
          rowCounts[y]++; if (y < minRow) minRow = y; if (y > maxRow) maxRow = y;
        }
      }
    }
    
    const matchRatio = matchCount / (W * H);
    const bottleDetected = matchRatio >= thresh.minMatchRatio && maxRow > minRow;
    
    if (!bottleDetected) {
      return { isCentered: false, isLevel: true, distance: 'not-detected', visibility: 0, bottleDetected: false, widthFraction: 0, centroidX: 0.5, isBrandMatch: false, brandFindings: [] };
    }
    
    const bboxHeight = maxRow - minRow + 1, bboxWidth = maxCol - minCol + 1;
    if (bboxHeight < thresh.bboxMinHeight || bboxWidth < 2) {
      return { isCentered: false, isLevel: true, distance: 'not-detected', visibility: 0, bottleDetected: false, widthFraction: 0, centroidX: 0.5, isBrandMatch: false, brandFindings: [] };
    }
    
    const centroidX = totalMatchX / matchCount / W;
    const isCentered = Math.abs(centroidX - 0.5) <= thresh.centeringTolerance;
    
    if (bboxWidth / bboxHeight > thresh.bottleAspectMax) {
      return { isCentered, isLevel: true, distance: 'not-detected', visibility: 0, bottleDetected: true, widthFraction: bboxWidth / W, centroidX, isBrandMatch: false, brandFindings: [] };
    }
    
    const neckRows = Math.max(1, Math.floor(bboxHeight * thresh.neckTopFraction));
    const bodyRows = Math.max(1, Math.floor(bboxHeight * thresh.neckBodyFraction));
    
    const neckDensity = rowCounts.slice(minRow, Math.min(H, minRow + neckRows)).reduce((a, b) => a + b, 0) / (Math.max(1, Math.min(H, minRow + neckRows) - minRow) * bboxWidth);
    const bodyDensity = rowCounts.slice(Math.max(minRow, maxRow - bodyRows + 1), Math.min(H, maxRow + 1)).reduce((a, b) => a + b, 0) / (Math.max(1, Math.min(H, maxRow + 1) - Math.max(minRow, maxRow - bodyRows + 1)) * bboxWidth);
    
    if (bodyDensity === 0 || neckDensity >= thresh.neckMaxDensityRatio * bodyDensity) {
      return { isCentered, isLevel: true, distance: 'not-detected', visibility: 0, bottleDetected: true, widthFraction: bboxWidth / W, centroidX, isBrandMatch: false, brandFindings: [] };
    }
    
    const spanFraction = bboxHeight / H;
    if (spanFraction < thresh.minSpanFraction) {
      return { isCentered, isLevel: true, distance: 'not-detected', visibility: 0, bottleDetected: true, widthFraction: bboxWidth / W, centroidX, isBrandMatch: false, brandFindings: [] };
    }
    
    let distance: 'too-close' | 'too-far' | 'good' = spanFraction > thresh.maxSpanFraction ? 'too-close' : (spanFraction < thresh.goodSpanStart || bboxWidth / W < thresh.minWidthFraction || !isCentered ? 'too-far' : 'good');
    
    const brandResult = verifyBrandAfia(imageSource);
    return { isCentered, isLevel: true, distance, visibility: Math.round(spanFraction * 100), bottleDetected: true, widthFraction: bboxWidth / W, centroidX, isBrandMatch: brandResult.isMatch, brandFindings: brandResult.findings };
  } catch (error) {
    console.error('Composition analysis error:', error);
    return { isCentered: false, isLevel: true, distance: 'not-detected', visibility: 0, bottleDetected: false, widthFraction: 0, centroidX: 0.5, isBrandMatch: false, brandFindings: [] };
  }
}
