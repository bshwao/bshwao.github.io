import * as T from './vendor/three.module.min.js';
import { districtPlan } from './district-ground.js';
import { applyDistrictDepth, shadeDistrictGeometry } from './district-style.js';

const schemes = [
  { type: 'campus', height: 9, form: 'court' },
  { type: 'apartments', height: 15, form: 'bar' },
  { type: 'office', height: 15, form: 'stepped' },
  { type: 'apartments', height: 12, form: 'pair' },
  { type: 'workshop', height: 6, form: 'gable' },
  { type: 'campus', height: 9, form: 'corner' },
  { type: 'office', height: 12, form: 'stepped' },
  { type: 'workshop', height: 6, form: 'sawtooth' },
  { type: 'apartments', height: 12, form: 'court' },
  { type: 'workshop', height: 6, form: 'test-yard' },
  { type: 'campus', height: 9, form: 'bar' },
  { type: 'office', height: 12, form: 'stepped' },
];

/** Solid white district buildings, baked into five shared rendering layers. */
export function createDistrictBuildings() {
  const root = new T.Group(); root.name = 'district-buildings';
  const surfaces = [], roofs = [], glazing = [], outlines = [], details = [];
  const buildings = [];
  const boxGeometry = new T.BoxGeometry(1, 1, 1).toNonIndexed();
  const boxPositions = boxGeometry.attributes.position;
  const base = -.4;

  function segment(target, a, b) { target.push(...a, ...b); }
  function path(target, points) {
    for (let i = 1; i < points.length; i++) segment(target, points[i - 1], points[i]);
  }
  function rectangle(target, x0, z0, x1, z1, y) {
    path(target, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0, y, z0]]);
  }
  function quad(target, a, b, c, d) { target.push(...a, ...b, ...c, ...a, ...c, ...d); }

  for (const [index, parcel] of districtPlan.parcels.entries()) {
    const scheme = schemes[index];
    const [px0, pz0, px1, pz1] = parcel.bounds;
    const cx = (px0 + px1) / 2, cz = (pz0 + pz1) / 2;
    // Keep a broad pedestrian strip on every side, including all roof overhangs.
    const width = px1 - px0 - 12, depth = pz1 - pz0 - 12;
    const bounds = new T.Box3();
    const parts = [];
    const building = { parcelId: parcel.id, ...scheme, bounds, parts };
    buildings.push(building);

    function block(x, z, w, d, h, bottom = base, facade = true) {
      const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
      const top = bottom + h;
      for (let i = 0; i < boxPositions.count; i++) {
        surfaces.push(x + boxPositions.getX(i) * w, bottom + (boxPositions.getY(i) + .5) * h, z + boxPositions.getZ(i) * d);
      }
      // A separate pale roof plane gives each volume a readable top in the plan.
      quad(roofs, [x0, top + .025, z0], [x0, top + .025, z1], [x1, top + .025, z1], [x1, top + .025, z0]);
      rectangle(outlines, x0, z0, x1, z1, bottom);
      rectangle(outlines, x0, z0, x1, z1, top + .035);
      for (const x of [x0, x1]) for (const z of [z0, z1]) segment(outlines, [x, bottom, z], [x, top, z]);
      bounds.expandByPoint(new T.Vector3(x0, bottom, z0));
      bounds.expandByPoint(new T.Vector3(x1, top + .05, z1));
      parts.push({ x, z, width: w, depth: d, bottom, top });
      if (facade) elevation(x0, z0, x1, z1, bottom, h);
      return top;
    }

    function elevation(x0, z0, x1, z1, bottom, h) {
      const storey = scheme.type === 'workshop' ? h : 3;
      const count = Math.max(1, Math.round(h / storey));
      for (let floor = 0; floor < count; floor++) {
        const low = bottom + (floor + .31) * h / count;
        const high = bottom + (floor + .75) * h / count;
        // Four elevations use the same bay rhythm; no billboard-facing facades.
        for (const [a0, a1, fixed, axis, facing] of [
          [x0, x1, z0 - .045, 'x', -1], [x0, x1, z1 + .045, 'x', 1],
          [z0, z1, x0 - .045, 'z', -1], [z0, z1, x1 + .045, 'z', 1],
        ]) {
          const point = (a, y) => axis === 'x' ? [a, y, fixed] : [fixed, y, a];
          const span = a1 - a0;
          const pitch = scheme.type === 'apartments' ? 3.8 : scheme.type === 'workshop' ? 6 : 5.2;
          const bays = Math.max(1, Math.floor((span - 2) / pitch));
          const bay = (span - 2) / bays;
          const inset = scheme.type === 'apartments' ? .7 : .35;
          for (let i = 0; i < bays; i++) {
            const left = a0 + 1 + i * bay + inset / 2;
            const right = a0 + 1 + (i + 1) * bay - inset / 2;
            let points = [point(left, low), point(right, low), point(right, high), point(left, high)];
            // Front-facing winding on each side keeps glass surfaces solid.
            if ((axis === 'x' && facing < 0) || (axis === 'z' && facing > 0)) points = points.reverse();
            quad(glazing, ...points);
            path(details, [...points, points[0]]);
            if (scheme.type === 'office' || scheme.type === 'campus') {
              const mid = (left + right) / 2;
              segment(details, point(mid, low), point(mid, high));
            }
          }
        }
        if (floor > 0) rectangle(details, x0 - .05, z0 - .05, x1 + .05, z1 + .05, bottom + floor * h / count);
      }
    }

    if (scheme.form === 'court') {
      const bar = Math.min(width, depth) * .28;
      // Three independent wings leave a real, open courtyard facing the plaza.
      const sign = cz < 0 ? -1 : 1;
      block(cx - (width - bar) / 2, cz, bar, depth, scheme.height);
      block(cx + (width - bar) / 2, cz, bar, depth, scheme.height);
      block(cx, cz + sign * (depth - bar) / 2, width - bar * 2, bar, scheme.height - 3);
    } else if (scheme.form === 'pair') {
      const w = width * .36;
      block(cx - width * .29, cz, w, depth * .84, scheme.height);
      block(cx + width * .29, cz, w, depth * .84, scheme.height + 3);
      block(cx, cz, width * .22, depth * .24, 3, base, false);
    } else if (scheme.form === 'corner') {
      block(cx, cz - depth * .25, width, depth * .5, scheme.height);
      block(cx - width * .33, cz + depth * .25, width * .34, depth * .5, scheme.height - 3);
    } else if (scheme.form === 'stepped') {
      const podium = block(cx, cz, width, depth, 3);
      block(cx, cz, width * .7, depth * .68, scheme.height - 3, podium);
    } else if (scheme.form === 'bar') {
      block(cx, cz, width * .85, depth * .9, scheme.height);
    } else {
      const hallDepth = scheme.form === 'test-yard' ? depth * .28 : depth;
      const hallZ = scheme.form === 'test-yard' ? cz + depth * .36 : cz;
      const top = block(cx, hallZ, width, hallDepth, scheme.height);
      if (scheme.form === 'gable' || scheme.form === 'test-yard') {
        const ridge = top + 2.1;
        const x0 = cx - width / 2, x1 = cx + width / 2, z0 = hallZ - hallDepth / 2, z1 = hallZ + hallDepth / 2;
        quad(roofs, [x0, top, z0], [x0, top, z1], [cx, ridge, z1], [cx, ridge, z0]);
        quad(roofs, [cx, ridge, z0], [cx, ridge, z1], [x1, top, z1], [x1, top, z0]);
        surfaces.push(x1, top, z0, x0, top, z0, cx, ridge, z0,
          x0, top, z1, x1, top, z1, cx, ridge, z1);
        for (const z of [z0, z1]) path(outlines, [[x0, top, z], [cx, ridge, z], [x1, top, z]]);
        segment(outlines, [cx, ridge, z0], [cx, ridge, z1]);
        bounds.max.y = ridge;
      } else {
        const x0 = cx - width / 2, x1 = cx + width / 2;
        for (let roof = 0; roof < 3; roof++) {
          const z0 = cz - depth / 2 + roof * depth / 3, z1 = z0 + depth / 3;
          const high = top + 1.8;
          quad(roofs, [x0, top, z0], [x0, high, z1], [x1, high, z1], [x1, top, z0]);
          quad(glazing, [x0, top, z1], [x1, top, z1], [x1, high, z1], [x0, high, z1]);
          // Solid triangular ends close each sawtooth rather than leaving holes.
          surfaces.push(x0, top, z1, x0, high, z1, x0, top, z0,
            x1, top, z0, x1, high, z1, x1, top, z1);
          for (const x of [x0, x1]) path(outlines, [[x, top, z0], [x, high, z1], [x, top, z1]]);
          segment(outlines, [x0, high, z1], [x1, high, z1]);
          bounds.max.y = high;
        }
      }
    }
  }
  boxGeometry.dispose();

  const layers = [
    { name: 'building-surfaces', positions: surfaces, color: '#fcfdff', mesh: true },
    { name: 'building-roofs', positions: roofs, color: '#edf4fc', mesh: true },
    { name: 'building-glazing', positions: glazing, color: '#dae7f5', mesh: true },
    { name: 'building-outlines', positions: outlines, color: '#7296bf', opacity: .8 },
    { name: 'building-facades', positions: details, color: '#a2bcd8', opacity: .46 },
  ];
  for (const layer of layers) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(layer.positions, 3));
    if (layer.mesh) shadeDistrictGeometry(geometry, layer.color);
    const material = applyDistrictDepth(layer.mesh
      ? new T.MeshBasicMaterial({ color: '#ffffff', vertexColors: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
      : new T.LineBasicMaterial({ color: layer.color, transparent: true, opacity: layer.opacity, depthWrite: false }), layer.mesh ? .52 : .72);
    const object = layer.mesh ? new T.Mesh(geometry, material) : new T.LineSegments(geometry, material);
    object.name = layer.name;
    layer.material = material;
    root.add(object);
  }
  return {
    root, buildings,
    setPresentation(expansion, reveal) {
      const amount = (1 - T.MathUtils.clamp(reveal, 0, 1)) * (1 - T.MathUtils.clamp(expansion, 0, 1) * .7);
      root.visible = amount > .005;
      for (const layer of layers) {
        const material = layer.material;
        material.opacity = (layer.opacity ?? 1) * amount;
        if (layer.mesh && material.transparent !== (amount < .999)) {
          material.transparent = amount < .999; material.needsUpdate = true;
        }
      }
    },
  };
}
