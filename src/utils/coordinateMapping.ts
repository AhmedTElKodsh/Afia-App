/**
 * Coordinate Mapping Utilities
 * 
 * Maps physical volumes/percentages to screen pixel coordinates
 * accounting for image aspect ratio and object-fit: contain letterboxing.
 */

/**
 * Maps a fill percentage (0-100) to a CSS pixel Y-coordinate on an <img> element
 * 
 * @param percentage - Fill percentage (0-100)
 * @param imgEl - The rendered <img> element
 * @param bottleTopPct - Top of bottle as % of image height (from registry)
 * @param bottleBottomPct - Bottom of bottle as % of image height (from registry)
 * @returns Y-coordinate in CSS pixels relative to the image element's top-left
 */
export function fillPctToPixelY(
  percentage: number,
  imgEl: HTMLImageElement | null,
  bottleTopPct: number = 10,
  bottleBottomPct: number = 90
): number {
  if (!imgEl || !imgEl.complete || imgEl.naturalHeight === 0) return 0;

  const rect = imgEl.getBoundingClientRect();
  const displayWidth = rect.width;
  const displayHeight = rect.height;
  const naturalWidth = imgEl.naturalWidth;
  const naturalHeight = imgEl.naturalHeight;

  // 1. Calculate the letterboxed image dimensions (object-fit: contain)
  const imageAspectRatio = naturalWidth / naturalHeight;
  const containerAspectRatio = displayWidth / displayHeight;

  let renderedHeight: number;
  let offsetY: number;

  if (imageAspectRatio > containerAspectRatio) {
    // Letterboxed on top/bottom (wider than container)
    renderedHeight = displayWidth / imageAspectRatio;
    offsetY = (displayHeight - renderedHeight) / 2;
  } else {
    // Full height (taller than container) or perfectly matches
    renderedHeight = displayHeight;
    offsetY = 0;
  }

  // 2. Map percentage to Y within the rendered image area
  // 0%   -> bottleBottomPct
  // 100% -> bottleTopPct
  const bottleSpanPct = bottleBottomPct - bottleTopPct;
  const relativeYPct = bottleBottomPct - (percentage / 100) * bottleSpanPct;
  
  // 3. Convert relative % to actual display pixels
  return offsetY + (relativeYPct / 100) * renderedHeight;
}

/**
 * Maps a water volume (ml) to a CSS pixel Y-coordinate
 */
export function fillMlToPixelY(
  waterMl: number,
  capacityMl: number,
  imgEl: HTMLImageElement | null,
  bottleTopPct: number = 10,
  bottleBottomPct: number = 90
): number {
  const percentage = (waterMl / capacityMl) * 100;
  return fillPctToPixelY(percentage, imgEl, bottleTopPct, bottleBottomPct);
}
