/**
 * Maps a water volume (ml) to a CSS pixel Y-coordinate within an image container.
 *
 * The image must be displayed with object-fit: contain.
 * Y=0 is the TOP of the container. Higher Y = lower on screen.
 * 100% full → line at bottleTopPx (near top of bottle).
 * 0% full   → line at bottleBottomPx (near bottom of bottle).
 *
 * Returns 0 if the image is not yet loaded or the container has no size.
 *
 * @param waterMl - Current water volume in milliliters
 * @param bottleCapacityMl - Total bottle capacity in milliliters
 * @param imgEl - The HTMLImageElement displaying the bottle image
 * @param bottleTopPct - Fraction (0-1) of natural image height for bottle top edge
 * @param bottleBottomPct - Fraction (0-1) of natural image height for bottle bottom edge
 * @returns Y-coordinate in CSS pixels where the fill line should be drawn
 */
export function fillMlToPixelY(
  waterMl: number,
  bottleCapacityMl: number,
  imgEl: HTMLImageElement,
  bottleTopPct: number,
  bottleBottomPct: number
): number {
  const rect = imgEl.getBoundingClientRect();
  const natW = imgEl.naturalWidth;
  const natH = imgEl.naturalHeight;

  // Guard: return 0 if image not loaded or container has no size
  if (!natW || !natH || !rect.width || !rect.height) return 0;

  // object-fit: contain → minimum scale factor (letterbox the unconstrained axis)
  const scale = Math.min(rect.width / natW, rect.height / natH);

  const renderedH = natH * scale;
  const offsetY = (rect.height - renderedH) / 2; // letterbox bar height (top and bottom)

  const bottleTopPx = offsetY + bottleTopPct * renderedH;
  const bottleBottomPx = offsetY + bottleBottomPct * renderedH;

  // Clamp fill fraction to [0, 1]
  const fillFraction = Math.max(0, Math.min(1, waterMl / bottleCapacityMl));

  // Return Y coordinate: bottom - (fraction * height)
  // 100% full → bottleTopPx, 0% full → bottleBottomPx
  return bottleBottomPx - fillFraction * (bottleBottomPx - bottleTopPx);
}
