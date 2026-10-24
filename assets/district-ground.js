import { palette } from './color-theme.js';
import * as T from './vendor/three.module.min.js';
import { applyDistrictDepth } from './district-style.js';
import { districtPlan } from './city-layout.js';
import { cityPalette } from './city-environment.js';
import { applyGroundTexture } from './ground-materials.js';
import { planRoadMarkings, roadPaint } from './road-markings.js';
export { districtPlan } from './city-layout.js';

// One world-space master plan, shared with future district buildings.
// North is -Z. Dimensions are model units, rather than surveyed real-world metres.

// Simple drafting lettering stays sharp at every zoom; no font or texture loads.
const glyphs = {
  '0': [[[0, 0], [.6, 0], [.6, 1], [0, 1], [0, 0]]],
  '1': [[[.1, .8], [.3, 1], [.3, 0]], [[0, 0], [.6, 0]]],
  '2': [[[0, .8], [0, 1], [.6, 1], [.6, .55], [0, .2], [0, 0], [.6, 0]]],
  '3': [[[0, 1], [.6, 1], [.6, 0], [0, 0]], [[.1, .5], [.6, .5]]],
  '4': [[[0, 1], [0, .5], [.6, .5]], [[.6, 1], [.6, 0]]],
  '5': [[[.6, 1], [0, 1], [0, .5], [.6, .5], [.6, 0], [0, 0]]],
  '6': [[[.6, 1], [0, 1], [0, 0], [.6, 0], [.6, .5], [0, .5]]],
  '7': [[[0, 1], [.6, 1], [.15, 0]]],
  '8': [[[0, .5], [0, 1], [.6, 1], [.6, 0], [0, 0], [0, .5], [.6, .5]]],
  '9': [[[.6, .5], [0, .5], [0, 1], [.6, 1], [.6, 0], [0, 0]]],
  A: [[[0, 0], [0, .7], [.3, 1], [.6, .7], [.6, 0]], [[0, .4], [.6, .4]]],
  B: [[[0, 0], [0, 1], [.45, 1], [.6, .8], [.6, .65], [.45, .5], [0, .5]], [[.45, .5], [.6, .35], [.6, .15], [.45, 0], [0, 0]]],
  C: [[[.6, 1], [0, 1], [0, 0], [.6, 0]]],
  E: [[[.6, 1], [0, 1], [0, 0], [.6, 0]], [[0, .5], [.5, .5]]],
  F: [[[0, 0], [0, 1], [.6, 1]], [[0, .5], [.5, .5]]],
  G: [[[.6, 1], [0, 1], [0, 0], [.6, 0], [.6, .5], [.3, .5]]],
  I: [[[0, 1], [.6, 1]], [[.3, 1], [.3, 0]], [[0, 0], [.6, 0]]],
  L: [[[0, 1], [0, 0], [.6, 0]]],
  M: [[[0, 0], [0, 1], [.3, .5], [.6, 1], [.6, 0]]],
  N: [[[0, 0], [0, 1], [.6, 0], [.6, 1]]],
  O: [[[0, 0], [0, 1], [.6, 1], [.6, 0], [0, 0]]],
  P: [[[0, 0], [0, 1], [.6, 1], [.6, .5], [0, .5]]],
  R: [[[0, 0], [0, 1], [.6, 1], [.6, .5], [0, .5]], [[.25, .5], [.6, 0]]],
  S: [[[.6, 1], [0, 1], [0, .5], [.6, .5], [.6, 0], [0, 0]]],
  T: [[[0, 1], [.6, 1]], [[.3, 1], [.3, 0]]],
  U: [[[0, 1], [0, 0], [.6, 0], [.6, 1]]],
  W: [[[0, 1], [.1, 0], [.3, .5], [.5, 0], [.6, 1]]],
  '/': [[[0, 0], [.6, 1]]],
  Z: [[[0, 1], [.6, 1], [0, 0], [.6, 0]]],
};

export function appendDraftingText(positions, value, size, project) {
  const start = -(value.length * .9 - .3) * size / 2;
  [...value].forEach((char, index) => {
    for (const path of glyphs[char] || []) for (let i = 1; i < path.length; i++) {
      for (const point of [path[i - 1], path[i]]) positions.push(...project(start + (index * .9 + point[0]) * size, point[1] * size));
    }
  });
}

