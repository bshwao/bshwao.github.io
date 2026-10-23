import * as T from './vendor/three.module.min.js';
import { floorLayout, insetFootprint } from './tower-geometry.js';
import { palette, sectionColors, roomAccents } from './color-theme.js';
import { furnishInteriorDetails } from './interior-details.js';

/** Tangible architectural furniture at the tower's real floor scale. */
export function createInterior(section, content) {
  const group = new T.Group();
  const layout = floorLayout(section.low + .02, content.rooms.length);
  const stations = layout.stations;
  const reach = Math.max(...stations.map(p => p.reach));
  const unit = reach / 18;
  const theme = sectionColors[section.id];
  const colors = { structure: palette.timber, equipment: palette.blue, ink: palette.ink, glass: palette.glass };
  const materials = Object.fromEntries(Object.entries(colors).map(([name, color]) => [name, new T.MeshLambertMaterial({ color })]));
  const lineMaterial = new T.LineBasicMaterial({ color: palette.muted, transparent: true, opacity: .8 });
  const pickables = [], anchors = [], roomModels = [];
  let activeRoom = 0, hoveredRoom = null, focusedRoom = null, focusAmount = 0;
  const unitBox = new T.BoxGeometry(1, 1, 1), unitCylinder = new T.CylinderGeometry(1, 1, 1, 20);
  const unitRing=new T.TorusGeometry(1,.09,5,16),unitSphere=new T.SphereGeometry(1,8,6),unitLeaf=new T.SphereGeometry(.42,6,5);
  const shared = new Set([unitBox, unitCylinder,unitRing,unitSphere,unitLeaf]), edgeSources = new Map();

  function object(parent, geometry, x, y, z, material = 'structure', turn = 0) {
    const mesh = new T.Mesh(geometry, materials[material]);
    mesh.position.set(x, y, z); mesh.rotation.y = turn;
    mesh.userData.surface = material;
    parent.add(mesh);
    return mesh;
  }
  const box = (p, x, y, z, w, h, d, mat = 'structure', turn = 0) => { const mesh = object(p, unitBox, x, y, z, mat, turn); mesh.scale.set(w, h, d); return mesh; };
  const cylinder = (p, x, y, z, r, h, mat = 'structure') => { const mesh = object(p, unitCylinder, x, y, z, mat); mesh.scale.set(r, h, r); return mesh; };
  const ring=(p,x,y,z,r,mat='equipment',tilt=0)=>{const mesh=object(p,unitRing,x,y,z,mat);mesh.scale.setScalar(r);mesh.rotation.x=tilt;return mesh;};
  const sphere=(p,x,y,z,r,mat='glass')=>{const mesh=object(p,unitSphere,x,y,z,mat);mesh.scale.setScalar(r);return mesh;};
  function feature(p, name, build) {
    p.userData.features ??= [];
    p.userData.features.push(name);
    build();
  }
  function wire(p, points, mat = 'ink', thickness = .025) {
    const path = new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point)));
    return object(p, new T.TubeGeometry(path, Math.max(8, points.length * 4), thickness, 4, false), 0, 0, 0, mat);
  }
  function paper(p, x, y, z, width = .72, depth = .95, turn = 0) {
    const sheet = new T.Group(); sheet.position.set(x, y, z); sheet.rotation.y = turn; p.add(sheet);
    box(sheet, 0, 0, 0, width, .025, depth);
    for (let row = 0; row < 4; row++) box(sheet, -.04, .017, -depth * .28 + row * depth * .15, width * (row ? .7 : .45), .009, .016, 'ink');
  }
  function desk(p, x = 0, z = 0, monitors = 1) {
    box(p, x, 1.55, z, 3.7, .16, 1.65);
    for (const dx of [-1.55, 1.55]) box(p, x + dx, .75, z, .13, 1.5, 1.3, 'equipment');
    for (let i = 0; i < monitors; i++) {
      const mx = x + (i - (monitors - 1) / 2) * 1.5;
      box(p, mx, 2.2, z - .3, 1.25, .8, .1, 'equipment');
      box(p, mx, 2.21, z - .235, 1.09, .64, .025, 'glass');
      box(p, mx, 1.8, z - .3, .1, .35, .1, 'ink');
      box(p, mx, 1.67, z - .3, .55, .04, .3);
      for (let row = 0; row < 3; row++) box(p, mx - .17, 2.38 - row * .16, z - .215, .55 + row % 2 * .22, .025, .012, 'ink');
    }
    box(p, x, 1.67, z + .35, 1.2, .06, .43, 'glass');
    for (let row = 0; row < 3; row++) box(p, x, 1.705, z + .23 + row * .11, 1.08, .008, .012, 'ink');
    cylinder(p, x + 1.06, 1.69, z + .36, .12, .08, 'equipment');
    chair(p, x, z + 1.7);
  }
  function chair(p, x, z) {
    box(p, x, .9, z, .95, .17, 1, 'equipment');
    box(p, x, 1.45, z + .43, .95, 1, .13, 'equipment');
    cylinder(p, x, .45, z, .09, .8, 'ink');
    box(p, x, .12, z, 1, .08, .15, 'ink'); box(p, x, .12, z, .15, .08, 1, 'ink');
  }
  function bookcase(p, x, z, width = 3.8) {
    for (const dx of [-width / 2, width / 2]) box(p, x + dx, 1.8, z, .12, 3.6, .7, 'equipment');
    box(p, x, 1.8, z - .34, width, 3.6, .08, 'glass');
    for (const y of [.12, 1.2, 2.35, 3.55]) {
      box(p, x, y, z, width, .12, .7);
      if (y > 3) continue;
      for (let i = 0; i < 8; i++) {
        const bx = x - width * .4 + i * width * .105;
        const h = .7 + i % 2 * .14;
        box(p, bx, y + .12 + h / 2, z, .16 + i % 3 * .06, h, .48, i % 3 ? 'structure' : 'equipment');
        box(p, bx, y + .22 + h / 2, z + .245, .09, .035, .01, 'ink');
      }
    }
  }
  function plant(p, x, z) {
    cylinder(p, x, .45, z, .48, .8, 'equipment');
    for (let i = 0; i < 5; i++) {
      const leaf = object(p, unitLeaf, x + Math.sin(i * 2.4) * .35, 1.1 + i * .14, z + Math.cos(i * 2.4) * .25, 'glass');
      leaf.scale.set(.55, 1.35, .65); leaf.rotation.z = Math.sin(i * 2.4) * .6;
    }
  }
  function sofa(p, x, z, turn = 0) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = turn; p.add(g);
    box(g, 0, .6, 0, 3.5, .7, 1.45, 'equipment');
    box(g, 0, 1.25, -.65, 3.5, .9, .25);
    for (const dx of [-1.6, 1.6]) box(g, dx, 1, 0, .3, .7, 1.5);
    for (const dx of [-.8, .8]) box(g, dx, 1, .04, 1.4, .12, 1.2, 'glass');
    for (const dx of [-1.3, 1.3]) for (const dz of [-.45, .45]) cylinder(g, dx, .18, dz, .06, .3, 'ink');
  }
  function lounge(p) {
    sofa(p, -2.7, 0, Math.PI / 2); sofa(p, 2.7, 0, -Math.PI / 2);
    cylinder(p, 0, .8, 0, 1.15, .13); cylinder(p, 0, .4, 0, .18, .7, 'equipment');
    paper(p, -.2, .89, -.1, .62, .8, -.2);
    cylinder(p, .55, .95, .2, .12, .15, 'equipment');
    plant(p, 3.2, -2.3);
  }
  function piano(p) {
    const bodyShape = new T.Shape();
    bodyShape.moveTo(-1.55, -1); bodyShape.lineTo(1.55, -1); bodyShape.lineTo(1.55, -.35);
    bodyShape.bezierCurveTo(1.58, .2, 1.05, .35, .95, 1);
    bodyShape.bezierCurveTo(.85, 2.05, -.1, 2.3, -1.15, 1.85);
    bodyShape.bezierCurveTo(-1.8, 1.5, -1.55, .3, -1.55, -1);
    const geometry = new T.ExtrudeGeometry(bodyShape, { depth: .32, bevelEnabled: false, curveSegments: 16 });
    geometry.rotateX(-Math.PI / 2);
    object(p, geometry, 0, 1.55, 0, 'equipment');
    // Distinct rim and pale soundboard give the curved grand body its depth.
    const soundboard = geometry.clone(); soundboard.scale(.91, .12, .91);
    object(p, soundboard, 0, 1.88, -.03, 'structure');
    for (let i = 0; i < 9; i++) wire(p, [[-.95 + i * .19, 1.94, .35], [-.9 + i * .16, 1.94, -1.05]], 'ink', .012);
    box(p, 0, 1.69, 1.2, 3.25, .22, .6, 'equipment');
    for (let i = 0; i < 21; i++) {
      const x = -1.47 + i * .147;
      box(p, x, 1.825, 1.23, .134, .035, .48);
      if (![2, 6].includes(i % 7) && i < 20) box(p, x + .07, 1.87, 1.1, .074, .07, .26, 'ink');
    }
    for (const [x, z] of [[-1.2, -.9], [1.1, -.2], [0, 1]]) box(p, x, .78, z, .14, 1.55, .14, 'ink');
    box(p, 0, 2.03, .72, 1.1, .45, .06, 'equipment');
    paper(p, 0, 2.29, .7, .85, .38);
    box(p, 0, .86, 2.5, 1.6, .19, .65, 'equipment');
    for (const x of [-.62, .62]) for (const z of [2.28, 2.72]) box(p, x, .43, z, .11, .86, .11, 'ink');
    for (const x of [-.18, 0, .18]) box(p, x, .13, 1.45, .09, .07, .3, 'ink');
  }
  function server(p, x, z) {
    box(p, x, 1.65, z, 1.5, 3.3, 1.3, 'equipment');
    box(p, x, 1.65, z + .67, 1.32, 3.07, .045, 'glass');
    for (let i = 0; i < 6; i++) {
      const y = .38 + i * .47;
      box(p, x, y, z + .72, 1.2, .31, .065);
      for (let j = 0; j < 5; j++) box(p, x - .43 + j * .13, y, z + .762, .065, .16, .014, 'ink');
      for (let j = 0; j < 2; j++) box(p, x + .35 + j * .1, y + .03, z + .764, .035, .035, .015, j ? 'equipment' : 'ink');
    }
    for (const dx of [-.64, .64]) box(p, x + dx, 1.65, z + .74, .055, 3.2, .055, 'ink');
    for (let i = 0; i < 3; i++) wire(p, [[x + .48, 2.85 - i * .45, z - .69], [x + .82, 2.6 - i * .4, z - .72], [x + .83, .22, z - .72], [x + .2, .12, z - .78]], i % 2 ? 'equipment' : 'ink');
    box(p, x, 3.34, z, 1.52, .08, 1.32);
  }
  function electronics(p) {
    box(p, 0, 1.55, 0, 3.9, .16, 1.7);
    for (const x of [-1.65, 1.65]) box(p, x, .76, 0, .14, 1.5, 1.35, 'equipment');
    // Oscilloscope bezel, inset waveform screen, and control knobs.
    box(p, -.95, 2.02, -.36, 1.28, .78, .65, 'equipment');
    box(p, -1.13, 2.04, -.018, .75, .51, .045, 'glass');
    wire(p, [[-1.46, 2.02, .015], [-1.31, 2.02, .015], [-1.23, 2.19, .015], [-1.14, 1.9, .015], [-1.04, 2.1, .015], [-.88, 2.02, .015]], 'ink', .014);
    for (const y of [1.86, 2.05, 2.24]) for (const x of [-.58, -.43]) {
      const knob = cylinder(p, x, y, -.005, .047, .055, 'ink'); knob.rotation.x = Math.PI / 2;
    }
    // PCB traces, an IC, pins, and probes are separate from the instrument.
    box(p, .72, 1.69, .32, 1.1, .08, .69, 'equipment');
    box(p, .68, 1.8, .31, .37, .15, .3, 'ink');
    for (let i = 0; i < 5; i++) {
      const x = .43 + i * .12;
      for (const z of [.08, .54]) box(p, x, 1.76, z, .04, .09, .14);
      box(p, x, 1.74, .32, .018, .014, .59, 'ink');
    }
    wire(p, [[-.48, 1.85, .04], [-.1, 1.66, .69], [.12, 1.72, .6], [.37, 1.78, .49]], 'ink');
    wire(p, [[-.6, 1.85, .04], [-.32, 1.66, .57], [.08, 1.68, .73], [.31, 1.77, .1]], 'equipment');
    box(p, 1.38, 1.79, -.37, .62, .3, .49, 'glass');
    const iron = box(p, 1.53, 1.92, -.11, .07, .07, .5, 'ink'); iron.rotation.y = .6;
    box(p, 2.85, .84, -.25, 1.05, 1.65, 1.12, 'equipment');
    for (const y of [.34, .85, 1.36]) { box(p, 2.85, y, .32, .93, .38, .045); box(p, 2.85, y, .355, .28, .045, .045, 'ink'); }
    chair(p, 0, 1.8);
  }
  function car(p) {
    box(p, 0, .11, 0, 4.6, .18, 7, 'glass');
    box(p, 0, .7, 0, 1.4, .7, 4.6, 'equipment');
    box(p, 0, 1.25, .1, 1.2, .5, 1.35);
    box(p, 0, .55, -2.6, 3.3, .12, .7, 'ink');
    box(p, 0, 1.25, 2.6, 3.5, .12, .7, 'equipment');
    for (const x of [-1.3, 1.3]) for (const z of [-1.75, 1.75]) {
      const wheel = object(p, new T.CylinderGeometry(.6, .6, .5, 18), x, .6, z, 'ink'); wheel.rotation.z = Math.PI / 2;
      box(p, x / 2, .55, z, 1.3, .09, .09);
    }
    for (const z of [-1.2, -.8, -.4]) box(p, 0, 1.08, z, .8, .04, .035, 'ink');
    wire(p, [[-.42, 1.18, .7], [-.65, 1.8, .65], [.65, 1.8, .65], [.42, 1.18, .7]], 'ink', .055);
  }
  function documentStand(p, x = 0, z = 0, withPlant = true) {
    box(p, x, .77, z, 2.65, 1.52, 1.65, 'equipment');
    for (const y of [.29, .76, 1.23]) {
      box(p, x, y, z + .84, 2.42, .37, .04);
      box(p, x, y, z + .88, .48, .055, .035, 'ink');
    }
    paper(p, x -.35, 1.57, z, 1.25, 1.35, -.12);
    paper(p, x +.4, 1.61, z + .2, .95, 1.18, .14);
    box(p, x -.85, 1.57, z -.54, .38, .06, .42, 'glass');
    for (let i = 0; i < 3; i++) box(p, x -.85, 1.612 + i * .018, z -.54, .32, .01, .36);
    if (withPlant) plant(p, x + 3, z + 1.4);
  }
  function reception(p) {
    box(p, 0, 1, -.2, 3.8, 2, 1.35, 'equipment');
    box(p, 0, 2.05, -.2, 4.06, .14, 1.55);
    box(p, -.7, 1.05, .49, .84, .74, .03, 'glass');
    box(p, -.7, 1.05, .51, .55, .035, .015, 'ink');
    paper(p, .85, 2.14, -.1, .8, .95, -.1);
    cylinder(p, -1.25, 2.24, -.35, .16, .24, 'equipment');
    chair(p, 0, -1.8); plant(p, -3, .7);
  }
  function furnish(p, index) {
    const add = (name, fn) => feature(p, name, fn);
    if (section.id === 'about') {
      if (index === 0) add('Welcome display and drawing cabinet', () => documentStand(p, 0, 0, false));
      if (index === 1) { add('Study desk and screen', () => desk(p)); add('Reference books and shelves', () => bookcase(p, 0, -2)); plant(p, 3, 1); }
      if (index === 2) { add('Grand piano, separate keys and bench', () => piano(p)); plant(p, -2.6, -2); }
      if (index === 3) add('Conversation sofas and coffee table', () => lounge(p));
    } else if (section.id === 'projects') {
      if (index === 0) { add('Dual monitor development desk', () => desk(p, 0, 0, 2)); add('Workstation tower', () => { box(p, -2.6, .8, -1, .9, 1.6, 1.1, 'equipment'); for (let y = .3; y < 1.5; y += .2) box(p, -2.6, y, -.43, .64, .035, .02, 'ink'); }); }
      if (index === 1) { add('Ventilated server racks and cable runs', () => { server(p, -2, -1); server(p, 0, -1); }); add('Systems terminal', () => desk(p, 0, 2)); }
      if (index === 2) { add('Experiment reference library', () => bookcase(p, 0, -2)); add('Driving simulation analysis desk', () => desk(p)); }
    } else if (section.id === 'experience') {
      if (index === 0) add('Electronics bench, oscilloscope, probes and PCB', () => electronics(p));
      if (index === 1) add('Infrastructure racks with vents and cable runs', () => { server(p, -1.6, 0); server(p, 1.6, 0); box(p, 0, .15, 0, 4.8, .08, 2.2, 'glass'); });
      if (index === 2) { add('Sensor workbench, oscilloscope and PCB', () => electronics(p)); add('Lab reference shelves', () => bookcase(p, 0, -2.5)); }
      if (index === 3) add('Formula chassis, wheels and roll hoop', () => car(p));
    } else if (section.id === 'resume') {
      if (index === 0) add('Résumé documents and filing cabinet', () => documentStand(p, 0, 0, false));
      if (index === 1) add('Double reference archive with book spines', () => { bookcase(p, 0, -2); bookcase(p, 0, 1); });
      if (index === 2) { add('Research reading desk', () => desk(p, 0, 1)); add('Education reference shelves', () => bookcase(p, 0, -2.2)); }
      if (index === 3) { add('Document cabinet and printed résumé', () => documentStand(p)); add('Archive shelf', () => bookcase(p, 0, -2.5)); }
    } else {
      if (index === 0) add('Reception counter and guest chair', () => reception(p));
      if (index === 1) { add('Connection desk and twin screens', () => desk(p, 0, 0, 2)); plant(p, 3, -1); }
      if (index === 2) add('Conversation lounge with coffee table', () => lounge(p));
      if (index === 3) { add('Résumé consultation counter', () => documentStand(p, -.8, -1.1, false)); add('Visitor seating', () => sofa(p, .2, 1.6)); plant(p, 3, -1.8); }
    }
  }

  function combineGeometry(parts, attributes) {
    const geometry = new T.BufferGeometry();
    for (const name of attributes) {
      const length = parts.reduce((sum, part) => sum + part.attributes[name].array.length, 0);
      const values = new Float32Array(length); let offset = 0;
      for (const part of parts) { values.set(part.attributes[name].array, offset); offset += part.attributes[name].array.length; }
      geometry.setAttribute(name, new T.BufferAttribute(values, 3));
    }
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    for (const part of parts) part.dispose();
    return geometry;
  }

  // Bake static primitives by surface. Detailed rooms cost four solid draws
  // and one outline draw, rather than a draw for every key, vent, or book.
  function batchRoom(zone, index) {
    zone.updateMatrixWorld(true);
    const inverse = zone.matrixWorld.clone().invert();
    const sources = []; zone.traverse(node => { if (node.isMesh) sources.push(node); });
    const buckets = new Map(), edgeParts = [];
    for (const mesh of sources) {
      const transform = inverse.clone().multiply(mesh.matrixWorld);
      const geometry = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()).applyMatrix4(transform);
      const surface = mesh.userData.surface;
      if (!buckets.has(surface)) buckets.set(surface, []);
      buckets.get(surface).push(geometry);
      if (!edgeSources.has(mesh.geometry)) edgeSources.set(mesh.geometry, new T.EdgesGeometry(mesh.geometry, 25));
      edgeParts.push(edgeSources.get(mesh.geometry).clone().applyMatrix4(transform));
      if (!shared.has(mesh.geometry)) mesh.geometry.dispose();
    }
    zone.clear();
    const surfaces = [];
    for (const [name, geometries] of buckets) {
      const material = materials[name].clone();
      const color = name === 'equipment' ? roomAccents[index % roomAccents.length] : colors[name];
      material.color.set(color);
      const mesh = new T.Mesh(combineGeometry(geometries, ['position', 'normal']), material);
      mesh.userData.roomIndex = index; mesh.userData.surface = name;
      zone.add(mesh); pickables.push(mesh);
      surfaces.push({ material, color: new T.Color(color) });
    }
    const roomLine = lineMaterial.clone();
    // Preserve the public hierarchy: first room mesh owns the room outline.
    const outlines = new T.LineSegments(combineGeometry(edgeParts, ['position']), roomLine);
    outlines.userData.roomIndex = index;
    zone.children[0].add(outlines);
    return { group: zone, line: roomLine, surfaces, detailCount: sources.length, features: [...(zone.userData.features || [])] };
  }
  stations.forEach((position, index) => {
    const zone = new T.Group();
    zone.userData.roomIndex = index;
    group.add(zone); furnish(zone, index);
    furnishInteriorDetails(section.id,index,zone,{box,cylinder,ring,sphere,paper,wire,feature});
    box(zone, -3.9, .6, 0, .13, 1.2, 4.6, 'glass');
    box(zone, 3.9, .6, 0, .13, 1.2, 4.6, 'glass');
    zone.updateMatrixWorld(true);
    const occupied=new T.Box3().setFromObject(zone),floorSize=occupied.getSize(new T.Vector3()),floorCenter=occupied.getCenter(new T.Vector3());
    box(zone, floorCenter.x, .025, floorCenter.z, floorSize.x+.12, .03, floorSize.z+.12, 'glass');
    for (const z of [-2.4, 2.4]) box(zone, 0, .046, z, 7.15, .009, .018, 'equipment');
    for (const x of [-3.55, 3.55]) box(zone, x, .046, 0, .018, .009, 4.8, 'equipment');
    const room = batchRoom(zone, index);
    // Fit the complete room after batching: piano benches, cable runs, plants,
    // low dividers and floor inlays all contribute to its real occupied bounds.
    // A single scale keeps every piece of furniture in proportion.
    const bounds = new T.Box3().setFromObject(zone);
    const size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
    const region = position.region;
    const margin = Math.min(region.width, region.depth) * .035;
    const scale = Math.min(position.scale, (region.width - margin * 2) / size.x, (region.depth - margin * 2) / size.z);
    zone.scale.setScalar(scale);
    zone.position.set(region.x - center.x * scale, .18 * unit - bounds.min.y * scale, region.z - center.z * scale);
    room.region = { ...region };
    room.scale = scale;
    roomModels.push(room);
    anchors.push(new T.Vector3(position.x, unit * 4.7, position.z));
  });
  // The rail, elevator and stair use the same stepped floor plan as the shell.
  const outline = insetFootprint(layout.outline, .16), vertices = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    vertices.push(a[0], unit * .6, a[1], b[0], unit * .6, b[1]);
    if (i % 3 === 0) vertices.push(a[0], .1, a[1], a[0], unit * .6, a[1]);
  }
  const outlineGeometry = new T.BufferGeometry(); outlineGeometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  const perimeter = new T.LineSegments(outlineGeometry, lineMaterial); perimeter.name = 'interior-perimeter-rail'; group.add(perimeter);
  const contextSurfaces = [];
  const core = layout.core;
  const elevator = box(group, core.x - core.width * .2, unit * .65, core.z, core.width * .48, unit * 1.3, core.depth * .84, 'glass');
  elevator.name = 'service-core-elevator';
  elevator.add(new T.LineSegments(new T.EdgesGeometry(elevator.geometry), lineMaterial));
  const treads = Array.from({ length: 8 }, (_, i) => unitBox.toNonIndexed()
    .scale(core.width * .3, unit * .1, core.depth * .095)
    .translate(core.x + core.width * .28, (i + .5) * unit * .12, core.z + (i - 3.5) * core.depth * .1));
  const stair = new T.Mesh(combineGeometry(treads, ['position', 'normal']), materials.structure);
  stair.name = 'service-core-stair'; group.add(stair);
  // Core and stair share these source materials; room surfaces are clones.
  for (const material of [materials.glass, materials.structure]) contextSurfaces.push({ material, color: material.color.clone() });
  group.visible = false; group.updateMatrixWorld(true);
  roomModels.forEach((room, index) => {
    room.bounds = new T.Box3().setFromObject(room.group);
    room.center = room.bounds.getCenter(new T.Vector3());
    room.radius = room.bounds.getBoundingSphere(new T.Sphere()).radius;
    anchors[index].set(room.center.x, room.bounds.max.y + unit * .65, room.center.z);
  });
  const white = new T.Color(palette.paper);
  for (const edges of edgeSources.values()) edges.dispose();
  for (const geometry of shared) {
    let retained = false; group.traverse(node => { if (node.geometry === geometry) retained = true; });
    if (!retained) geometry.dispose();
  }
  const retainedMaterials = new Set();
  group.traverse(node => { if (node.material) retainedMaterials.add(node.material); });
  for (const material of Object.values(materials)) if (!retainedMaterials.has(material)) material.dispose();
  function paintRooms() {
    const contextFade = focusedRoom === null ? 0 : focusAmount;
    lineMaterial.color.set(palette.muted).lerp(white, contextFade * .65);
    lineMaterial.opacity = T.MathUtils.lerp(.8, .1, contextFade);
    for (const surface of contextSurfaces) surface.material.color.copy(surface.color).lerp(white, contextFade * .94);
    roomModels.forEach((room, index) => {
      const fade = focusedRoom !== null && index !== focusedRoom && index !== hoveredRoom ? focusAmount : 0;
      room.line.color.set(index === activeRoom ? theme.ink : index === hoveredRoom ? palette.ink : palette.muted).lerp(white, fade * .65);
      const opacity = index === activeRoom ? 1 : index === hoveredRoom ? .95 : .58;
      room.line.opacity = T.MathUtils.lerp(opacity, .14, fade);
      // Opaque pale surfaces retain correct depth without transparent-wall sorting.
      for (const surface of room.surfaces) surface.material.color.copy(surface.color).lerp(white, fade * .9);
    });
  }
  paintRooms();
  return { group, pickables, anchors, reach, unit, rooms: roomModels,
    setActiveRoom(index) { if (activeRoom === index) return; activeRoom = index; paintRooms(); },
    setHoveredRoom(index) { if (hoveredRoom === index) return; hoveredRoom = index; paintRooms(); },
    setFocus(index, amount = 1) {
      const next = Number.isInteger(index) && roomModels[index] ? index : null, fade = next === null ? 0 : T.MathUtils.clamp(amount, 0, 1);
      if (focusedRoom === next && focusAmount === fade) return;
      focusedRoom = next; focusAmount = fade; paintRooms();
    },
  };
}
