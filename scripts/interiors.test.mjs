import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/vendor/three.module.min.js';
import { sections, floorLayout } from '../assets/tower-geometry.js';
import { floorContent } from '../assets/floor-content.js';
import { createInterior } from '../assets/interiors.js';

const tolerance = 1e-5;
const rectangleContains = (region, bounds) => bounds.min.x >= region.x - region.width / 2 - tolerance
  && bounds.max.x <= region.x + region.width / 2 + tolerance
  && bounds.min.z >= region.z - region.depth / 2 - tolerance
  && bounds.max.z <= region.z + region.depth / 2 + tolerance;

test('complete furnished rooms fit their assigned usable bays and leave the service core clear', () => {
  for (const section of sections) {
    const content = floorContent[section.id], layout = floorLayout(section.low + .02, content.rooms.length);
    const interior = createInterior(section, content);
    interior.group.updateMatrixWorld(true);
    for (const [index, room] of interior.rooms.entries()) {
      const bounds = new T.Box3().setFromObject(room.group);
      const label = `${section.id}/${content.rooms[index].id}`;
      assert.ok(rectangleContains(layout.regions[index], bounds), `${label}: furniture, plants, dividers and inlays fit the usable room`);
      const core = layout.core;
      const overlapX = Math.min(bounds.max.x, core.x + core.width / 2) - Math.max(bounds.min.x, core.x - core.width / 2);
      const overlapZ = Math.min(bounds.max.z, core.z + core.depth / 2) - Math.max(bounds.min.z, core.z - core.depth / 2);
      assert.ok(overlapX <= 0 || overlapZ <= 0, `${label}: the service core remains clear`);
      assert.equal(room.group.scale.x, room.group.scale.y, `${label}: furnishings preserve their proportions`);
      assert.equal(room.group.scale.y, room.group.scale.z, `${label}: furnishings preserve their proportions`);
    }
  }
});

test('every floor has an elevator and a stair contained by the shared service region', () => {
  for (const section of sections) {
    const content = floorContent[section.id], layout = floorLayout(section.low + .02, content.rooms.length);
    const interior = createInterior(section, content);
    const service = interior.group.children.filter(node => node.name.startsWith('service-core-'));
    assert.equal(service.filter(node => node.name === 'service-core-elevator').length, 1, `${section.id}: an elevator`);
    const stair = service.find(node => node.name === 'service-core-stair');
    assert.ok(stair, `${section.id}: a complete stair flight`);
    const { position, normal } = stair.geometry.attributes;
    const topHeights = new Set();
    for (let i = 0; i < position.count; i++) if (normal.getY(i) > .99) topHeights.add(Math.round(position.getY(i) * 1e5));
    assert.equal(topHeights.size, 8, `${section.id}: eight distinct visible stair treads`);
    assert.equal(position.count / 3, 8 * 12, `${section.id}: eight closed solid treads in one draw`);
    for (const mesh of service) {
      assert.ok(rectangleContains(layout.core, new T.Box3().setFromObject(mesh)), `${section.id}: ${mesh.name} stays inside the service core`);
    }
  }
});

test('interior rails remain on the slab around the concave L recess', () => {
  const inside = (x, z, polygon) => {
    let result = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
    }
    return result;
  };
  for (const section of sections) {
    const content = floorContent[section.id], layout = floorLayout(section.low + .02, content.rooms.length);
    const interior = createInterior(section, content);
    const rail = interior.group.getObjectByName('interior-perimeter-rail').geometry.attributes.position;
    for (let i = 0; i < rail.count; i += 2) {
      for (const t of [0, .25, .5, .75, 1]) {
        const x = rail.getX(i) * (1 - t) + rail.getX(i + 1) * t;
        const z = rail.getZ(i) * (1 - t) + rail.getZ(i + 1) * t;
        assert.ok(inside(x, z, layout.outline), `${section.id}: a rail segment stays over the slab`);
      }
    }
  }
});
