import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/vendor/three.module.min.js';
import { createTowerModel } from '../assets/tower-model.js';
import { sections, footprint, stationPositions } from '../assets/tower-geometry.js';
import { floorContent } from '../assets/floor-content.js';
import { districtPlan } from '../assets/district-ground.js';

const model = createTowerModel();
model.root.updateMatrixWorld(true);
const round = value => Math.round(value * 1e5);
const key = p => p.map(round).join(',');

test('compact drawing preserves solid geometry and landmarks while reducing line work', () => {
  const meshes = model.modules.map(module => module.mesh.geometry);
  const full = model.modules.reduce((sum, module) => sum + module.lineGeometry.attributes.position.count, 0);
  model.setCompact(true);
  const compact = model.modules.reduce((sum, module) => sum + module.shell.children[1].geometry.attributes.position.count, 0);
  assert.ok(compact < full * .5, `${compact} compact / ${full} full line vertices`);
  assert.ok(model.modules.every((module, index) => module.mesh.geometry === meshes[index]), 'Solid surfaces and picking geometry retain their full profile');
  assert.ok(model.modules.every(module => module.shell.children.filter(node => node.isMesh).length <= 4), 'Each section batches its internal floor plates into one draw');
  assert.equal(model.districtBuildings.root.getObjectByName('building-outlines').visible, true);
  assert.equal(model.districtDetails.root.getObjectByName('district-detail-ink').visible, true);
  assert.equal(model.districtBuildings.root.getObjectByName('building-facades').visible, false);
  model.setCompact(false);
  assert.ok(model.modules.every(module => module.shell.children[1].geometry === module.lineGeometry), 'Desktop line detail is restored after rotation or resize');
});

test('the district reserves a clear tower plaza and non-overlapping parcels outside the streets', () => {
  const overlap = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  const plaza = [-districtPlan.plazaHalf, -districtPlan.plazaHalf, districtPlan.plazaHalf, districtPlan.plazaHalf];
  const roads = districtPlan.roadCenters.flatMap(center => {
    const lo = center - districtPlan.roadWidth / 2, hi = center + districtPlan.roadWidth / 2;
    return [[lo, -108, hi, 108], [-108, lo, 108, hi]];
  });
  for (const [x, z] of footprint(0)) assert.ok(Math.abs(x) < districtPlan.plazaHalf && Math.abs(z) < districtPlan.plazaHalf);
  assert.equal(new Set(districtPlan.parcels.map(parcel => parcel.id)).size, 12);
  for (const [index, parcel] of districtPlan.parcels.entries()) {
    const bounds = parcel.bounds;
    assert.ok(bounds[0] < bounds[2] && bounds[1] < bounds[3]);
    assert.ok(!overlap(bounds, plaza), `${parcel.id}: leaves the plaza clear`);
    assert.ok(roads.every(road => !overlap(bounds, road)), `${parcel.id}: leaves streets clear`);
    assert.ok(districtPlan.parcels.slice(index + 1).every(other => !overlap(bounds, other.bounds)), `${parcel.id}: no overlapping parcels`);
  }
});

test('the decorative district has finite ground geometry within a small rendering budget', () => {
  const district = model.district;
  let calls = 0, triangles = 0, vertices = 0;
  district.root.traverse(node => {
    if (!node.geometry) return;
    calls++;
    const positions = node.geometry.attributes.position;
    vertices += positions.count;
    if (node.isMesh) triangles += positions.count / 3;
    for (let i = 0; i < positions.count; i++) {
      assert.ok(Number.isFinite(positions.getX(i)) && Number.isFinite(positions.getZ(i)));
      assert.ok(positions.getY(i) < 0, 'District geometry stays below the tower');
    }
    assert.equal(node.userData.sectionId, undefined, 'Ground cannot become a selectable tower section');
  });
  assert.ok(calls <= 10 && triangles < 500 && vertices < 10_000, `${calls} calls / ${triangles} triangles / ${vertices} vertices`);
});

