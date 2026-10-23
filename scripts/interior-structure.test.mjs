import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/vendor/three.module.min.js';
import { JSDOM } from 'jsdom';
import { sections, floorLayout } from '../assets/tower-geometry.js';
import { floorContent } from '../assets/floor-content.js';
import { createInterior } from '../assets/interiors.js';
import { createInteriorStructure } from '../assets/interior-structure.js';
import { createFloorPlan, planLayouts } from '../assets/floor-plans.js';

const inside = (x, z, polygon) => {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    const dx = b[0] - a[0], dz = b[1] - a[1], lengthSquared = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lengthSquared));
    if (Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz) <= 1e-5) return true;
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
};
const fixtures = sections.map(section => {
  const content = floorContent[section.id], layout = floorLayout(section.low + .02, content.rooms.length);
  const unit = Math.max(...layout.stations.map(station => station.scale));
  const structure = createInteriorStructure(section, content, layout, unit);
  structure.group.updateMatrixWorld(true);
  const meshes = [];
  structure.group.traverse(node => { if (node.isMesh) meshes.push(node); });
  return { section, content, layout, unit, structure, meshes };
});

test('all five architectural floors remain on the occupied L-shaped slab in four static batches', () => {
  for (const { section, content, layout, structure } of fixtures) {
    assert.equal(structure.rooms.length, content.rooms.length, `${section.id}: every content room receives architecture`);
    let calls = 0;
    structure.group.traverse(node => {
      if (!node.geometry) return;
      calls++;
      assert.equal(node.userData.roomIndex, undefined, 'Shared architecture does not intercept room selection');
      const positions = node.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const point = new T.Vector3().fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld);
        assert.ok(point.toArray().every(Number.isFinite), `${section.id}: finite architectural geometry`);
        assert.ok(inside(point.x, point.z, layout.outline), `${section.id}: architecture cannot bridge the L-shaped recess`);
      }
    });
    assert.ok(calls > 0 && calls <= 4, `${section.id}: ${calls} shared architectural draws`);
  }
});

test('floor finishes fill every room bay and doorways provide real openings through its partitions', () => {
  for (const { section, layout, unit, structure, meshes } of fixtures) {
    for (const [index, room] of structure.rooms.entries()) {
      const region = layout.regions[index], label = `${section.id}/${index}`;
      for (const fx of [.1, .3, .5, .7, .9]) for (const fz of [.1, .3, .5, .7, .9]) {
        const x = region.x + (fx - .5) * region.width, z = region.z + (fz - .5) * region.depth;
        const hits = new T.Raycaster(new T.Vector3(x, unit * 10, z), new T.Vector3(0, -1, 0)).intersectObjects(meshes);
        assert.ok(hits.some(hit => hit.point.y >= 0 && hit.point.y < unit * .3), `${label}: a tangible floor finish covers the complete usable room`);
      }
      const opening = room.opening;
      assert.ok(opening.width >= unit && opening.height >= unit * 2, `${label}: a person-sized doorway`);
      const towardCorridor = opening.side === 'north' ? 1 : -1;
      for (const fraction of [-.3, 0, .3]) {
        const origin = new T.Vector3(opening.x + opening.width * fraction, unit * .7, opening.z - towardCorridor * unit * .55);
        const ray = new T.Raycaster(origin, new T.Vector3(0, 0, towardCorridor), 0, unit * 1.1);
        assert.equal(ray.intersectObjects(meshes).length, 0, `${label}: doorway has an actual walk-through gap`);
      }
    }
  }
});

test('architectural partitions are solid and every room connects to the shared circulation', () => {
  for (const { section, layout, unit, structure, meshes } of fixtures) {
    for (const [index, room] of structure.rooms.entries()) {
      const walls = room.walls.filter(wall => wall.kind === 'partition');
      assert.ok(walls.length >= 2, `${section.id}/${index}: actual enclosing partitions`);
      for (const wall of walls) {
        const alongZ = wall.width >= wall.depth;
        const direction = alongZ ? new T.Vector3(0, 0, 1) : new T.Vector3(1, 0, 0);
        const center = new T.Vector3(wall.x, wall.y, wall.z);
        const reach = (alongZ ? wall.depth : wall.width) / 2 + unit * .05;
        const ray = new T.Raycaster(center.clone().addScaledVector(direction, -reach), direction, 0, reach * 2);
        assert.ok(ray.intersectObjects(meshes).length, `${section.id}/${index}: walls have thickness rather than decorative outlines`);
      }
    }
    assert.equal(structure.circulation.paths.length, structure.rooms.length, `${section.id}: no disconnected content room`);
    const halfWidth = structure.circulation.width / 2;
    const core = layout.core;
    for (const path of structure.circulation.paths) {
      assert.ok(path.points.length >= 2);
      for (let i = 1; i < path.points.length; i++) {
        const a = path.points[i - 1], b = path.points[i];
        const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (length < 1e-6) continue;
        const nx = -(b[1] - a[1]) / length, nz = (b[0] - a[0]) / length;
        for (const side of [-.8, 0, .8]) {
          const origin = new T.Vector3(a[0] + nx * halfWidth * side, unit * .7, a[1] + nz * halfWidth * side);
          const direction = new T.Vector3((b[0] - a[0]) / length, 0, (b[1] - a[1]) / length);
          const ray = new T.Raycaster(origin, direction, unit * .01, Math.max(unit * .01, length - unit * .01));
          assert.equal(ray.intersectObjects(meshes).length, 0, `${section.id}: actual corridor geometry remains walkable`);
        }
        for (const t of [0, .25, .5, .75, 1]) for (const side of [-.95, 0, .95]) {
          const x = a[0] * (1 - t) + b[0] * t + nx * halfWidth * side;
          const z = a[1] * (1 - t) + b[1] * t + nz * halfWidth * side;
          assert.ok(inside(x, z, layout.outline), `${section.id}: a continuous corridor stays on the slab`);
          assert.ok(Math.abs(x - core.x) >= core.width / 2 || Math.abs(z - core.z) >= core.depth / 2,
            `${section.id}: room circulation leaves the elevator and stair clear`);
        }
      }
    }
  }
});

