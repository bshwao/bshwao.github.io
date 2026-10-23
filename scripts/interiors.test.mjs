import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/vendor/three.module.min.js';
import { sections, floorLayout } from '../assets/tower-geometry.js';
import { floorContent } from '../assets/floor-content.js';
import { createInterior,sofaPanels } from '../assets/interiors.js';

const tolerance = 1e-5;
const rectangleContains = (region, bounds) => bounds.min.x >= region.x - region.width / 2 - tolerance
  && bounds.max.x <= region.x + region.width / 2 + tolerance
  && bounds.min.z >= region.z - region.depth / 2 - tolerance
  && bounds.max.z <= region.z + region.depth / 2 + tolerance;

test('sofa frame panels and cushions have no intersecting or exposed coplanar faces',()=>{
  const bounds=sofaPanels.map(panel=>new T.Box3().setFromCenterAndSize(new T.Vector3(...panel.position),new T.Vector3(...panel.size)));
  for(const [i,a]of bounds.entries())for(const b of bounds.slice(i+1)) {
    const overlap=['x','y','z'].map(axis=>Math.min(a.max[axis],b.max[axis])-Math.max(a.min[axis],b.min[axis]));
    assert.ok(overlap.some(value=>value>0)&&overlap.some(value=>value<-.005),'Every adjacent sofa piece has a real seam rather than overlapping faces');
  }
});

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
    const flight=layout.service.stair;
    const bounds=new T.Box3().setFromObject(stair),size=bounds.getSize(new T.Vector3());
    assert.ok(Math.abs(size.x/interior.unit-2.8)<tolerance&&Math.abs(size.z/interior.unit-1.2)<tolerance,`${section.id}: stair run and width use the same scale as the furniture`);
    assert.ok(Math.abs(size.y/interior.unit-1.52)<tolerance,`${section.id}: eight proportional risers`);
    for(let i=0;i<flight.count;i++) {
      const x=flight.x-flight.run/2+(i+.5)*flight.going;
      for(const fraction of [.1,.5,.9]) {
        const y=flight.baseY+(i+1)*flight.rise*fraction;
        const ray=new T.Raycaster(new T.Vector3(x,y,flight.z+flight.width),new T.Vector3(0,0,-1));
        assert.ok(ray.intersectObject(stair).length,`${section.id}: each step is supported all the way to the floor`);
      }
    }
    assert.ok(!new T.Box3().setFromObject(service.find(node=>node.name==='service-core-elevator')).intersectsBox(bounds),`${section.id}: elevator and stair leave each other clear`);
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
