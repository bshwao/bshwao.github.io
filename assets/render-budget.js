/** Keep raster work bounded on dense phone displays and large desktop screens. */
export function renderBudget(width, height, deviceRatio = 1, quality = 0) {
  const compact = width <= 760 || Math.min(width, height) <= 480 || quality > 0;
  const scale = [1, .85, .7, .55][Math.max(0, Math.min(3, quality))];
  const pixelRatio = Math.min(deviceRatio, compact ? 1.35 : 1.75, Math.sqrt(2_400_000 / Math.max(1, width * height))) * scale;
  return { compact, pixelRatio };
}

/** Measure consecutive active frames only; idle time and background tabs aren't load. */
export function createFrameBudget() {
  let quality = 0, previous = null, elapsed = 0, samples = 0, healthy = 0;
  const reset = () => { previous = null; elapsed = 0; samples = 0; };
  return {
    get quality() { return quality; },
    reset() { reset(); healthy = 0; },
    sample(time) {
      const interval = previous === null ? 0 : time - previous;
      previous = time;
      if (interval <= 0 || interval > 1000) { elapsed = 0; samples = 0; healthy = 0; return false; }
      elapsed += interval; samples++;
      const average = elapsed / samples;
      if (elapsed < 1000 || samples < (average > 40 ? 4 : 12)) return false;
      healthy = average < 18 ? healthy + elapsed : 0;
      const next = average > 22.5 ? Math.min(3, quality + 1) : healthy >= 6000 ? Math.max(0, quality - 1) : quality;
      elapsed = 0; samples = 0;
      if (next === quality) return false;
      quality = next; healthy = 0; reset(); return true;
    },
  };
}
