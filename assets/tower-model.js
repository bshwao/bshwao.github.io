import * as T from './vendor/three.module.min.js';
import { sections, setbacks, footprint, radius } from './tower-geometry.js';
import { createInterior } from './interiors.js';
import { floorContent } from './floor-content.js';

function capGeometry(height) {
  const points = footprint(height).map(([x, z]) => new T.Vector2(x, z));
  const geometry = new T.ShapeGeometry(new T.Shape(points));
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

export function createTowerModel() {
  const root = new T.Group();
  const modules = sections.map((section, index) => {
    const group = new T.Group(); root.add(group);
    const shell = new T.Group(); group.add(shell);
    const clip = new T.Plane(new T.Vector3(0, -1, 0), 200);
    const surface = new T.MeshLambertMaterial({ color: '#f5f9fe', side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, clippingPlanes: [clip] });
    const line = new T.LineBasicMaterial({ color: '#426eaa', transparent: true, opacity: .7, clippingPlanes: [clip] });
    const slabMaterial = new T.MeshLambertMaterial({ color: '#e4eef9', side: T.DoubleSide, clippingPlanes: [clip] });
    let levels = [section.low, section.high];
    for (const y of setbacks) if (y > section.low && y < section.high) levels.push(y - .002, y);
    for (let y = Math.ceil(section.low / 3.4) * 3.4; y < section.high; y += 3.4) if (y > section.low) levels.push(y);
    if (section.high > 99.5) levels.push(99.498, 99.5);
    // A storey can coincide with a setback; merge it to avoid zero-area faces.
    levels = [...new Set(levels.map(y => Math.round(y * 1e4) / 1e4))].sort((a, b) => a - b);
    const positions = [], indices = [], lines = [];
    const count = 96;
    for (const y of levels) for (const [x, z] of footprint(y, count)) positions.push(x, y - section.low, z);
    for (let level = 0; level < levels.length - 1; level++) for (let i = 0; i < count; i++) {
      const a = level * count + i, b = level * count + (i + 1) % count;
      indices.push(a, a + count, b, b, a + count, b + count);
      lines.push(...positions.slice(a * 3, a * 3 + 3), ...positions.slice((a + count) * 3, (a + count) * 3 + 3));
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const mesh = new T.Mesh(geometry, surface);
    mesh.userData.sectionId = section.id;
    shell.add(mesh);
    const ring = y => {
      const points = footprint(y, count);
      for (let i = 0; i < count; i++) {
        const a = points[i], b = points[(i + 1) % count];
        lines.push(a[0], y - section.low, a[1], b[0], y - section.low, b[1]);
      }
    };
    for (let y = Math.ceil(section.low / .57) * .57; y < Math.min(section.high, 99.5); y += .57) {
      ring(y); if (y + .075 < section.high) ring(y + .075);
    }
    for (const y of levels) if (setbacks.includes(y)) ring(y);
    ring(section.low); ring(section.high);
    const lineGeometry = new T.BufferGeometry();
    lineGeometry.setAttribute('position', new T.Float32BufferAttribute(lines, 3));
    shell.add(new T.LineSegments(lineGeometry, line));
    for (const y of [section.low, section.high]) {
      const cap = new T.Mesh(capGeometry(y), slabMaterial);
      cap.position.y = y - section.low;
      cap.userData.sectionId = section.id;
      shell.add(cap);
    }
    // Structural plates occupy the full volume, including every exposed cut.
    for (let y = section.low + 3.4; y < Math.min(section.high, 99.5); y += 3.4) {
      const plate = new T.Mesh(capGeometry(y), slabMaterial);
      plate.position.y = y - section.low; shell.add(plate);
    }
    const baseMaterial = new T.MeshLambertMaterial({ color: '#edf4fc', side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1 });
    const floorShape = new T.Shape(footprint(section.low + .005).map(([x, z]) => new T.Vector2(x, z)));
    const floorGeometry = new T.ExtrudeGeometry(floorShape, { depth: radius(0, section.low) * .065, bevelEnabled: false });
    floorGeometry.rotateX(Math.PI / 2);
    const base = new T.Mesh(floorGeometry, baseMaterial);
    base.position.y = .035;
    base.add(new T.LineSegments(new T.EdgesGeometry(floorGeometry, 30), new T.LineBasicMaterial({ color: '#779bc4', transparent: true, opacity: .8 })));
    group.add(base);
    const interior = createInterior(section, floorContent[section.id]);
    group.add(interior.group);
    const maxRadius = Math.max(...footprint(section.low).map(p => Math.hypot(...p)));
    group.position.y = section.low;
    return { ...section, index, group, shell, clip, surface, line, slabMaterial, interior, maxRadius, base, mesh };
  });
  const ground = new T.Group(); root.add(ground);
  const groundLine = new T.LineBasicMaterial({ color: '#9fb9d6', transparent: true, opacity: .45 });
  for (const r of [27, 29]) {
    const points = Array.from({ length: 121 }, (_, i) => new T.Vector3(Math.cos(i / 120 * Math.PI * 2) * r, -.12, Math.sin(i / 120 * Math.PI * 2) * r));
    ground.add(new T.Line(new T.BufferGeometry().setFromPoints(points), groundLine));
  }
  const marks = [];
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2;
    marks.push(Math.cos(a) * 28.5, -.1, Math.sin(a) * 28.5, Math.cos(a) * (i % 4 ? 29.3 : 30), -.1, Math.sin(a) * (i % 4 ? 29.3 : 30));
  }
  const markGeometry = new T.BufferGeometry(); markGeometry.setAttribute('position', new T.Float32BufferAttribute(marks, 3));
  ground.add(new T.LineSegments(markGeometry, groundLine));
  return { root, modules, ground, groundLine };
}
