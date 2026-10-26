import * as T from './vendor/three.module.min.js';

const epsilon = 1e-7;
const corners = [
  [[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]],
  [[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-.5,-.5,-.5]],
  [[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],
  [[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]],
  [[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5],[-.5,-.5,.5]],
  [[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5],[.5,-.5,-.5]],
];
const key = value => Math.round(value * 1e5);

function substantial(polygon) {
  if (polygon.length < 3) return false;
  const cross = new T.Vector3(), a = new T.Vector3(), b = new T.Vector3();
  for (let i = 1; i < polygon.length - 1; i++)
    cross.add(a.subVectors(polygon[i], polygon[0]).cross(b.subVectors(polygon[i + 1], polygon[0])));
  return cross.lengthSq() > epsilon * epsilon;
}

function split(polygon, plane) {
  const inside = [], outside = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const da = plane.normal.dot(a) - plane.distance, db = plane.normal.dot(b) - plane.distance;
    if (da <= epsilon) inside.push(a);
    if (da >= -epsilon) outside.push(a);
    if ((da < -epsilon && db > epsilon) || (da > epsilon && db < -epsilon)) {
      const point = a.clone().lerp(b, da / (da - db));
      inside.push(point); outside.push(point);
    }
  }
  return { inside, outside };
}

function subtract(polygon, planes) {
  let remainder = polygon;
  const visible = [];
  for (const plane of planes) {
    // An entire face on the clipping boundary belongs to the solid, rather
    // than being emitted again on both sides of the same join.
    if (remainder.every(point => Math.abs(plane.normal.dot(point) - plane.distance) <= epsilon)) continue;
    const { inside, outside } = split(remainder, plane);
    if (substantial(outside)) visible.push(outside);
    if (!substantial(inside)) return visible;
    remainder = inside;
  }
  return visible;
}

function geometry(positions, normals = null) {
  const result = new T.BufferGeometry();
  result.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  if (normals) result.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  result.computeBoundingBox(); result.computeBoundingSphere();
  return result;
}

/** One stroke for collinear joins and shared circulation/floor guides. */
export function mergeSurfaceLines(positions) {
  const groups = new Map(), direction = new T.Vector3(), moment = new T.Vector3();
  for (let offset = 0; offset < positions.length; offset += 6) {
    const a = new T.Vector3().fromArray(positions, offset), b = new T.Vector3().fromArray(positions, offset + 3);
    direction.subVectors(b, a);
    if (direction.lengthSq() < epsilon * epsilon) continue;
    direction.normalize();
    if (direction.toArray().find(value => Math.abs(value) > epsilon) < 0) direction.negate();
    moment.crossVectors(a, direction);
    const signature = [...direction.toArray(), ...moment.toArray()].map(key).join(',');
    if (!groups.has(signature)) groups.set(signature, { direction: direction.clone(), origin: a, intervals: [] });
    const group = groups.get(signature), start = a.dot(group.direction), end = b.dot(group.direction);
    group.intervals.push([Math.min(start, end), Math.max(start, end)]);
  }
  const result = [];
  for (const { direction, origin, intervals } of groups.values()) {
    intervals.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const interval of intervals) {
      const previous = merged.at(-1);
      if (previous && interval[0] <= previous[1] + 1e-5) previous[1] = Math.max(previous[1], interval[1]);
      else merged.push([...interval]);
    }
    const anchor = origin.dot(direction);
    for (const [start, end] of merged) result.push(...origin.clone().addScaledVector(direction, start - anchor).toArray(), ...origin.clone().addScaledVector(direction, end - anchor).toArray());
  }
  return geometry(result);
}