test('district buildings fit their parcels, keep the tower clear, and share a bounded geometry budget', () => {
  const district = model.districtBuildings;
  assert.equal(district.buildings.length, districtPlan.parcels.length);
  assert.equal(new Set(district.buildings.map(building => building.parcelId)).size, 12);
  assert.equal(new Set(district.buildings.map(building => building.type)).size, 4);
  for (const building of district.buildings) {
    const [x0, z0, x1, z1] = districtPlan.parcels.find(parcel => parcel.id === building.parcelId).bounds;
    assert.ok(building.bounds.min.x >= x0 + 5 && building.bounds.max.x <= x1 - 5);
    assert.ok(building.bounds.min.z >= z0 + 5 && building.bounds.max.z <= z1 - 5);
    assert.ok(building.bounds.max.y < 17, `${building.parcelId}: low-rise massing preserves the tower silhouette`);
    assert.ok(building.parts.every(part => part.width > 0 && part.depth > 0 && part.top > part.bottom));
  }
  let triangles = 0, vertices = 0;
  for (const object of district.root.children) {
    const positions = object.geometry.attributes.position;
    vertices += positions.count;
    if (object.isMesh) triangles += positions.count / 3;
    assert.equal(object.userData.sectionId, undefined, 'Buildings cannot become selectable portfolio sections');
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      assert.ok([x, y, z].every(Number.isFinite));
      assert.ok(districtPlan.parcels.some(({ bounds: [x0, z0, x1, z1] }) => x > x0 + 5 && x < x1 - 5 && z > z0 + 5 && z < z1 - 5), 'All surfaces and facade strokes leave streets and sidewalks clear');
    }
  }
  const roofNormals = district.root.getObjectByName('building-roofs').geometry.attributes.normal;
  for (let i = 0; i < roofNormals.count; i++) assert.ok(roofNormals.getY(i) > 0, 'Gabled, sawtooth, and flat roofs face the sky');
  assert.ok(district.root.children.length <= 5 && triangles < 2500 && vertices < 16_000, `${triangles} triangles / ${vertices} vertices`);

  const target = new T.Vector3(0, 5, 0);
  const meshes = district.root.children.filter(object => object.isMesh);
  for (let i = 0; i < 24; i++) {
    const angle = i / 24 * Math.PI * 2;
    const origin = new T.Vector3(Math.sin(angle) * 215, 116, Math.cos(angle) * 215);
    const ray = new T.Raycaster(origin, target.clone().sub(origin).normalize(), 0, origin.distanceTo(target));
    assert.equal(ray.intersectObjects(meshes).length, 0, `Opening view keeps the tower base visible from ${i * 15} degrees`);
  }
});

test('blueprint road marks have visible area, face upward, and stay inside the streets', () => {
  const mesh = model.district.root.getObjectByName('road-markings');
  assert.ok(mesh.isMesh, 'Lane marks and crossings have a world-space width');
  const positions = mesh.geometry.attributes.position;
  for (let i = 0; i < positions.count; i += 3) {
    const points = [0, 1, 2].map(offset => new T.Vector3().fromBufferAttribute(positions, i + offset));
    const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
    assert.ok(normal.y > 0, 'Road markings are visible from above without double-sided rendering');
    for (const point of points) {
      assert.ok(districtPlan.roadCenters.some(center => Math.abs(point.x - center) < districtPlan.roadWidth / 2 || Math.abs(point.z - center) < districtPlan.roadWidth / 2), 'Marks cannot spill onto the sidewalks or plaza');
      assert.ok(point.y < 0 && Math.max(Math.abs(point.x), Math.abs(point.z)) <= 108);
    }
  }
  const ray = new T.Raycaster(new T.Vector3(0, 10, 42), new T.Vector3(0, -1, 0));
  assert.ok(ray.intersectObject(mesh).length, 'The central plaza crossing has a solid stripe');
  ray.ray.origin.set(2.5, 10, 42);
  assert.equal(ray.intersectObject(mesh).length, 0, 'A gap remains between crossing stripes');
});

