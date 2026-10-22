import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/vendor/three.module.min.js';
import { floorProfiles, footprint, floorLayout, sections, setbacks } from '../assets/tower-geometry.js';
import { createTowerModel } from '../assets/tower-model.js';
import { floorContent } from '../assets/floor-content.js';
import { outdoorCameraPose } from '../assets/camera-framing.js';

const epsilon = 1e-5;
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const area = polygon => polygon.reduce((sum, a, i) => {
  const b = polygon[(i + 1) % polygon.length];
  return sum + a[0] * b[1] - b[0] * a[1];
}, 0) / 2;
const onSegment = (point, a, b) => Math.abs(cross(a, b, point)) < epsilon &&
  point[0] >= Math.min(a[0], b[0]) - epsilon && point[0] <= Math.max(a[0], b[0]) + epsilon &&
  point[1] >= Math.min(a[1], b[1]) - epsilon && point[1] <= Math.max(a[1], b[1]) + epsilon;
function inside(point, polygon) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if (onSegment(point, a, b)) return true;
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
function edgeSamples(a, b) {
  return Array.from({ length: 9 }, (_, i) => [a[0] + (b[0] - a[0]) * i / 8, a[1] + (b[1] - a[1]) * i / 8]);
}
function rectangle(region) {
  return [[region.x - region.width / 2, region.z - region.depth / 2], [region.x + region.width / 2, region.z - region.depth / 2],
    [region.x + region.width / 2, region.z + region.depth / 2], [region.x - region.width / 2, region.z + region.depth / 2]];
}
const rectanglesOverlap = (a, b) => Math.min(a.x + a.width / 2, b.x + b.width / 2) - Math.max(a.x - a.width / 2, b.x - b.width / 2) > epsilon &&
  Math.min(a.z + a.depth / 2, b.z + b.depth / 2) - Math.max(a.z - a.depth / 2, b.z - b.depth / 2) > epsilon;

test('deliberate nested floor plates have a consistent winding and no crossing perimeter edges', () => {
  assert.ok(floorProfiles.length >= 5, 'Base, intermediate volumes, and crown have deliberate profiles');
  const winding = Math.sign(area(floorProfiles[0].polygon));
  for (const [index, profile] of floorProfiles.entries()) {
    const { polygon } = profile;
    assert.ok(polygon.length >= 6 && Math.abs(area(polygon)) > .1);
    assert.equal(Math.sign(area(polygon)), winding, `Profile ${profile.height}: perimeter winding`);
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) > epsilon, 'No duplicate neighboring corners');
      for (let j = i + 2; j < polygon.length; j++) {
        if (i === 0 && j === polygon.length - 1) continue;
        const c = polygon[j], d = polygon[(j + 1) % polygon.length];
        const crossing = cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
        assert.ok(!crossing && !onSegment(a, c, d) && !onSegment(b, c, d), `Profile ${profile.height}: non-adjacent edges ${i}/${j}`);
      }
    }
    if (index) {
      const previous = floorProfiles[index - 1];
      assert.ok(profile.height > previous.height && Math.abs(area(polygon)) < Math.abs(area(previous.polygon)));
      for (let i = 0; i < polygon.length; i++) for (const point of edgeSamples(polygon[i], polygon[(i + 1) % polygon.length])) {
        assert.ok(inside(point, previous.polygon), `${profile.height}: terrace cannot float outside the supporting volume`);
      }
    }
    for (const count of [12, 24, 48, 96]) {
      const points = footprint(profile.height, count);
      assert.equal(points.length, count);
      for (const corner of polygon) assert.ok(points.some(point => Math.hypot(point[0] - corner[0], point[1] - corner[1]) < epsilon), 'All quality levels preserve actual corners');
    }
  }
});

