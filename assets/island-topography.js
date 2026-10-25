import { islandCoast, islandContains, islandCenter, oceanY } from './city-geography.js';

const count = islandCoast.length;
const scales = [0, .14, .28, .42, .55, .64, .70, .76, .82, .87, .91, .935, .95, .978, .993, 1];
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (x, z, seed = 0) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(seed + 17, 2246822519);
  n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296;
};
const noise = (x, z, seed = 0) => {
  const a = Math.floor(x), b = Math.floor(z), u = smooth(0, 1, x - a), v = smooth(0, 1, z - b);
  return (hash(a, b, seed) * (1 - u) + hash(a + 1, b, seed) * u) * (1 - v)
    + (hash(a, b + 1, seed) * (1 - u) + hash(a + 1, b + 1, seed) * u) * v;
};
const river = x => 168 + 16 * Math.sin((x + 80) / 90) - x * .08;
const bump = (x, z, cx, cz, rx, rz) => Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));
function cell(x, z) {
  const px = x - islandCenter[0], pz = z - islandCenter[1];
  let angle = Math.atan2(pz / 1120, px / 1180); if (angle < 0) angle += Math.PI * 2;
  const i = Math.floor(angle * count / (Math.PI * 2)) % count, a = islandCoast[i], b = islandCoast[(i + 1) % count];
  const ax = a[0], az = a[1] - islandCenter[1], bx = b[0], bz = b[1] - islandCenter[1];
  const det = ax * bz - az * bx, u = (px * bz - pz * bx) / det, v = (ax * pz - az * px) / det;
  return { i, scale: u + v };
}
function analyticHeight(x, z, coastScale) {
  if (coastScale >= .95) {
    if (coastScale < .978) return -.82 + smooth(.95, .978, coastScale) * .18;
    if (coastScale < .993) return -.64 - smooth(.978, .993, coastScale) * .71;
    return -1.35 + smooth(.993, 1, coastScale) * (oceanY + 1.35);
  }
  const radius = Math.hypot(x, z - islandCenter[1]);
  const cityClear = smooth(860, 960, radius);
  const riverClear = x < -930 ? 1 : smooth(68, 125, Math.abs(z - river(x)));
  const shoreClear = 1 - smooth(.87, .95, coastScale);
  const relief = 95 * bump(x, z, -960, -140, 190, 300)
    + 78 * bump(x, z, 690, -740, 250, 210)
    + 42 * bump(x, z, -240, -940, 330, 170)
    + 24 * bump(x, z, 610, 820, 270, 185)
    + 35 * bump(x, z, -560, 790, 190, 270);
  const drainage = 1 - .58 * bump(x, z, 100, -860, 100, 300);
  return -.82 + relief * cityClear * riverClear * shoreClear * drainage * (.77 + noise(x * .012, z * .012, 71) * .42);
}
const rings = scales.map(scale => islandCoast.map(([x, z]) => {
  x *= scale; z = islandCenter[1] + (z - islandCenter[1]) * scale;
  return [x, analyticHeight(x, z, scale), z];
}));
const center = [islandCenter[0], -.82, islandCenter[1]];
function plane(a, b, c, x, z) {
  const det = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
  const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / det;
  const v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / det;
  return { height: u * a[1] + v * b[1] + (1 - u - v) * c[1], inside: u >= -1e-7 && v >= -1e-7 && u + v <= 1 + 1e-7 };
}

/** Exact height of the same polar-cell triangles uploaded to the renderer. */
export function islandTerrainHeight(x, z) {
  if (!islandContains(x, z)) return oceanY;
  const { i, scale } = cell(x, z), next = (i + 1) % count;
  if (scale <= scales[1]) return -.82;
  let ring = 1; while (ring < scales.length - 2 && scale > scales[ring + 1]) ring++;
  const a = rings[ring][i], b = rings[ring][next], c = rings[ring + 1][next], d = rings[ring + 1][i];
  const first = plane(a, b, c, x, z);
  return first.inside ? first.height : plane(a, c, d, x, z).height;
}


export {count,scales,rings,center,smooth,hash,noise,cell,river};
