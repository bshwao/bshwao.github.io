import * as T from './vendor/three.module.min.js';
import { appendDraftingText } from './district-ground.js';

/** Daytime architectural landscaping and engineering references; all static. */
export function createDistrictDetails(buildings) {
  const root = new T.Group(); root.name = 'district-character';
  const features = [];
  const layers = {
    paper: { color: '#fafcfe', mesh: true, positions: [] },
    blue: { color: '#cbddef', mesh: true, positions: [] },
    foliage: { color: '#e8f1fa', mesh: true, positions: [] },
    paving: { color: '#f0f5fb', mesh: true, unlit: true, positions: [] },
    ink: { color: '#87a8cc', opacity: .74, positions: [] },
    fine: { color: '#aec6df', opacity: .66, positions: [] },
  };
  const sources = new Map();
  let active = null;
  const ground = -.34;
  function source(name) {
    if (!sources.has(name)) {
      const geometry = name === 'box' ? new T.BoxGeometry(1, 1, 1)
        : name === 'tree' ? new T.SphereGeometry(1, 8, 5) : new T.CylinderGeometry(1, 1, 1, 8);
      const edges = new T.EdgesGeometry(geometry, 35);
      const flat = geometry.index ? geometry.toNonIndexed() : geometry;
      sources.set(name, { geometry, flat, edges });
    }
    return sources.get(name);
  }
  function feature(kind, build, placement = 'ground') {
    const previous = active;
    active = { kind, placement, bounds: new T.Box3() };
    features.push(active); build(); active = previous;
  }
  function trackBounds(point) { active?.bounds.expandByPoint(new T.Vector3(...point)); }
  function segment(layer, a, b) {
    layers[layer].positions.push(...a, ...b); trackBounds(a); trackBounds(b);
  }
  function path(layer, points) {
    for (let i = 1; i < points.length; i++) segment(layer, points[i - 1], points[i]);
  }
  function ring(layer, x, y, z, rx, rz = rx) {
    path(layer, Array.from({ length: 25 }, (_, i) => {
      const a = i / 24 * Math.PI * 2;
      return [x + Math.cos(a) * rx, y, z + Math.sin(a) * rz];
    }));
  }
  function quad(layer, a, b, c, d) {
    layers[layer].positions.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (const point of [a, b, c, d]) trackBounds(point);
  }
  function solid(layer, shape, x, y, z, w, h, d, outline = true, turn = 0) {
    const { flat, edges } = source(shape);
    const cos = Math.cos(turn), sin = Math.sin(turn);
    const transform = (positions, i) => {
      const px = positions.getX(i) * w, pz = positions.getZ(i) * d;
      return [x + cos * px + sin * pz, y + positions.getY(i) * h, z - sin * px + cos * pz];
    };
    const positions = flat.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const point = transform(positions, i); layers[layer].positions.push(...point); trackBounds(point);
    }
    if (outline) {
      const positions = edges.attributes.position;
      for (let i = 0; i < positions.count; i += 2) segment('ink', transform(positions, i), transform(positions, i + 1));
    }
  }
  const box = (layer, x, y, z, w, h, d, turn = 0) => solid(layer, 'box', x, y, z, w, h, d, true, turn);
  const cylinder = (layer, x, y, z, r, h) => solid(layer, 'cylinder', x, y, z, r, h, r);
  function text(value, x, y, z, size, wall = false) {
    const positions = [];
    appendDraftingText(positions, value, size, (dx, dy) => wall ? [x, y + dy, z - dx] : [x + dx, y, z - dy]);
    layers.ink.positions.push(...positions);
    for (let i = 0; i < positions.length; i += 3) trackBounds(positions.slice(i, i + 3));
  }
  function paving(x, z, w, d) { box('paving', x, ground - .005, z, w, .06, d); }
  function planter(x, z, w, d) {
    box('paper', x, ground + .22, z, w, .44, d);
    box('foliage', x, ground + .46, z, w - .35, .06, d - .35);
  }
  function tree(x, z, radius = 2, soil = ground) {
    feature('tree', () => {
      cylinder('blue', x, soil + 1.6, z, .15, 3.2);
      solid('foliage', 'tree', x, soil + 4.1, z, radius, 1.8, radius, false);
      ring('fine', x, soil + 4.1, z, radius);
      ring('fine', x, soil + 5.35, z, radius * .64);
    });
  }
  function bench(x, z, turn = 0) {
    feature('bench', () => {
      box('paper', x, ground + .9, z, 3.4, .18, .95, turn);
      for (const dx of [-1.25, 1.25]) {
        box('blue', x + Math.cos(turn) * dx, ground + .42, z - Math.sin(turn) * dx, .18, .85, .7, turn);
      }
      box('paper', x + Math.sin(turn) * .43, ground + 1.4, z + Math.cos(turn) * .43, 3.4, .8, .12, turn);
    });
  }
  function light(x, z, turn = 0) {
    feature('streetlight', () => {
      cylinder('blue', x, ground + .16, z, .3, .32);
      cylinder('paper', x, ground + 3.1, z, .09, 6.2);
      box('paper', x + Math.sin(turn) * .65, ground + 6.1, z + Math.cos(turn) * .65, .16, .16, 1.5, turn);
      box('blue', x + Math.sin(turn) * 1.35, ground + 6.03, z + Math.cos(turn) * 1.35, .55, .22, .9, turn);
    });
  }

  // Four planted plaza corners leave the circular apron and axial paths open.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    feature('plaza-garden', () => {
      paving(sx * 29, sz * 29, 8, 8);
      planter(sx * 29.5, sz * 29.5, 5.1, 5.1);
    });
    tree(sx * 29.5, sz * 29.5, 2.25, ground + .5);
    bench(sx * 29, sz * 24.8, sz < 0 ? Math.PI : 0);
    bench(sx * 24.8, sz * 29, sx < 0 ? -Math.PI / 2 : Math.PI / 2);
  }
  for (const side of [-1, 1]) {
    for (const along of [-73, -20, 20, 73]) {
      tree(side * 49.5, along, 1.9);
      tree(along, side * 49.5, 1.9);
    }
    for (const along of [-21, 21]) {
      light(side * 35.7, along, side * Math.PI / 2);
      light(along, side * 35.7, side > 0 ? 0 : Math.PI);
    }
  }

  // The existing U-shaped buildings frame usable, planted courtyard spaces.
  for (const building of buildings.filter(building => building.form === 'court')) {
    const cx = (building.bounds.min.x + building.bounds.max.x) / 2;
    const cz = (building.bounds.min.z + building.bounds.max.z) / 2;
    const toward = cz < 0 ? 1 : -1;
    feature(building.type === 'campus' ? 'campus-quad' : 'residential-courtyard', () => {
      paving(cx, cz + toward * 4, 13.3, 20);
      box('paper', cx, ground + .05, cz + toward * 5, 2.5, .08, 22);
      for (const side of [-1, 1]) planter(cx + side * 4.3, cz + toward * 3.5, 3.3, 8);
      if (building.type === 'campus') text('CAMPUS', cx, ground + .12, cz + toward * 13, .65);
    });
    for (const side of [-1, 1]) {
      tree(cx + side * 4.3, cz + toward * 3, 1.75, ground + .5);
      bench(cx + side * 4.3, cz + toward * 10, toward < 0 ? Math.PI : 0);
    }
  }

  // Engineering workshop: a street-facing roller door, canopy and working apron.
  const workshop = buildings.find(building => building.parcelId === '05');
  const wx = workshop.bounds.max.x, wz = (workshop.bounds.min.z + workshop.bounds.max.z) / 2;
  feature('engineering-workshop', () => {
    const doorX = wx + .09;
    quad('blue', [doorX, ground, wz - 2.3], [doorX, ground + 3.8, wz - 2.3], [doorX, ground + 3.8, wz + 2.3], [doorX, ground, wz + 2.3]);
    for (let y = .3; y < 3.8; y += .4) segment('fine', [doorX + .025, ground + y, wz - 2.2], [doorX + .025, ground + y, wz + 2.2]);
    box('paper', wx + .9, ground + 4.25, wz, 1.8, .18, 6.2);
    box('paper', wx + .14, ground + 4.8, wz, .16, .8, 6.2);
    text('MFE / LAB', wx + .235, ground + 4.52, wz, .56, true);
    paving(wx + 2.8, wz, 4.2, 14);
    for (const dz of [-5.6, 5.6]) {
      box('paper', wx + 2.6, ground + 1, wz + dz, 1.3, .16, 2.8);
      for (const z of [-1.1, 1.1]) box('blue', wx + 2.6, ground + .48, wz + dz + z, 1, .95, .14);
      box('blue', wx + 2.6, ground + 1.24, wz + dz, .8, .32, 1.1);
      for (const z of [-.35, 0, .35]) segment('ink', [wx + 2.2, ground + 1.42, wz + dz + z], [wx + 3, ground + 1.42, wz + dz + z]);
    }
  }, 'attached');

  // A compact, illustrative test yard keeps the two personal references visible.
  const garage = buildings.find(building => building.form === 'test-yard');
  const tx = (garage.bounds.min.x + garage.bounds.max.x) / 2, tz = 66.8;
  feature('test-garage-frontage', () => {
    const z = garage.bounds.min.z - .09;
    quad('blue', [tx + 2.5, ground, z], [tx - 2.5, ground, z], [tx - 2.5, ground + 3.8, z], [tx + 2.5, ground + 3.8, z]);
    for (let y = .3; y < 3.8; y += .4) segment('fine', [tx - 2.4, ground + y, z - .025], [tx + 2.4, ground + y, z - .025]);
    box('paper', tx, ground + 4.25, z - .55, 6.4, .18, 1.2);
  }, 'attached');
  const oval = (r, y) => {
    const points = [];
    for (let side = 0; side < 2; side++) for (let i = 0; i <= 24; i++) {
      const a = side * Math.PI + i / 24 * Math.PI;
      points.push([tx + Math.cos(a) * r, y, tz + (side === 0 ? 3.5 : -3.5) + Math.sin(a) * r]);
    }
    points.push(points[0]); return points;
  };
  feature('vehicle-test-loop', () => {
    const outer = oval(7, ground + .03), inner = oval(5, ground + .03);
    for (let i = 1; i < outer.length; i++) quad('paving', outer[i - 1], inner[i - 1], inner[i], outer[i]);
    path('ink', oval(7, ground + .07)); path('ink', oval(5, ground + .07));
    const center = oval(6, ground + .08);
    for (let i = 1; i < center.length; i += 2) segment('fine', center[i - 1], center[i]);
    text('POLTERGEIST', tx, ground + .12, tz - .6, .82);
    text('TEST LOOP', tx, ground + .12, tz + 1.9, .62);
    // Starting grid, braking markers and three bollards are schematic fixtures.
    for (const z of [tz - 2.2, tz - 1.6]) segment('ink', [tx + 5.05, ground + .1, z], [tx + 6.95, ground + .1, z]);
    for (const z of [-1.2, 0, 1.2]) cylinder('blue', tx - 3, ground + .25, tz + 5.6 + z, .22, .5);
  });
  feature('formula-test-car', () => {
    const x = tx + 6, z = tz + 1;
    box('paper', x, ground + .4, z, .78, .45, 2.8);
    box('blue', x, ground + .71, z + .15, .6, .32, 1.15);
    for (const dx of [-.65, .65]) for (const dz of [-.8, .85]) box('blue', x + dx, ground + .3, z + dz, .34, .55, .66);
    box('paper', x, ground + .3, z - 1.45, 1.75, .12, .3);
    box('paper', x, ground + .65, z + 1.35, 1.65, .14, .35);
  });
  feature('autonomous-test-car', () => {
    const x = tx - 6, z = tz - .7;
    box('paper', x, ground + .5, z, 1.25, .65, 2.7);
    box('blue', x, ground + 1, z, 1, .45, 1.6);
    for (const dx of [-.65, .65]) for (const dz of [-.85, .85]) box('blue', x + dx, ground + .27, z + dz, .2, .5, .5);
    cylinder('paper', x, ground + 1.38, z, .22, .22);
  });

  // Modest roof plant and panel banks distinguish occupied buildings from blocks.
  for (const building of buildings.filter(building => building.type === 'office' || building.type === 'campus')) {
    const part = [...building.parts].sort((a, b) => b.top - a.top)[0];
    feature('roof-equipment', () => {
      box('paper', part.x, part.top + .5, part.z, 2.2, .9, 2.2);
      for (let i = 0; i < 4; i++) segment('fine', [part.x - .8, part.top + .97, part.z - .6 + i * .4], [part.x + .8, part.top + .97, part.z - .6 + i * .4]);
      for (const side of [-1, 1]) {
        box('blue', part.x + side * 2.7, part.top + .16, part.z, 1.8, .18, 3.5);
        segment('fine', [part.x + side * 2.7, part.top + .27, part.z - 1.7], [part.x + side * 2.7, part.top + .27, part.z + 1.7]);
      }
    }, 'roof');
  }

  for (const [name, layer] of Object.entries(layers)) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(layer.positions, 3));
    if (layer.mesh) geometry.computeVertexNormals();
    const options = { color: layer.color, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
    const material = layer.mesh
      ? layer.unlit ? new T.MeshBasicMaterial(options) : new T.MeshLambertMaterial(options)
      : new T.LineBasicMaterial({ color: layer.color, transparent: true, opacity: layer.opacity, depthWrite: false });
    const object = layer.mesh ? new T.Mesh(geometry, material) : new T.LineSegments(geometry, material);
    object.name = `district-detail-${name}`; layer.material = material; root.add(object);
  }
  for (const { geometry, flat, edges } of sources.values()) {
    geometry.dispose(); if (flat !== geometry) flat.dispose(); edges.dispose();
  }
  return {
    root, features,
    setPresentation(expansion, reveal) {
      const amount = (1 - T.MathUtils.clamp(reveal, 0, 1)) * (1 - T.MathUtils.clamp(expansion, 0, 1) * .75);
      root.visible = amount > .005;
      for (const layer of Object.values(layers)) {
        const material = layer.material;
        material.opacity = (layer.opacity ?? 1) * amount;
        if (layer.mesh && material.transparent !== (amount < .999)) {
          material.transparent = amount < .999; material.needsUpdate = true;
        }
      }
    },
  };
}
