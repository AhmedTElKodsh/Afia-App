import { getProcessingCanvas, toGrayscale } from './canvasUtils.ts';

function applyLaplacianFilter(grayData: Uint8ClampedArray, width: number, height: number): Float32Array {
  const result = new Float32Array(grayData.length);
  const kernel = [0, -1, 0, -1, 4, -1, 0, -1, 0];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      let kernelIndex = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelIndex = ((y + ky) * width + (x + kx));
          sum += grayData[pixelIndex] * kernel[kernelIndex];
          kernelIndex++;
        }
      }
      result[y * width + x] = sum;
    }
  }
  return result;
}

function calculateStdDev(data: Float32Array): number {
  const n = data.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(data[i]);
  const mean = sum / n;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    const diff = Math.abs(data[i]) - mean;
    variance += diff * diff;
  }
  return Math.sqrt(variance / n);
}

export function detectBlur(imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): number {
  try {
    const { canvas, ctx } = getProcessingCanvas();
    const size = 100;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(imageSource, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    const grayData = toGrayscale(imageData);
    const laplacian = applyLaplacianFilter(grayData, size, size);
    const stdDev = calculateStdDev(laplacian);
    return Math.min(100, Math.max(0, stdDev * 2));
  } catch (error) {
    console.error('Blur detection error:', error);
    return 50;
  }
}
