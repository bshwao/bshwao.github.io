/** Keep raster work bounded on dense phone displays and large desktop screens. */
export function renderBudget(width, height, deviceRatio = 1) {
  const compact = width <= 760 || Math.min(width, height) <= 480;
  const pixelRatio = Math.min(deviceRatio, compact ? 1.35 : 1.75, Math.sqrt(2_400_000 / Math.max(1, width * height)));
  return { compact, pixelRatio };
}
