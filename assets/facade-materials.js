import * as T from './vendor/three.module.min.js';
import { palette } from './color-theme.js';

const tau = Math.PI * 2;
const limestone = new T.Color(palette.structure).lerp(new T.Color(palette.stone), .25);
const seaGlass = new T.Color(palette.glass).lerp(new T.Color(palette.teal), .3);
const coolGlass = new T.Color(palette.glass).lerp(new T.Color(palette.blue), .4);
const silverGlass = new T.Color(palette.glass).lerp(new T.Color(palette.shadow), .23);
const terracotta = new T.Color(palette.stone).lerp(new T.Color(palette.coral), .35);
const smooth = (lo, hi, value) => {
  const t = T.MathUtils.clamp((value - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
};
const zone = (angle, lo, hi, feather = .15) => smooth(lo,lo+feather,angle) * (1-smooth(hi-feather,hi,angle));
const variation = seed => { const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };

/** Fixed architectural materials in world azimuth/height; never repeated per wing or section. */
export function facadeColor(angle, height, target = new T.Color(), position = null) {
  const azimuth = (angle % tau + tau) % tau;
  // One broad sea-glass elevation, a different cooler rear elevation, and a
  // quieter silver return. Limestone recesses join them without a threefold tile.
  const front = zone(azimuth,.10,1.86,.23);
  const rear = zone(azimuth,3.23,5.24,.28);
  const returnFace = zone(azimuth,5.37,6.12,.12);
  const podium = 1-smooth(5,24,height), crown = smooth(88,108,height);
  target.copy(limestone);
  target.lerp(seaGlass,front * (.88-podium*.23));
  target.lerp(coolGlass,rear * (.78-podium*.18));
  target.lerp(silverGlass,returnFace*.6);
  target.lerp(terracotta,zone(azimuth,2.13,2.94,.16) * podium * .7);
  target.lerp(limestone,crown*.65);
  // Small pane-to-pane differences are baked once, rather than animated noise
  // or a repeated colored panel every few storeys.
  // Physical bays keep pane variation attached to the new elevations as their
  // lengths change at a setback. The angular form remains useful for previews.
  const bay = position ? Math.floor(position.x/1.4)*17+Math.floor(position.z/1.4)*31 : Math.floor(azimuth/tau*96);
  const storey = Math.floor(height/3.4);
  const glazing = Math.max(front,rear,returnFace);
  return target.multiplyScalar(1 + (variation(bay*19 + storey*71)-.5) * (.012+glazing*.028));
}
