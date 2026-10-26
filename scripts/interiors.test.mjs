import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/vendor/three.module.min.js';
import { sections, floorLayout } from '../assets/tower-geometry.js';
import { floorContent } from '../assets/floor-content.js';
import { createInterior,sofaPanels } from '../assets/interiors.js';
import { interiorRoomDesign } from '../assets/interior-design.js';

const tolerance = 1e-5;
const rectangleContains = (region, bounds) => bounds.min.x >= region.x - region.width / 2 - tolerance
  && bounds.max.x <= region.x + region.width / 2 + tolerance
  && bounds.min.z >= region.z - region.depth / 2 - tolerance
  && bounds.max.z <= region.z + region.depth / 2 + tolerance;

test('every room retains independently animated objects and exact batched picking identities', () => {
  let rooms = 0, objects = 0;
  for (const section of sections) {
    const interior = createInterior(section, floorContent[section.id]);
    const controls = interior.interactions;
    for (const [index, room] of interior.rooms.entries()) {
      rooms++;
      const targets = controls.objects.filter(object => object.roomIndex === index);
      assert.ok(targets.length >= 5, `${section.id}/${index}: multiple individual objects, including secondary furnishings`);
      assert.equal(room.group.children.length, 4, 'Object identities do not unbatch the room');
      for (const mesh of room.group.children) {
        assert.equal(mesh.geometry.index, null, 'Raycast triangle indices address the original batched vertices');
        assert.ok(mesh.material.vertexColors, 'Batched surfaces support isolated object highlights');
        for (const range of mesh.userData.objectRanges) {
          for (const vertex of [range.start, range.start + range.count - 3]) {
            assert.equal(controls.resolve({ object: mesh, faceIndex: vertex / 3 }), range.target, 'The first and last triangle resolve to the correct object');
          }
        }
      }
      for (const target of targets) {
        objects++;
        assert.ok(target.parts.some(part => part.geometry.attributes.normal), 'Every object has solid geometry');
        assert.ok(target.parts.some(part => !part.geometry.attributes.normal), 'Its outline participates in the same animation');
        const part = target.parts[0], color = part.geometry.attributes.color;
        controls.hover(target); controls.update(0); controls.update(160);
        assert.ok(color.getZ(part.start) < 1, `${target.name}: hover visibly changes its own color range`);
        controls.hover(null); controls.activate(target, 200); controls.update(650);
        assert.ok(color.getZ(part.start) < .8, `${target.name}: click produces a stronger finite response`);
        controls.update(2000);
        assert.equal(controls.update(2016).moving, false, 'The response stops requesting frames');
        for (const range of target.parts) {
          const position = range.geometry.attributes.position;
          for (let i = 0; i < range.count * 3; i++) assert.ok(Math.abs(position.array[range.start * 3 + i] - range.rest[i]) < tolerance, 'The resting shape is restored without drift');
          assert.equal(range.geometry.attributes.color.getZ(range.start), 1);
        }
      }
    }
  }
  assert.equal(rooms, sections.reduce((sum,section)=>sum+floorContent[section.id].rooms.length,0));
  assert.ok(objects > 200, 'Primary and secondary objects participate across every floor');
});

test('object responses stay isolated, retrigger safely, and remove spatial motion when reduced motion changes', () => {
  const interior = createInterior(sections.find(section=>section.id==='about'), floorContent.about), controls = interior.interactions;
  const plant = controls.objects.find(object => object.kind === 'plant');
  const piano = controls.objects.find(object => object.kind === 'piano');
  const parts = [plant, piano].flatMap(object => object.parts);
  controls.hover(plant); controls.activate(plant, 0); controls.update(240);
  assert.ok(plant.parts.some(part => part.rest.some((value, i) => Math.abs(value - part.geometry.attributes.position.array[part.start * 3 + i]) > .001)), 'The plant sways');
  assert.ok(piano.parts.every(part => part.geometry.attributes.color.getZ(part.start) === 1), 'A neighboring object stays unchanged');
  controls.activate(piano, 240); controls.update(550);
  assert.ok(piano.parts.filter(part => part.key !== undefined).some(part => part.geometry.attributes.position.getY(part.start) < part.rest[1] - .01), 'The piano presses its actual separate keys');
  controls.activate(plant, 550); controls.update(650);
  controls.setReducedMotion(true); controls.update(700);
  for (const part of parts) {
    for (let i = 0; i < part.rest.length; i++) assert.ok(Math.abs(part.geometry.attributes.position.array[part.start * 3 + i] - part.rest[i]) < tolerance, 'Reduced motion immediately restores spatial geometry');
  }
  assert.ok(plant.parts[0].geometry.attributes.color.getZ(plant.parts[0].start) < 1, 'Reduced motion keeps visible interaction feedback');
  controls.reset();
  assert.equal(controls.update(720).changed, false, 'Leaving a floor cancels all pending object animation');
  assert.ok(parts.every(part => part.geometry.attributes.color.getZ(part.start) === 1));
});