test('real furnishings occupy the full length and width of all nineteen architectural rooms', () => {
  let checked = 0;
  for (const section of sections) {
    const content = floorContent[section.id], interior = createInterior(section, content);
    for (const [index, room] of interior.rooms.entries()) {
      const label = `${section.id}/${content.rooms[index].id}`;
      assert.ok(room.furnishingBounds?.isBox3, `${label}: furniture bounds exclude architectural floors and walls`);
      const size = room.furnishingBounds.getSize(new T.Vector3());
      assert.ok(size.x >= room.region.width * .72, `${label}: furnishing clusters fill the usable room width`);
      assert.ok(size.z >= room.region.depth * .72, `${label}: furnishing clusters fill the usable room depth`);
      assert.ok(size.y > interior.unit, `${label}: room contains tangible full-height furniture`);
      const meshes = interior.pickables.filter(mesh => mesh.userData.roomIndex === index);
      assert.ok(meshes.length >= 3 && meshes.length <= 4, `${label}: furnishings stay in shared surface batches`);
      let furnitureTriangles = 0;
      for (const mesh of meshes) furnitureTriangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
      assert.ok(furnitureTriangles >= 800, `${label}: furnished rooms have more than a token object or an empty floor`);
      const opening = interior.architecture.rooms[index].opening;
      for (const fraction of [-.3, 0, .3]) {
        const origin = new T.Vector3(opening.x + fraction * opening.width, interior.unit * .7,
          opening.z + opening.entrySide * interior.unit * .35);
        const ray = new T.Raycaster(origin, new T.Vector3(0, 0, -opening.entrySide), 0, interior.unit * 1.35);
        assert.equal(ray.intersectObjects(interior.pickables, false).length, 0,
          `${label}: furniture leaves the doorway and its interior landing clear`);
      }
      checked++;
    }
  }
  assert.equal(checked, 19);
});

test('reading drawings retain the full room finishes and matching physical doorway locations', () => {
  for (const { section, structure } of fixtures) {
    const drawing = planLayouts[section.id];
    const dom = new JSDOM(createFloorPlan(section.id), { contentType: 'image/svg+xml' });
    for (const [index, room] of structure.rooms.entries()) {
      const finish = dom.window.document.querySelector(`[data-plan-room="${index}"]`);
      const entry = dom.window.document.querySelector(`[data-plan-door="${index}"]`);
      assert.ok(finish && entry, `${section.id}/${index}: complete architectural room and its entrance remain in the reading drawing`);
      const [cx, cy] = drawing.mapPoint([room.floor.x, room.floor.z]);
      const width = room.floor.width * drawing.scale, depth = room.floor.depth * drawing.scale;
      for (const [attribute, expected] of Object.entries({ x: cx - width / 2, y: cy - depth / 2, width, height: depth }))
        assert.ok(Math.abs(Number(finish.getAttribute(attribute)) - expected) < .01, `${section.id}/${index}: floor finish uses the real room footprint`);
      const values = entry.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
      const [entryX, entryY] = drawing.mapPoint([room.opening.x, room.opening.z]);
      const openingWidth = room.opening.width * drawing.scale;
      assert.ok(Math.abs(values[0] - (entryX - openingWidth / 2)) < .01 && Math.abs(values[1] - entryY) < .01,
        `${section.id}/${index}: left jamb matches the physical doorway`);
      assert.ok(Math.abs(values[3] - (entryX + openingWidth / 2)) < .01 && Math.abs(values[4] - entryY) < .01,
        `${section.id}/${index}: right jamb matches the physical doorway`);
      assert.equal(Math.sign(values[2]), -room.opening.entrySide, `${section.id}/${index}: door swing faces the actual room`);
    }
    dom.window.close();
  }
});
