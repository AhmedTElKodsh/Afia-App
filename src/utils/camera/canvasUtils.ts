/**
 * Shared Canvas Resources for Camera Assessment
 */

let processingCanvas: HTMLCanvasElement | null = null;
let processingContext: CanvasRenderingContext2D | null = null;

export function getProcessingCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (processingContext && processingContext.canvas !== processingCanvas) {
    processingCanvas = null;
    processingContext = null;
  }

  if (!processingCanvas || !processingContext) {
    processingCanvas = document.createElement('canvas');
    processingContext = processingCanvas.getContext('2d', { willReadFrequently: true });

    if (!processingContext) {
      throw new Error('Unable to create canvas context for image analysis');
    }
  }
  return { canvas: processingCanvas, ctx: processingContext };
}

export function toGrayscale(imageData: ImageData): Uint8ClampedArray {
  const data = imageData.data;
  const gray = new Uint8ClampedArray(data.length / 4);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return gray;
}