test('penthouse bedding and toys provide visible finite movement with a reduced-motion alternative',()=>{
  const section=sections.find(section=>section.id==='penthouse'),interior=createInterior(section,floorContent.penthouse),controls=interior.interactions;
  for(const name of ['Pillows and duvet','Toy robot','Vinyl record','Telescope']){
    controls.reset();controls.setReducedMotion(false);
    const target=controls.objects.find(object=>object.name===name);
    assert.ok(target,`${name}: an individually selectable penthouse furnishing`);
    controls.activate(target,0);controls.update(320);
    assert.ok(target.parts.some(part=>part.rest.some((value,i)=>Math.abs(value-part.geometry.attributes.position.array[part.start*3+i])>.001)),`${name}: activation visibly changes real geometry`);
    controls.setReducedMotion(true);controls.update(400);
    for(const part of target.parts){
      assert.ok(part.rest.every((value,i)=>Math.abs(value-part.geometry.attributes.position.array[part.start*3+i])<tolerance),`${name}: reduced motion restores its resting geometry`);
    }
    assert.ok(target.parts.some(part=>part.geometry.attributes.color.getZ(part.start)<1),`${name}: reduced motion retains visual feedback`);
    controls.update(2000);assert.equal(controls.update(2016).moving,false,`${name}: the response settles without an animation loop`);
  }
});

test('inspection car tires and brake hubs remain concentric through animation and retriggering', () => {
  const section = sections.find(section => section.id === 'experience');
  const interior = createInterior(section, floorContent.experience), controls = interior.interactions;
  const car = controls.objects.find(object => object.name === 'Formula inspection model');
  const roomParts = controls.objects.filter(object => object.roomIndex === car.roomIndex)
    .flatMap(object => object.parts).filter(part => part.normals);
  const bounds = (part, rest = false) => new T.Box3().setFromArray(rest ? part.rest
    : part.geometry.attributes.position.array.subarray(part.start * 3, (part.start + part.count) * 3));
  const center = (part, rest = false) => bounds(part, rest).getCenter(new T.Vector3());
  const pairs = [];
  for (const x of [-1.3, 1.3]) for (const z of [-1.75, 1.75]) {
    // This side-wing room faces the opposite direction after furnishing.
    const turn=interiorRoomDesign('experience',3).turn+Math.PI;
    const axle = new T.Vector3(x,.6,z).applyAxisAngle(new T.Vector3(0,1,0),turn);
    const atAxle = roomParts.filter(part => center(part, true).distanceTo(axle) < tolerance);
    const axis=Math.abs(Math.cos(turn))>.5?'x':'z';
    const tire = atAxle.find(part => Math.abs(bounds(part, true).getSize(new T.Vector3())[axis] - .5) < tolerance);
    const hub = atAxle.find(part => Math.abs(bounds(part, true).getSize(new T.Vector3())[axis] - .54) < tolerance);
    assert.ok(tire && hub, 'Each of the four wheels has its visible tire and brake hub');
    assert.ok(tire.target === car, 'The tire belongs to the car animation');
    assert.ok(hub.target === car, 'The hub shares the car animation and pivot');
    pairs.push({ tire, hub });
  }
  const stationary = roomParts.filter(part => part.target !== car);
  controls.hover(car); controls.activate(car, 0);
  let moved = false;
  for (const time of [80, 150, 300, 450, 600, 780, 920, 1000, 1150, 1450]) {
    if (time === 600) controls.activate(car, time);
    controls.update(time);
    for (const { tire, hub } of pairs) {
      assert.ok(center(tire).distanceTo(center(hub)) < tolerance, 'Tire and hub centers stay aligned throughout the turn');
      moved ||= center(tire).distanceTo(center(tire, true)) > .01;
    }
    for (const part of stationary) assert.deepEqual(
      part.geometry.attributes.position.array.subarray(part.start * 3, (part.start + part.count) * 3),
      part.rest, 'Nearby pit equipment and spare wheels stay fixed');
  }
  assert.ok(moved, 'The regression exercises spatial motion');
  controls.setReducedMotion(true); controls.update(1480);
  for (const part of car.parts) assert.deepEqual(
    part.geometry.attributes.position.array.subarray(part.start * 3, (part.start + part.count) * 3), part.rest);
  controls.reset();
  assert.equal(controls.update(1600).moving, false);
});

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