test('district shading keeps opaque building depth and inexpensive contact washes', () => {
  for (const group of [model.districtBuildings, model.districtDetails]) {
    for (const mesh of group.root.children.filter(node => node.isMesh)) {
      const colors = mesh.geometry.attributes.color;
      assert.equal(colors.count, mesh.geometry.attributes.position.count);
      assert.ok([...colors.array].every(value => value >= 0 && value <= 1), 'Baked face washes stay within the paper palette');
      assert.ok(mesh.material.depthWrite && !mesh.material.transparent, 'White washes preserve solid surface occlusion');
    }
    const original = group.root.children.map(node => node.material.opacity);
    group.setPresentation(1, 1); assert.equal(group.root.visible, false);
    group.setPresentation(0, 0); assert.equal(group.root.visible, true);
    assert.deepEqual(group.root.children.map(node => node.material.opacity), original, 'Presentation fades restore the original ink weights');
    assert.ok(group.root.children.filter(node => node.isMesh).every(mesh => !mesh.material.transparent));
  }
  const mesh = model.districtShadows.root.children[0];
  assert.equal(model.districtShadows.root.children.length, 1, 'All contact washes share one draw call');
  assert.ok(mesh.geometry.attributes.position.count / 3 < 1500, 'The soft ground washes have a bounded geometry budget');
  const alpha = mesh.geometry.attributes.color;
  assert.equal(alpha.itemSize, 4);
  assert.ok([...alpha.array].every(value => Number.isFinite(value) && value >= 0 && value <= 1));
  assert.ok(alpha.array.some((value, index) => index % 4 === 3 && value === 0), 'The outer edge fades completely');
  assert.ok(mesh.material.transparent && !mesh.material.depthWrite, 'Contact washes cannot hide the building geometry');
  for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
    assert.ok(mesh.geometry.attributes.position.getY(i) < 0, 'Contact washes stay on the ground');
  }
  model.districtShadows.setPresentation(1, 1); assert.equal(model.districtShadows.root.visible, false);
  model.districtShadows.setPresentation(0, 0); assert.equal(model.districtShadows.root.visible, true);
  for (const group of [model.district, model.districtBuildings, model.districtDetails, model.districtShadows]) {
    assert.ok(group.root.children.every(node => node.material.userData.districtDepth), 'All city layers share camera-relative depth fading');
  }
  assert.ok(model.modules.every(module => !module.surface.userData.districtDepth && !module.line.userData.districtDepth), 'Atmospheric fading leaves the portfolio tower readable');
});

test('district landscaping and engineering references leave building volumes clear and stay inexpensive', () => {
  const district = model.districtDetails;
  const count = kind => district.features.filter(feature => feature.kind === kind).length;
  assert.ok(count('tree') >= 20 && count('bench') >= 8 && count('streetlight') >= 8);
  for (const kind of ['campus-quad', 'residential-courtyard', 'engineering-workshop', 'vehicle-test-loop', 'formula-test-car', 'autonomous-test-car', 'test-garage-frontage', 'roof-equipment']) assert.ok(count(kind), `${kind}: recognizable district character`);
  const parts = model.districtBuildings.buildings.flatMap(building => building.parts.map(part => new T.Box3(
    new T.Vector3(part.x - part.width / 2 + .01, part.bottom + .01, part.z - part.depth / 2 + .01),
    new T.Vector3(part.x + part.width / 2 - .01, part.top - .01, part.z + part.depth / 2 - .01))));
  for (const feature of district.features) {
    assert.ok(!feature.bounds.isEmpty() && [...feature.bounds.min.toArray(), ...feature.bounds.max.toArray()].every(Number.isFinite), `${feature.kind}: tangible, finite geometry`);
    if (feature.placement === 'ground') assert.ok(parts.every(part => !part.intersectsBox(feature.bounds)), `${feature.kind}: stays outside occupied building volumes`);
  }
  let triangles = 0, vertices = 0;
  for (const object of district.root.children) {
    const positions = object.geometry.attributes.position;
    vertices += positions.count;
    if (object.isMesh) triangles += positions.count / 3;
    assert.equal(object.userData.sectionId, undefined, 'Scenery never becomes a selectable tower section');
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      assert.ok([x, y, z].every(Number.isFinite));
      assert.ok(Math.abs(x) < districtPlan.extent && Math.abs(z) < districtPlan.extent && y < 17);
      if (y < .5) assert.ok(districtPlan.roadCenters.every(center => Math.abs(x - center) > districtPlan.roadWidth / 2 && Math.abs(z - center) > districtPlan.roadWidth / 2), 'Ground-level fixtures keep the streets and crosswalks clear');
    }
  }
  assert.ok(district.root.children.length <= 6 && triangles < 6500 && vertices < 30_000, `${triangles} triangles / ${vertices} vertices`);
  const target = new T.Vector3(0, 5, 0);
  for (let i = 0; i < 24; i++) {
    const angle = i / 24 * Math.PI * 2;
    const origin = new T.Vector3(Math.sin(angle) * 215, 116, Math.cos(angle) * 215);
    const ray = new T.Raycaster(origin, target.clone().sub(origin).normalize(), 0, origin.distanceTo(target));
    assert.equal(ray.intersectObjects(district.root.children.filter(object => object.isMesh)).length, 0, 'Landscaping preserves the opening sightline to the tower base');
  }
});

