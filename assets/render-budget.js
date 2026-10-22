/** Keep raster work bounded on dense phone displays and large desktop screens. */
export function renderBudget(width, height, deviceRatio = 1) {
  const compact = width <= 760 || Math.min(width, height) <= 480;
  // Keep the original viewport budget. Frame timing must not blur the canvas
  // or switch a desktop model to the reduced phone linework while orbiting.
  const pixelRatio = Math.min(deviceRatio, compact ? 1.35 : 1.75, Math.sqrt(2_400_000 / Math.max(1, width * height)));
  return { compact, pixelRatio };
}