test('the silhouette is elongated and asymmetric, with a concave attached wing and an offset crown', () => {
  const base = floorProfiles[0].polygon;
  const width = Math.max(...base.map(p => p[0])) - Math.min(...base.map(p => p[0]));
  const depth = Math.max(...base.map(p => p[1])) - Math.min(...base.map(p => p[1]));
  assert.ok(width / depth > 1.25, 'Main volume has a clearly longer axis');
  const winding = Math.sign(area(base));
  assert.ok(base.some((point, i) => Math.sign(cross(base[(i + base.length - 1) % base.length], point, base[(i + 1) % base.length])) !== winding), 'Attached wing creates an intentional reentrant corner');
  const rotated = base.map(([x, z]) => [x * Math.cos(Math.PI * 2 / 3) - z * Math.sin(Math.PI * 2 / 3), x * Math.sin(Math.PI * 2 / 3) + z * Math.cos(Math.PI * 2 / 3)]);
  const difference = rotated.reduce((sum, p) => sum + Math.min(...base.map(q => Math.hypot(p[0] - q[0], p[1] - q[1]))), 0) / base.length;
  assert.ok(difference > width * .12, 'Top silhouette does not repeat every 120 degrees');
  const crown = footprint(109, 12);
  const center = crown.reduce((sum, p) => [sum[0] + p[0] / crown.length, sum[1] + p[1] / crown.length], [0, 0]);
  assert.ok(Math.hypot(...center) > 2, 'Crown remains visibly away from the original tower axis');
});

test('shared occupied regions, service core, and room anchors fit the entire floor boundary', () => {
  let alignedCore;
  for (const section of sections) {
    const count = floorContent[section.id].rooms.length;
    const layout = floorLayout(section.low + .02, count);
    alignedCore ??= layout.core;
    assert.deepEqual(layout.core, alignedCore, `${section.id}: occupied floors share a continuous vertical service core`);
    if (section.high < 99.5) assert.deepEqual(floorLayout(section.high - .002, count).core, alignedCore, `${section.id}: upper cut retains the same service shaft`);
    assert.equal(layout.regions.length, count);
    assert.equal(layout.stations.length, count);
    for (const region of [...layout.regions, layout.core]) {
      assert.ok(region.width > .5 && region.depth > .5, `${section.id}: usable occupied area`);
      const corners = rectangle(region);
      for (let i = 0; i < corners.length; i++) for (const point of edgeSamples(corners[i], corners[(i + 1) % corners.length])) {
        assert.ok(inside(point, layout.outline), `${section.id}: full rectangle and edges remain inside the floor`);
      }
    }
    for (const [i, region] of layout.regions.entries()) {
      assert.ok(!rectanglesOverlap(region, layout.core), `${section.id}: service core leaves room ${i} clear`);
      for (const other of layout.regions.slice(i + 1)) assert.ok(!rectanglesOverlap(region, other), `${section.id}: rooms have separate usable areas`);
      assert.ok(inside([layout.stations[i].x, layout.stations[i].z], rectangle(region)), `${section.id}: room anchor belongs to its occupied region`);
    }
  }
});

const model = createTowerModel();
model.root.updateMatrixWorld(true);

test('actual furnished room bounds fit their regions and do not collide with neighboring rooms or service core', () => {
  for (const module of model.modules) {
    const { regions, core } = floorLayout(module.low + .02, module.interior.rooms.length);
    const bounds = module.interior.rooms.map(room => new T.Box3().setFromObject(room.group));
    for (const [index, box] of bounds.entries()) {
      const room = { x: (box.min.x + box.max.x) / 2, z: (box.min.z + box.max.z) / 2, width: box.max.x - box.min.x, depth: box.max.z - box.min.z };
      const region = regions[index];
      assert.ok(room.width > .2 && room.depth > .2, `${module.id}/${index}: tangible furnished bounds`);
      for (const point of rectangle(room)) assert.ok(inside(point, rectangle(region)), `${module.id}/${index}: every furniture bound fits its occupied rectangle`);
      assert.ok(!rectanglesOverlap(room, core), `${module.id}/${index}: furniture leaves the service core clear`);
      for (const other of bounds.slice(index + 1)) {
        assert.ok(Math.min(box.max.x, other.max.x) - Math.max(box.min.x, other.min.x) <= epsilon ||
          Math.min(box.max.z, other.max.z) - Math.max(box.min.z, other.min.z) <= epsilon, `${module.id}: neighboring furniture bounds are disjoint`);
      }
    }
  }
});

