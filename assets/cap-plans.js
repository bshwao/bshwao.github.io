import * as T from './vendor/three.module.min.js';
import { palette, sectionColors } from './color-theme.js';
import { footprint, radius, wings } from './tower-geometry.js';

// Small architectural sketches for the closed tower's exposed cut faces.
// These are independent of the detailed, selectable interiors below the caps.
export function createCapPlans(section, undersideY) {
  const group = new T.Group(); group.name = `cap-plans-${section.id}`;
  const walls = [], furniture = [];
  const faces = [], features = new Set(['perimeter-walls', 'elevator', 'stairs', 'wing-partitions']);

  const inside = (point, polygon) => {
    let result = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
    }
    return result;
  };

  function face(height, y, side) {
    const outline = footprint(height);
    const extent = Math.max(...outline.map(([x, z]) => Math.hypot(x, z)));
    // The spire tip has no occupiable floor. Its broad lower cut is drawn below.
    if (extent < .2) return;
    const boundary = outline.map(([x, z]) => [x * .91, z * .91]);
    const unit = extent / 18;
    const core = Math.min(...outline.map(([x, z]) => Math.hypot(x, z))) * .54;
    faces.push({ height, y, side, boundary });

    // Clip every stroke to the inset wall polygon, including concave wing necks.
    function line(target, a, b) {
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const stops = [0, 1];
      for (let i = 0; i < boundary.length; i++) {
        const p = boundary[i], q = boundary[(i + 1) % boundary.length];
        const ex = q[0] - p[0], ez = q[1] - p[1];
        const cross = dx * ez - dz * ex;
        if (Math.abs(cross) < 1e-10) continue;
        const px = p[0] - a[0], pz = p[1] - a[1];
        const t = (px * ez - pz * ex) / cross, u = (px * dz - pz * dx) / cross;
        if (t > 0 && t < 1 && u >= 0 && u <= 1) stops.push(t);
      }
      stops.sort((a, b) => a - b);
      for (let i = 1; i < stops.length; i++) {
        const start = stops[i - 1], end = stops[i], middle = (start + end) / 2;
        if (end - start < 1e-8 || !inside([a[0] + dx * middle, a[1] + dz * middle], boundary)) continue;
        target.push(a[0] + dx * start, y, a[1] + dz * start, a[0] + dx * end, y, a[1] + dz * end);
      }
    }
    const path = (target, points, transform = p => p) => {
      for (let i = 1; i < points.length; i++) line(target, transform(points[i - 1]), transform(points[i]));
    };
    function box(target, x, z, width, depth, transform) {
      path(target, [[x - width / 2, z - depth / 2], [x + width / 2, z - depth / 2],
        [x + width / 2, z + depth / 2], [x - width / 2, z + depth / 2], [x - width / 2, z - depth / 2]], transform);
    }
    function arc(target, x, z, r, start = 0, end = Math.PI * 2, transform) {
      path(target, Array.from({ length: 17 }, (_, i) => {
        const angle = start + (end - start) * i / 16;
        return [x + Math.cos(angle) * r, z + Math.sin(angle) * r];
      }), transform);
    }

    // Two fine perimeter strokes read as wall thickness rather than a roof rim.
    for (const scale of [.96, .99]) {
      const contour = boundary.map(([x, z]) => [x * scale, z * scale]);
      path(walls, [...contour, contour[0]]);
    }
    box(walls, 0, 0, core * 1.65, core * 1.55);
    box(walls, -core * .4, 0, core * .62, core * 1.25);
    // Lift diagonals and a short doorway; the other half contains stair treads.
    path(walls, [[-core * .71, -core * .62], [-core * .09, core * .62]]);
    path(walls, [[-core * .71, core * .62], [-core * .09, -core * .62]]);
    box(walls, core * .4, 0, core * .56, core * 1.25);
    for (let i = 1; i < 7; i++) path(walls, [[core * .12, -core * .62 + i * core * .18], [core * .68, -core * .62 + i * core * .18]]);
    path(walls, [[core * .4, core * .45], [core * .4, -core * .4], [core * .27, -core * .2]]);

    for (const [index, wing] of wings.entries()) {
      const reach = radius(wing.angle, height);
      const cos = Math.cos(wing.angle), sin = Math.sin(wing.angle);
      // Furniture coordinates are in local room units: X across, Z along a wing.
      const room = ([x, z]) => {
        const along = reach * .59 + z * unit;
        return [cos * along - sin * x * unit, sin * along + cos * x * unit];
      };
      const partition = ([x, z]) => {
        const along = reach * .34 + z * unit;
        return [cos * along - sin * x * unit, sin * along + cos * x * unit];
      };
      path(walls, [[-5, 0], [-.7, 0]], partition);
      path(walls, [[.7, 0], [5, 0]], partition);
      path(walls, [[-.7, 0], [-.7, 1.4]], partition);
      arc(walls, -.7, 0, 1.4, 0, Math.PI / 2, partition);

      const rect = (x, z, w, d) => box(furniture, x, z, w, d, room);
      const stroke = points => path(furniture, points, room);
      const circle = (x, z, r) => arc(furniture, x, z, r, 0, Math.PI * 2, room);
      function chair(x, z) {
        rect(x, z, .8, .8); stroke([[x - .5, z + .5], [x + .5, z + .5]]);
      }
      function desk(x = 0, z = 0, count = 1) {
        rect(x, z, 3.8, 1.7);
        for (let i = 0; i < count; i++) {
          const mx = x + (i - (count - 1) / 2) * 1.5;
          rect(mx, z + .25, 1.15, .22); stroke([[mx, z + .15], [mx, z - .08]]);
        }
        rect(x, z - .4, 1.15, .35); chair(x, z - 1.65);
      }
      function sofa(x, z, facing) {
        rect(x, z, 1.15, 3.4);
        stroke([[x + facing * .35, z - 1.55], [x + facing * .35, z + 1.55]]);
        for (const dz of [-.55, .55]) stroke([[x - .5, z + dz], [x + .5, z + dz]]);
      }

      if (section.id === 'about') {
        if (index === 0) { desk(); rect(2.9, .3, .8, 3.2); features.add('study-desk'); }
        if (index === 1) {
          stroke([[-1.5, -1], [1.5, -1], [1.5, -.4], [1.2, .5], [.7, 1.4], [-.3, 1.9], [-1.2, 1.4], [-1.5, .5], [-1.5, -1]]);
          rect(0, -1.2, 3, .4); rect(0, -2.4, 1.6, .65);
          for (let i = 0; i < 9; i++) stroke([[-1.2 + i * .3, -1.4], [-1.2 + i * .3, -1]]);
          features.add('piano');
        }
        if (index === 2) { sofa(-2.1, 0, 1); sofa(2.1, 0, -1); circle(0, 0, .8); features.add('study-lounge'); }
      } else if (section.id === 'projects') {
        if (index === 0) { desk(0, 0, 2); features.add('development-workstation'); }
        if (index === 1) {
          for (const x of [-1.6, 0, 1.6]) {
            rect(x, .2, 1.25, 2.6);
            for (const z of [-.5, .2, .9]) stroke([[x - .5, z], [x + .5, z]]);
          }
          features.add('server-racks');
        }
        if (index === 2) { desk(); rect(2.8, .5, .7, 3.6); features.add('simulation-desk'); }
      } else if (section.id === 'experience') {
        if (index < 2) {
          rect(0, 0, 4.8, 2); rect(-1.25, .2, 1.4, .8); rect(1, -.15, 1.1, .85); chair(0, -1.8);
          stroke([[-1.8, .2], [-1.55, .2], [-1.4, .45], [-1.2, -.05], [-1, .3], [-.8, .2]]);
          for (const x of [.7, 1, 1.3]) stroke([[x, -.7], [x, -.3]]);
          features.add('electronics-benches');
        } else {
          stroke([[0, -2.4], [-.5, -1.6], [-.7, .2], [-1.2, 1.5], [1.2, 1.5], [.7, .2], [.5, -1.6], [0, -2.4]]);
          for (const x of [-1.2, 1.2]) for (const z of [-1.3, .9]) rect(x, z, .55, .85);
          rect(0, 1.9, 3, .35); circle(0, 0, .38); features.add('formula-car');
        }
      } else if (section.id === 'resume') {
        if (index === 0) { desk(); features.add('reference-desk'); }
        else {
          for (const x of [-1.7, 1.7]) {
            rect(x, 0, .95, 4.5);
            for (let z = -1.8; z <= 1.8; z += .6) stroke([[x - .4, z], [x + .4, z]]);
          }
          features.add('archive-shelving');
        }
      } else if (section.id === 'contact') {
        if (index === 0) {
          stroke([[-2.5, 1], [2.5, 1], [2.5, -.2], [.5, -.2], [.5, -1.4], [-2.5, -1.4], [-2.5, 1]]);
          rect(-1, .2, 1.1, .25); chair(-1, -2.2); features.add('reception-counter');
        }
        if (index === 1) { sofa(-2.1, 0, 1); sofa(2.1, 0, -1); circle(0, 0, .8); features.add('lounge-seating'); }
        if (index === 2) {
          circle(0, 0, 1.45);
          for (const x of [-2.1, 2.1]) chair(x, 0);
          chair(0, -2.1); chair(0, 2.1); features.add('meeting-table');
        }
      }
    }
  }

  face(section.high - .002, section.high - section.low + .12, 'top');
  face(section.low + .005, undersideY - .12, 'underside');
  const materials = [
    new T.LineBasicMaterial({ color: palette.muted, transparent: true, opacity: .75, depthWrite: false }),
    new T.LineBasicMaterial({ color: '#ffffff', vertexColors: true, transparent: true, opacity: .8, depthWrite: false }),
  ];
  for (const [index, positions] of [walls, furniture].entries()) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    if (index === 1) {
      const colors = [], swatches = [sectionColors[section.id].ink, palette.warmInk, palette.tealInk];
      const color = new T.Color();
      for (let vertex = 0; vertex < positions.length / 3; vertex++) {
        color.set(swatches[Math.floor(vertex / 12) % swatches.length]); colors.push(...color.toArray());
      }
      geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    }
    const lines = new T.LineSegments(geometry, materials[index]);
    lines.name = index === 0 ? 'plan-walls-and-core' : 'plan-furniture'; group.add(lines);
  }
  group.visible = false;
  return {
    group, faces, features: [...features],
    setPresentation(expansion, cut, context) {
      const amount = T.MathUtils.smoothstep(expansion, .15, .85) * (1 - T.MathUtils.smoothstep(cut, 0, .12)) * context;
      group.visible = amount > .001;
      materials[0].opacity = .75 * amount; materials[1].opacity = .8 * amount;
    },
  };
}