test('cap plans stay within their cut footprints and keep distinct, inexpensive furnishings', () => {
  const signatures = new Set();
  const inside = (x, z, polygon) => {
    let result = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
    }
    return result;
  };
  for (const module of model.modules) {
    const { capPlans } = module;
    assert.ok(capPlans.features.includes('elevator') && capPlans.features.includes('stairs'));
    assert.ok(capPlans.features.length >= 6, `${module.id}: meaningful furnishings`);
    signatures.add([...capPlans.features].sort().join(','));
    assert.ok(capPlans.faces.some(face => face.side === 'underside'), `${module.id}: furnished lower cut`);
    assert.equal(capPlans.faces.some(face => face.side === 'top'), module.id !== 'about', 'The spire is preserved rather than furnished');
    assert.equal(capPlans.group.children.length, 2, 'Two batched drawing layers per section');
    let count = 0;
    for (const drawing of capPlans.group.children) {
      const points = drawing.geometry.attributes.position;
      count += points.count;
      for (let i = 0; i < points.count; i++) {
        const x = points.getX(i), y = points.getY(i), z = points.getZ(i);
        assert.ok([x, y, z].every(Number.isFinite));
        const face = capPlans.faces.find(face => Math.abs(face.y - y) < 1e-4);
        assert.ok(face, `${module.id}: every stroke belongs to a cut face`);
        assert.ok(inside(x, z, footprint(face.height)), `${module.id}: plan stays within the facade`);
      }
      assert.equal(drawing.userData.sectionId, undefined, 'Decorative strokes do not become picking targets');
    }
    assert.ok(count > 100 && count < 5000, `${module.id}: ${count} plan vertices`);
  }
  assert.equal(signatures.size, 5, 'Five section-specific furnishing schemes');
});

test('all five sections have closed exterior volumes, including their cut surfaces', () => {
  for (const module of model.modules) {
    const edges = new Map();
    const meshes = module.shell.children.filter(item => item.isMesh).slice(0, 3);
    for (const mesh of meshes) {
      const geometry = mesh.geometry;
      const vertices = geometry.attributes.position;
      const indices = geometry.index ? [...geometry.index.array] : Array.from({ length: vertices.count }, (_, i) => i);
      for (let i = 0; i < indices.length; i += 3) {
        const points = indices.slice(i, i + 3).map(index => [vertices.getX(index), vertices.getY(index) + mesh.position.y, vertices.getZ(index)]);
        for (let j = 0; j < 3; j++) {
          const edge = [key(points[j]), key(points[(j + 1) % 3])].sort().join('|');
          edges.set(edge, (edges.get(edge) || 0) + 1);
        }
      }
    }
    assert.ok(edges.size > 100, `${module.id}: substantial geometry`);
    assert.equal([...edges.values()].filter(count => count !== 2).length, 0, `${module.id}: no open edges or floating rear panels`);
  }
});

