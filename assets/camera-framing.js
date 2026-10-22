import * as T from './vendor/three.module.min.js';
import { districtPlan } from './district-ground.js';
import { sections, setbacks, footprint } from './tower-geometry.js';
import { outdoorViewLayout } from './spatial-layout.js';

const openingAzimuth = Math.atan2(.57, 1);

/** Keep fine facade/roof layers distinguishable in the depth buffer at any zoom. */
export function cameraDepthRange(distance) {
  return { near: Math.max(.1, Math.floor(distance * .2) / 10), far: Math.max(1000, Math.ceil((distance + 600) / 100) * 100) };
}

export function outdoorFramingPoints(mode, width) {
  const points = [];
  if (mode === 'tower') {
    for (const height of [0, ...setbacks.flatMap(y => [y-.002,y]), 110]) {
      for (const [x, z] of footprint(height, 12)) points.push(new T.Vector3(x, height, z));
    }
    if (width <= 480) {
      // Portrait keeps the tower and plaza prominent; the outer district is context.
      for (let i = 0; i < 32; i++) points.push(new T.Vector3(Math.cos(i / 16 * Math.PI) * 31, 0, Math.sin(i / 16 * Math.PI) * 31));
    } else {
      for (const { bounds } of districtPlan.parcels) {
        for (const x of [bounds[0] - 2, bounds[2] + 2]) for (const z of [bounds[1] - 2, bounds[3] + 2]) {
          for (const y of [0, 17]) points.push(new T.Vector3(x, y, z));
        }
      }
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
  const polar = direction ? Math.acos(T.MathUtils.clamp(direction.y / direction.length(), -1, 1)) : mode === 'tower' ? 1.02 : 1.13;
  // Very steep user orbits still navigate to a legible view above the district.
  const phi = T.MathUtils.clamp(polar, .6, 1.4);
  const view = new T.Vector3(Math.sin(azimuth) * Math.sin(phi), Math.cos(phi), Math.cos(azimuth) * Math.sin(phi));
  const right = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), view).normalize();
  const up = new T.Vector3().crossVectors(view, right).normalize();
  const tangent = Math.tan(T.MathUtils.degToRad(17));
  const horizontal = tangent * (layout.rect.right - layout.rect.left) / height / 1.07;
  const vertical = tangent * (layout.rect.bottom - layout.rect.top) / height / 1.07;
  let upper = -Infinity, lower = -Infinity, sideways = 0;
  for (const point of outdoorFramingPoints(mode, width)) {
    const depth = point.dot(view), y = point.dot(up);
    upper = Math.max(upper, depth + y / vertical);
    lower = Math.max(lower, depth - y / vertical);
    sideways = Math.max(sideways, depth + Math.abs(point.dot(right)) / horizontal);
  }
  const shift = vertical * (upper - lower) / 2;
  const target = new T.Vector3(0, shift / up.y, 0);
  const distance = Math.max(sideways, (upper + lower) / 2) - target.dot(view);
  return { target, position: target.clone().addScaledVector(view, distance), layout };
}
