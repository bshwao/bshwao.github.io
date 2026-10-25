// Finite dry land and an unbounded ocean share one sea level and coastline.
export const oceanY = -2.1;
export const citySceneryRadius = 4800;
export const islandFramingRadius = 1500;
export const islandCenter = [0, 30];
export function islandPoint(angle, scale = 1) {
  const radius = 1 + .06 * Math.sin(angle * 3) + .035 * Math.sin(angle * 5 + .7) + .025 * Math.cos(angle * 7);
  return [Math.cos(angle) * 1180 * radius * scale, 30 + Math.sin(angle) * 1120 * radius * scale];
}
export const islandCoast = Array.from({ length: 128 }, (_, i) => islandPoint(i * Math.PI * 2 / 128));

export function islandContains(x, z, scale = 1) {
  x /= scale; z = (z - islandCenter[1]) / scale + islandCenter[1];
  let inside = false;
  for (let i = 0, j = islandCoast.length - 1; i < islandCoast.length; j = i++) {
    const a = islandCoast[i], b = islandCoast[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

export function riverOceanMouth(centerAtX) {
  let inland = 800, offshore = 1500;
  for (let i = 0; i < 30; i++) {
    const x = (inland + offshore) / 2;
    if (islandContains(x, centerAtX(x))) inland = x; else offshore = x;
  }
  return (inland + offshore) / 2;
}