test('the full model can be hit from every azimuth rather than a single SVG-facing side', () => {
  for (const module of model.modules) {
    const center = new T.Vector3(0, (module.low + module.high) / 2, 0);
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2;
      const origin = center.clone().add(new T.Vector3(Math.cos(angle) * 100, 3, Math.sin(angle) * 100));
      const ray = new T.Raycaster(origin, center.clone().sub(origin).normalize());
      assert.ok(ray.intersectObject(module.mesh).length, `${module.id}: visible from azimuth ${i * 15}°`);
    }
  }
});

test('each section has furnished, selectable rooms matching every content room', () => {
  const signatures = new Set();
  for (const module of model.modules) {
    const { rooms } = floorContent[module.id];
    const roomSignatures = new Set();
    assert.equal(module.interior.anchors.length, rooms.length);
    assert.equal(stationPositions(module, rooms.length).length, rooms.length);
    const indexes = new Set(module.interior.pickables.map(item => item.userData.roomIndex));
    assert.equal(indexes.size, rooms.length, `${module.id}: every room has interactive furniture`);
    for (const [index, room] of module.interior.rooms.entries()) {
      const label = `${module.id}/${rooms[index].id}`;
      assert.ok(room.detailCount >= 20, `${label}: furniture contains meaningful visible detail`);
      assert.ok(new Set(room.features).size >= 1, `${label}: recognizable furnishings are identified`);
      assert.ok(room.features.every(feature => typeof feature === 'string' && feature.trim()), `${label}: named furnishings`);
      roomSignatures.add([...room.features].sort().join(','));
      const furniture = module.interior.pickables.filter(mesh => mesh.userData.roomIndex === index);
      assert.ok(furniture.length, `${label}: selectable geometry exists`);
      // Aim at a real triangle rather than a metadata anchor or an empty room centre.
      const mesh = furniture.find(item => item.geometry.attributes.position.count >= 3);
      assert.ok(mesh, `${label}: furniture has a tangible surface`);
      const position = mesh.geometry.attributes.position;
      const indices = mesh.geometry.index?.array;
      let sample;
      for (let i = 0; i < (indices?.length ?? position.count); i += 3) {
        const vertices = [0, 1, 2].map(offset => new T.Vector3().fromBufferAttribute(position, indices?.[i + offset] ?? i + offset).applyMatrix4(mesh.matrixWorld));
        const normal = vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0]));
        if (normal.lengthSq() <= 1e-12) continue;
        sample = { point: vertices[0].clone().add(vertices[1]).add(vertices[2]).multiplyScalar(1 / 3), normal: normal.normalize() };
        break;
      }
      assert.ok(sample, `${label}: nondegenerate furniture surface`);
      const origin = sample.point.clone().addScaledVector(sample.normal, room.radius * 2 + 1);
      const hit = new T.Raycaster(origin, sample.point.clone().sub(origin).normalize()).intersectObjects(furniture)[0];
      assert.equal(hit?.object.userData.roomIndex, index, `${label}: furniture raycasts identify the correct room`);
    }
    assert.equal(roomSignatures.size, rooms.length, `${module.id}: each room has its own furnished purpose`);
    signatures.add(module.interior.rooms.map(room => [...room.features].sort().join(',')).join('|'));
    for (const mesh of module.interior.pickables) for (const n of mesh.geometry.attributes.position.array) assert.ok(Number.isFinite(n));
    assert.ok(module.base.geometry.parameters.options.depth > 0, `${module.id}: a solid floor slab`);
  }
  assert.equal(signatures.size, 5, 'five different interior models');
});

test('detailed interiors remain within a bounded geometry and rendering budget', () => {
  for (const module of model.modules) {
    let drawCalls = 0, triangles = 0;
    module.interior.group.traverse(node => {
      if (!node.isMesh && !node.isLine) return;
      drawCalls += Array.isArray(node.material) ? node.geometry.groups.length : 1;
      if (node.isMesh) triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
    });
    assert.ok(drawCalls <= module.interior.rooms.length * 6 + 24, `${module.id}: ${drawCalls} interior draw calls`);
    assert.ok(triangles > 100 && triangles <= 40_000, `${module.id}: ${triangles} furniture triangles`);
  }
});