/** Remove repeated/internal strokes, including partial overlaps and T joins. */
function outlines(faces) {
  const lines = new Map(), direction = new T.Vector3(), moment = new T.Vector3();
  for (const face of faces) for (let i = 0; i < face.points.length; i++) {
    const a = face.points[i], b = face.points[(i + 1) % face.points.length];
    direction.subVectors(b, a);
    if (direction.lengthSq() < epsilon * epsilon) continue;
    direction.normalize();
    const first = direction.toArray().find(value => Math.abs(value) > epsilon);
    if (first < 0) direction.negate();
    moment.crossVectors(a, direction);
    const signature = [...direction.toArray(), ...moment.toArray()].map(key).join(',');
    if (!lines.has(signature)) lines.set(signature, { direction: direction.clone(), origin: a.clone(), segments: [] });
    const line = lines.get(signature), start = a.dot(line.direction), end = b.dot(line.direction);
    line.segments.push({ start: Math.min(start, end), end: Math.max(start, end), normal: face.normal, outline: face.outline });
  }
  const positions = [];
  for (const { direction, origin, segments } of lines.values()) {
    const stops = [...new Set(segments.flatMap(segment => [key(segment.start), key(segment.end)]))].sort((a, b) => a - b).map(value => value / 1e5);
    let start = null, end = null;
    const emit = () => {
      if (start === null) return;
      const anchor = origin.dot(direction);
      positions.push(...origin.clone().addScaledVector(direction, start - anchor).toArray(), ...origin.clone().addScaledVector(direction, end - anchor).toArray());
      start = end = null;
    };
    for (let i = 1; i < stops.length; i++) {
      const middle = (stops[i - 1] + stops[i]) / 2;
      const covering = segments.filter(segment => middle > segment.start - epsilon && middle < segment.end + epsilon);
      const edge = covering.some(segment => segment.outline) && (covering.length === 1 || covering.some(segment => segment.normal.dot(covering[0].normal) < .98));
      if (edge) { start ??= stops[i - 1]; end = stops[i]; } else emit();
    }
    emit();
  }
  return geometry(positions);
}

/**
 * Exposed faces of a union of solid boxes, including rotated corner pieces.
 * Coplanar material boundaries have one owner; buried faces and internal
 * outline seams are removed before the existing material batches are built.
 */
export function buildBoxSurfaces(primitives) {
  const boxes = primitives.map((primitive, index) => {
    const faces = corners.map(points => {
      points = points.map(point => new T.Vector3(...point).applyMatrix4(primitive.matrix));
      const normal = new T.Vector3().subVectors(points[1], points[0]).cross(new T.Vector3().subVectors(points[2], points[0])).normalize();
      return { points, normal, distance: normal.dot(points[0]), surface: primitive.surface, outline: primitive.outline !== false, index };
    });
    return { ...primitive, index, faces, bounds: new T.Box3().setFromPoints(faces.flatMap(face => face.points)) };
  });
  const faces = [], surfaces = new Map();
  const priority = { structure: 0, glass: 1, accent: 2, equipment: 2, ink: 3 };
  for (const box of boxes) {
    const bounds = box.bounds.clone().expandByScalar(epsilon);
    const neighbors = boxes.filter(other => other !== box && other.bounds.intersectsBox(bounds));
    for (const face of box.faces) {
      let pieces = [face.points];
      for (const other of neighbors) {
        const same = other.faces.some(plane => plane.normal.dot(face.normal) > 1 - epsilon && Math.abs(plane.distance - face.distance) < epsilon);
        // Colored architectural batches retain the role before the finish key.
        const owner = (priority[box.surface?.split('|')[0]] ?? 0) - (priority[other.surface?.split('|')[0]] ?? 0) || box.index - other.index;
        if (same && owner > 0) continue;
        pieces = pieces.flatMap(points => subtract(points, other.faces));
        if (!pieces.length) break;
      }
      for (const points of pieces) if (substantial(points)) faces.push({ ...face, points });
    }
  }
  for (const face of faces) {
    if (!surfaces.has(face.surface)) surfaces.set(face.surface, { positions: [], normals: [] });
    const bucket = surfaces.get(face.surface);
    for (let i = 1; i < face.points.length - 1; i++) {
      const triangle = [face.points[0], face.points[i], face.points[i + 1]];
      if (!substantial(triangle)) continue;
      for (const point of triangle) { bucket.positions.push(...point.toArray()); bucket.normals.push(...face.normal.toArray()); }
    }
  }
  return { surfaces: new Map([...surfaces].map(([surface, bucket]) => [surface, geometry(bucket.positions, bucket.normals)])),
    outline: outlines(faces), faceCount: faces.length };
}