test('real shell faces have area and setbacks remain horizontal rather than sloping connecting bands', () => {
  let terraceTriangles = 0;
  const terraceAreas = new Map();
  for (const module of model.modules) {
    const geometry = module.mesh.geometry, positions = geometry.attributes.position;
    const indices = geometry.index?.array || Array.from({ length: positions.count }, (_, i) => i);
    for (let i = 0; i < indices.length; i += 3) {
      const points = [0, 1, 2].map(offset => new T.Vector3().fromBufferAttribute(positions, indices[i + offset]));
      const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
      assert.ok(normal.lengthSq() > 1e-12, `${module.id}: no degenerate shell triangle`);
      const worldY = points.map(p => p.y + module.low);
      if (Math.min(...worldY) >= 99.5 - epsilon && Math.max(...worldY) - Math.min(...worldY) > epsilon) continue; // The final lantern intentionally tapers.
      const vertical = Math.abs(normal.normalize().y);
      assert.ok(vertical < 1e-4 || vertical > .9999, `${module.id}: a wall is vertical or a terrace is horizontal`);
      if (vertical > .9999) {
        terraceTriangles++;
        const height = setbacks.find(height => worldY.every(y => Math.abs(y - height) < epsilon));
        assert.ok(height, 'Terraces occupy an explicit setback height');
        assert.ok(normal.y > 0, 'Exposed terrace normals face the sky');
        const outer = footprint(height - .002, 12), inner = footprint(height, 12);
        const center = points.reduce((sum, point) => sum.add(point), new T.Vector3()).multiplyScalar(1 / 3);
        assert.ok(inside([center.x, center.z], outer) && !inside([center.x, center.z], inner), `${height}: terrace triangle at ${center.x.toFixed(4)}, ${center.z.toFixed(4)} fills the exposed ledge rather than the upper volume`);
        const triangleArea = new T.Triangle(...points).getArea();
        terraceAreas.set(height, (terraceAreas.get(height) || 0) + triangleArea);
      }
    }
  }
  assert.ok(terraceTriangles >= 12, 'Setbacks have tangible horizontal surfaces');
  for (const height of setbacks) {
    const exposedArea = Math.abs(area(footprint(height - .002, 12))) - Math.abs(area(footprint(height, 12)));
    assert.ok(Math.abs(terraceAreas.get(height) - exposedArea) < .002, `${height}: terrace triangles cover the ledge once, without overlapping cut surfaces`);
  }
});

test('outdoor cameras contain every actual shell corner through orbit on desktop and both phone orientations', () => {
  for (const [width, height] of [[1440, 900], [844, 390], [390, 844], [320, 568]]) {
    for (const mode of ['tower', 'explore']) for (let orbit = 0; orbit < 8; orbit++) {
      const direction = new T.Vector3(Math.sin(orbit * Math.PI / 4), .65, Math.cos(orbit * Math.PI / 4));
      const { position, target, layout } = outdoorCameraPose(mode, width, height, direction);
      const camera = new T.PerspectiveCamera(34, width / height, .1, 2000);
      camera.position.copy(position); camera.lookAt(target);
      camera.setViewOffset(width, height, width / 2 - layout.centerX, height / 2 - layout.centerY, width, height);
      camera.updateMatrixWorld();
      for (const [index, module] of model.modules.entries()) {
        const points = module.mesh.geometry.attributes.position;
        const offset = mode === 'explore' ? new T.Vector3((index % 2 ? 1 : -1) * (index === 4 ? 10 : 8), (4 - index) * 10, 0) : new T.Vector3();
        for (let i = 0; i < points.count; i++) {
          const point = new T.Vector3().fromBufferAttribute(points, i).applyMatrix4(module.mesh.matrixWorld).add(offset).project(camera);
          const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2;
          assert.ok(point.z > -1 && point.z < 1 && x >= layout.rect.left - 1 && x <= layout.rect.right + 1 && y >= layout.rect.top - 1 && y <= layout.rect.bottom + 1,
            `${mode}/${module.id}, ${width}x${height}, orbit ${orbit}: actual shell corner (${x.toFixed(1)}, ${y.toFixed(1)}) fits reserved viewport`);
        }
      }
    }
  }
});