test('all room anchors lie within their section footprint', () => {
  const inside = (x, y, polygon) => {
    let result = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
    }
    return result;
  };
  for (const section of sections) {
    const points = footprint(section.low + .02);
    for (const station of stationPositions(section, floorContent[section.id].rooms.length)) assert.ok(inside(station.x, station.z, points), `${section.id}: room inside the floor`);
    const module = model.modules.find(item => item.id === section.id);
    for (const mesh of module.interior.pickables) {
      const vertices = mesh.geometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        const point = new T.Vector3().fromBufferAttribute(vertices, i).applyMatrix4(mesh.matrixWorld);
        assert.ok(inside(point.x, point.z, points), `${section.id}: furniture and dividers stay within the slab`);
      }
    }
  }
});

test('room highlighting is independent and every camera target has real furniture bounds', () => {
  for (const module of model.modules) {
    const interior = module.interior;
    interior.setActiveRoom(1); interior.setHoveredRoom(2);
    assert.equal(interior.rooms[1].line.color.getHexString(), '174d91');
    assert.equal(interior.rooms[2].line.color.getHexString(), '376faf');
    assert.equal(interior.rooms[0].line.color.getHexString(), '7292b8');
    for (const room of interior.rooms) {
      assert.ok(room.radius > 0 && Number.isFinite(room.radius));
      assert.ok(room.bounds.containsPoint(room.center));
    }
    interior.setActiveRoom(0); interior.setHoveredRoom(null);
  }
});

test('room focus quiets the context and restores its materials without cumulative fading', () => {
  const appearance = material => ({ color: material.color.toArray(), opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite });
  for (const module of model.modules) {
    const interior = module.interior;
    interior.setActiveRoom(1);
    const materials = new Set();
    interior.rooms.forEach(room => room.group.traverse(node => {
      for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) materials.add(material);
    }));
    const original = new Map([...materials].map(material => [material, appearance(material)]));
    const contextLineOpacity = interior.rooms[0].line.opacity;
    const selectedMaterials = new Set();
    interior.rooms[1].group.traverse(node => {
      for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) selectedMaterials.add(material);
    });
    for (let repeat = 0; repeat < 3; repeat++) {
      interior.setFocus(1, .5);
      interior.setFocus(1, 1);
      assert.ok(interior.rooms[0].line.opacity < contextLineOpacity, `${module.id}: contextual furniture recedes`);
      for (const material of selectedMaterials) assert.deepEqual(appearance(material), original.get(material), `${module.id}: focused furniture remains clear`);
      for (const material of materials) {
        assert.ok(Number.isFinite(material.opacity) && material.opacity >= 0 && material.opacity <= 1, `${module.id}: valid material opacity`);
        assert.ok(material.color.toArray().every(value => Number.isFinite(value) && value >= 0 && value <= 1), `${module.id}: valid material color`);
      }
      interior.setFocus(repeat % 2 ? null : 1, 0);
      for (const material of materials) assert.deepEqual(appearance(material), original.get(material), `${module.id}: overview restores the original appearance`);
    }
    interior.setFocus(null, 1);
    for (const material of materials) assert.deepEqual(appearance(material), original.get(material), `${module.id}: clearing focus retains the overview`);
    interior.setFocus(1, 1); interior.setHoveredRoom(2);
    assert.equal(interior.rooms[2].line.color.getHexString(), '376faf', `${module.id}: hovering brings a contextual room back into view`);
    for (const { material } of interior.rooms[2].surfaces) assert.deepEqual(appearance(material), original.get(material), `${module.id}: previewed furniture regains its original surface`);
    interior.setHoveredRoom(null);
    assert.ok(interior.rooms[2].line.opacity < .58, `${module.id}: leaving a preview quiets that room again`);
    interior.setFocus(null, 0);
    interior.setActiveRoom(0);
  }
});
