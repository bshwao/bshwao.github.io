// Diagnostic-only linear-RGB color transforms. CVD coefficients follow Chromium's
// Machado-model implementation; they are a preview aid, not a clinical assessment.
// https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/core/css/vision_deficiency.cc
export const visionMatrices = Object.freeze({
  grayscale: [.2126, .7152, .0722, .2126, .7152, .0722, .2126, .7152, .0722],
  protanopia: [.152, 1.053, -.205, .115, .786, .099, -.004, -.048, 1.052],
  deuteranopia: [.367, .861, -.228, .280, .673, .047, -.012, .043, .969],
  tritanopia: [1.256, -.077, -.179, -.078, .931, .148, .005, .691, .304],
});

export function linearRGB(hex) {
  return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
}

export function simulateVision(hex, mode) {
  const rgb = linearRGB(hex), matrix = visionMatrices[mode];
  if (!matrix) return rgb;
  return [0, 1, 2].map(row => Math.max(0, Math.min(1, rgb.reduce((sum, value, column) => sum + value * matrix[row * 3 + column], 0))));
}

export function filterMarkup() {
  return Object.entries(visionMatrices).map(([name, matrix]) => {
    const values = [0, 1, 2].flatMap(row => [...matrix.slice(row * 3, row * 3 + 3), 0, 0]).concat([0, 0, 0, 1, 0]);
    return `<filter id="vision-${name}" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="${values.join(' ')}"/></filter>`;
  }).join('');
}