/** Static, batched ground geometry. Decorative only: never a picking target. */
export function createDistrictGround() {
  const root = new T.Group(); root.name = 'blueprint-district';
  const layers = new Map();
  function layer(name, color, { surface = false, opacity = 1, order = 0 } = {}) {
    const material = surface
      ? new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
      : new T.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    applyDistrictDepth(material, surface ? .48 : .72);
    if(surface&&name==='streets')applyGroundTexture(material,'asphalt');
    else if(surface&&['sidewalks','central-plaza','parcels','urban-base'].includes(name))applyGroundTexture(material,'stone');
    const item = { name, positions: [], material, opacity, surface, order };
    layers.set(name, item); return item;
  }
  const minor = layer('draft-grid-minor', palette.grid, { opacity: .38, order: -12 });
  const major = layer('draft-grid-major', palette.line, { opacity: .5, order: -11 });
  const urban = layer('urban-base', '#a3a497', {surface:true,order:-13});
  const streets = layer('streets', cityPalette.road, { surface: true, order: -10 });
  const walks = layer('sidewalks', cityPalette.pavement, { surface: true, order: -9 });
  const plaza = layer('central-plaza', '#b1a797', { surface: true, order: -8 });
  const parcels = layer('parcels', cityPalette.pavement, { surface: true, order: -8 });
  const boundaries = layer('curbs-and-parcels', '#6b6e71', { opacity: .72, order: -7 });
  const details = layer('paving-and-road-marks', palette.line, { opacity: .48, order: -6 });
  const notes = layer('survey-annotations', palette.draft, { opacity: .72, order: -5 });
  const markings = layer('road-markings', '#ffffff', { surface: true, order: -5 });
  markings.colors = [];
  markings.material.polygonOffset = true; markings.material.polygonOffsetFactor = -1; markings.material.polygonOffsetUnits = -1;
  const paintColors = new Map();
  function paintColor(count, color = roadPaint.crossing) {
    if (!paintColors.has(color)) paintColors.set(color, new T.Color(color).toArray());
    for (let i = 0; i < count; i++) markings.colors.push(...paintColors.get(color));
  }

  function segment(target, x1, z1, x2, z2, y = -.22) {
    target.positions.push(x1, y, z1, x2, y, z2);
  }
  function outline(target, x0, z0, x1, z1, y = -.22) {
    segment(target, x0, z0, x1, z0, y); segment(target, x1, z0, x1, z1, y);
    segment(target, x1, z1, x0, z1, y); segment(target, x0, z1, x0, z0, y);
  }
  function rect(target, x0, z0, x1, z1, y) {
    target.positions.push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0);
    if (target === markings) paintColor(6);
  }
  function text(value, x, z, size = 2.1) {
    appendDraftingText(notes.positions, value, size, (dx, dy) => [x + dx, -.22, z - dy]);
  }
  function roadRect(center, a0, a1, b0, b1, axis) {
    if (axis === 'z') rect(markings, center + a0, b0, center + a1, b1, -.625);
    else rect(markings, b0, center + a0, b1, center + a1, -.625);
  }
  function arrow(center, lane, along, direction, axis) {
    roadRect(center, lane - .12, lane + .12, along - 1.6, along + 1.6, axis);
    const point = (across, forward) => axis === 'z' ? [center + across, -.625, forward] : [forward, -.625, center + across];
    const triangle = [point(lane - .85, along + direction * .9), point(lane + .85, along + direction * .9), point(lane, along + direction * 2.3)];
    // Keep both road orientations and travel directions facing the sky.
    const normal = new T.Vector3().subVectors(new T.Vector3(...triangle[1]), new T.Vector3(...triangle[0])).cross(new T.Vector3().subVectors(new T.Vector3(...triangle[2]), new T.Vector3(...triangle[0])));
    if (normal.y < 0) triangle.reverse();
    markings.positions.push(...triangle.flat());
    paintColor(3);
  }

  // Fade the outer drafting field into the white background using vertex colours.
  const extent = districtPlan.extent;
  // The city is framed from its streets; the old tabletop drafting field is
  // retained as an empty optional layer rather than uploading invisible lines.

  const roadHalf = districtPlan.roadWidth / 2;
  rect(urban,-108,-108,108,140,-.78);
  for (const center of districtPlan.roadCenters) {
    const lo = center - roadHalf, hi = center + roadHalf;
    // Split at intersections, avoiding stacked transparent surfaces.
    rect(streets, lo, -170, hi, 170, -.65);
    for (const [left, right] of [[-170, -47], [-37, 37], [47, 170]]) rect(streets, left, lo, right, hi, -.65);
    for (const [start, end] of [[-102, -48], [-36, 36], [48, 102]]) {
      for (const edge of [lo, hi]) {
        const outward = edge === lo ? -1 : 1;
        const walkEdge = edge + outward * districtPlan.sidewalkWidth;
        rect(walks, Math.min(edge, walkEdge), start, Math.max(edge, walkEdge), end, -.48);
        rect(walks, start, Math.min(edge, walkEdge), end, Math.max(edge, walkEdge), -.48);
        segment(boundaries, edge, start, edge, end); segment(boundaries, start, edge, end, edge);
        // Regular joints make the footpaths read as paved rather than road lanes.
        for (let tick = start + 3; tick < end; tick += 6) {
          segment(details, edge, tick, walkEdge, tick); segment(details, tick, edge, tick, walkEdge);
        }
      }
    }
    for (const axis of ['x', 'z']) {
      for (const direction of [-1, 1]) {
        const lane = axis === 'z' ? -direction : direction;
        roadRect(center, lane > 0 ? .6 : -4.2, lane > 0 ? 4.2 : -.6, -direction * 5.8 - .16, -direction * 5.8 + .16, axis);
        arrow(center, lane * 2.5, -direction * 19, direction, axis);
      }
    }
  }
  const roadMarkings = planRoadMarkings('downtown');
  for (const patch of roadMarkings) {
    const [a, b, c, d] = patch.points;
    markings.positions.push(...a, ...b, ...c, ...a, ...c, ...d); paintColor(6, patch.color);
  }

  const p = districtPlan.plazaHalf;
  rect(plaza, -p, -p, p, p, -.38);
  outline(boundaries, -p, -p, p, p);
  outline(details, -p + 2, -p + 2, p - 2, p - 2);
  // Four paved approaches meet the existing circular tower apron.
  for (const side of [-1, 1]) for (const offset of [-4, 4]) {
    segment(details, offset, side * p, offset, side * 36);
    segment(details, side * p, offset, side * 36, offset);
  }
  text('PLAZA', 0, 33.5, 1.45);

  for (const parcel of districtPlan.parcels) {
    if(parcel.layer==='outskirts')continue; // Finished lawns/paths replace drafting pads here.
    const [x0, z0, x1, z1] = parcel.bounds;
    rect(parcels, x0, z0, x1, z1, -.42);
    outline(boundaries, x0, z0, x1, z1);
    // Short corner brackets indicate the future building setback.
    for (const x of [x0 + 3, x1 - 3]) for (const z of [z0 + 3, z1 - 3]) {
      segment(details, x, z, x + (x < (x0 + x1) / 2 ? 3 : -3), z);
      segment(details, x, z, x, z + (z < (z0 + z1) / 2 ? 3 : -3));
    }
    text(`P${parcel.id}`, x0 + 5, z1 - 1.6, 1.25);
  }

  // Crosswalks lead to all four sides of the plaza, before the junctions.
  for (const side of [-1, 1]) for (let stripe = -3; stripe <= 3; stripe += 1.5) {
    rect(markings, stripe - .35, Math.min(side * 38, side * 46), stripe + .35, Math.max(side * 38, side * 46), -.625);
    rect(markings, Math.min(side * 38, side * 46), stripe - .35, Math.max(side * 38, side * 46), stripe + .35, -.625);
  }

  // Survey datum crosses and a dimension chain for the central 72-unit block.
  for (const x of [-102, 0, 102]) for (const z of [-102, 0, 102]) {
    if (x === 0 && z === 0) continue;
    segment(notes, x - 1.4, z, x + 1.4, z); segment(notes, x, z - 1.4, x, z + 1.4);
  }
  for (const x of [-36, 0, 36]) {
    segment(notes, x, -104, x, -112);
    segment(notes, x - 1, -110, x + 1, -108);
  }
  segment(notes, -36, -109, 36, -109);
  text('36', -18, -110.5, 1.8); text('36', 18, -110.5, 1.8);
  // North arrow is attached to the ground, so it orbits with the master plan.
  const nx = -110, nz = -78;
  segment(notes, nx, nz + 9, nx, nz - 6);
  segment(notes, nx, nz - 6, nx - 3, nz);
  segment(notes, nx, nz - 6, nx + 3, nz);
  segment(notes, nx - 3, nz, nx + 3, nz);
  text('N', nx, nz - 9, 3);

  for (const item of layers.values()) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(item.positions, 3));
    if (item.colors) { geometry.setAttribute('color', new T.Float32BufferAttribute(item.colors, 3)); item.material.vertexColors = true; }
    if (item === minor || item === major) {
      const base = item.material.color.clone(), white = new T.Color(palette.paper);
      const colors = [];
      for (let i = 0; i < item.positions.length; i += 3) {
        const edge = Math.max(Math.abs(item.positions[i]), Math.abs(item.positions[i + 2]));
        const fade = T.MathUtils.smoothstep(edge, 92, extent);
        colors.push(...base.clone().lerp(white, fade).toArray());
      }
      geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
      item.material.color.set('#ffffff'); item.material.vertexColors = true;
    }
    const object = item.surface ? new T.Mesh(geometry, item.material) : new T.LineSegments(geometry, item.material);
    object.name = item.name; object.renderOrder = item.order;
    if([minor,major,notes].includes(item)) object.visible=false;
    root.add(object);
  }

  return {
    root,
    roadMarkings,
    setPresentation(expansion, reveal) {
      const amount = (1 - T.MathUtils.clamp(reveal, 0, 1)) * (1 - T.MathUtils.clamp(expansion, 0, 1) * .6);
      root.visible = amount > .005;
      for (const item of layers.values()) item.material.opacity = item.opacity * amount;
    },
  };
}
