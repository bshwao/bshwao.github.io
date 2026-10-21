import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/vendor/three.module.min.js';
import { createTowerModel } from '../assets/tower-model.js';
import { sections, footprint, stationPositions } from '../assets/tower-geometry.js';
import { floorContent } from '../assets/floor-content.js';

const model = createTowerModel();
model.root.updateMatrixWorld(true);
const round = value => Math.round(value * 1e5);
const key = p => p.map(round).join(',');

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
