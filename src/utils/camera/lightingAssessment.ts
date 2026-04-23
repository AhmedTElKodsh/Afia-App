import { getProcessingCanvas, toGrayscale } from './canvasUtils.ts';

export interface LightingAssessment {
  brightness: number;
  contrast: number;
  status: 'too-dark' | 'too-bright' | 'low-contrast' | 'good';
  isAcceptable: boolean;
}

function calculateBrightness(imageData: ImageData): number {
  const data = imageData.data;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return total / (data.length / 4);
}

function calculateContrast(grayData: Uint8ClampedArray): number {
  const n = grayData.length;
  let sum = 0;
  let sumSquared = 0;
  for (let i = 0; i < n; i++) {
    sum += grayData[i];
    sumSquared += grayData[i] * grayData[i];
  }
  const mean = sum / n;
  const rms = Math.sqrt(sumSquared / n);
  return Math.min(100, Math.max(0, (rms / mean) * 200));
}

export function assessLighting(imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): LightingAssessment {
  try {
    const { canvas, ctx } = getProcessingCanvas();
    const size = 50;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(imageSource, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    const grayData = toGrayscale(imageData);
    const brightness = calculateBrightness(imageData);
    const contrast = calculateContrast(grayData);
    let status: 'too-dark' | 'too-bright' | 'low-contrast' | 'good' = 'good';
    let isAcceptable = true;
    if (brightness < 40) { status = 'too-dark'; isAcceptable = false; }
    else if (brightness > 220) { status = 'too-bright'; isAcceptable = false; }
    else if (contrast < 30) { status = 'low-contrast'; isAcceptable = false; }
    return { brightness: Math.round(brightness), contrast: Math.round(contrast), status, isAcceptable };
  } catch (error) {
    console.error('Lighting assessment error:', error);
    return { brightness: 128, contrast: 50, status: 'good', isAcceptable: true };
  }
}
