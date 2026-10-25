import * as T from './vendor/three.module.min.js';
import { cityEnvelopes } from './city-layout.js';
import { sections, setbacks, footprint, towerHeight } from './tower-geometry.js';
import { outdoorViewLayout } from './spatial-layout.js';
import { citySceneryRadius, islandFramingRadius } from './city-geography.js';

const openingAzimuth = Math.atan2(.42, 1);

/** Keep fine facade/roof layers distinguishable in the depth buffer at any zoom. */
export function cameraDepthRange(distance) {
  return { near: Math.max(.1, Math.floor(distance * .2) / 10), far: Math.ceil((distance + citySceneryRadius + 100) / 100) * 100 };
}

/** Allow the entire island to fit even in a narrow portrait viewport. */
export function islandZoomLimit(width, height) {
  const halfAngle = Math.atan(Math.tan(T.MathUtils.degToRad(17)) * Math.min(1, width / height));
  return islandFramingRadius * 1.1 / Math.sin(halfAngle);
}

/** Practical user zoom ranges, relative to each view's fitted default camera. */
export function cameraZoomLimits({mode,width,height,fitDistance,radius=0,focusedRoom=false}) {
  if(mode==='tower')return {min:Math.max(140,fitDistance*.55),max:Math.max(fitDistance*1.1,islandZoomLimit(width,height))};
  if(mode==='explore')return {min:fitDistance*.65,max:fitDistance*2.2};
  return {min:Math.min(fitDistance*.9,Math.max(radius*1.4,fitDistance*.65)),max:fitDistance*(focusedRoom?1.8:1.9)};
}

export function outdoorFramingPoints(mode, width, height=900) {
  const points = [];
  if (mode === 'tower') {
    for (const height of [0, ...setbacks.flatMap(y => [y-.002,y]), towerHeight]) {
      for (const [x, z] of footprint(height, 12)) points.push(new T.Vector3(x, height, z));
    }
    // Compose the landmark and nearby skyline rather than fitting an entire
    // square map. Outer streets/buildings intentionally continue off-frame.
    for(const x of [-23,23]) for(const z of [-23,23]) points.push(new T.Vector3(x,0,z));
    if(width>480&&(width>760||width>=height)) for(const bounds of cityEnvelopes.filter(b=>['02','04'].includes(b.lotId))) {
      for(const x of [bounds.minX,bounds.maxX]) for(const z of [bounds.minZ,bounds.maxZ]) points.push(new T.Vector3(x,bounds.maxY,z));
    }
  } else {
    for (const [index, section] of sections.entries()) {
      const offset = (index % 2 ? 1 : -1) * (index === 4 ? 10 : 8);
      const levels=[section.low,section.high,...setbacks.filter(y=>y>section.low&&y<section.high).flatMap(y=>[y-.002,y])];
      for (const y of levels) for (const [x, z] of footprint(y === section.high ? y - .002 : y, 12)) {
        points.push(new T.Vector3(x + offset, y + (4 - index) * 10, z));
      }
    }
  }
  return points;
}

/** Fit actual outdoor bounds while keeping the orbit pivot on the tower axis. */
export function outdoorCameraPose(mode, width, height, direction = null) {
  if (!direction || direction.lengthSq() < 1e-8) direction = null;
  const layout = outdoorViewLayout(width, height, mode);
  const azimuth = direction ? Math.atan2(direction.x, direction.z) : openingAzimuth;
  const polar = direction ? Math.acos(T.MathUtils.clamp(direction.y / direction.length(), -1, 1)) : mode === 'tower' ? 1.70 : 1.13;
  // Very steep user orbits still navigate to a legible view above the district.
  let phi = T.MathUtils.clamp(polar, .6, 1.72);
  // Wide, short viewports need a longer fit. Raise its angle just enough to
  // keep that extra distance from putting the opening camera below the street.
  for(let attempt=0;attempt<18;attempt++,phi-=.01) {
  const view = new T.Vector3(Math.sin(azimuth) * Math.sin(phi), Math.cos(phi), Math.cos(azimuth) * Math.sin(phi));
  const right = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), view).normalize();
  const up = new T.Vector3().crossVectors(view, right).normalize();
  const tangent = Math.tan(T.MathUtils.degToRad(17));
  const margin=mode==='tower'?1.24:1.07;
  const horizontal = tangent * (layout.rect.right - layout.rect.left) / height / margin;
  const vertical = tangent * (layout.rect.bottom - layout.rect.top) / height / margin;
  let upper = -Infinity, lower = -Infinity, sideways = 0;
  for (const point of outdoorFramingPoints(mode, width, height)) {
    const depth = point.dot(view), y = point.dot(up);
    upper = Math.max(upper, depth + y / vertical);
    lower = Math.max(lower, depth - y / vertical);
    sideways = Math.max(sideways, depth + Math.abs(point.dot(right)) / horizontal);
  }
  const shift = vertical * (upper - lower) / 2;
  const target = new T.Vector3(0, shift / up.y, 0);
  const distance = Math.max(sideways, (upper + lower) / 2) - target.dot(view);
  const position=target.clone().addScaledVector(view,distance);
  if(position.y>=2||attempt===17) return {target,position,layout};
  }
}
