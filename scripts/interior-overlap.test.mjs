import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/vendor/three.module.min.js';
import { sections } from '../assets/tower-geometry.js';
import { floorContent } from '../assets/floor-content.js';
import { createInterior } from '../assets/interiors.js';

// These pieces consist of box panels. Their nested books have their own object
// identities, so only panels that always animate together are compared here.
const panelObjects = new Set(['Display shelving', 'Supply locker']);
const interiors = sections.map(section => ({ section, interior: createInterior(section, floorContent[section.id]) }));
const fixtures = interiors.flatMap(({ section, interior }) => interior.interactions.objects
  .filter(object => panelObjects.has(object.name))
  .map(object => ({ object, label: `${section.id}/${object.roomIndex} ${object.name}` })));
const rounded = value => Math.round(value * 1e5);

function intersectionArea(subject, clip) {
  const cross = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const signed = points => points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
  const side = Math.sign(signed(clip));
  let polygon = subject;
  for (let edge = 0; edge < clip.length && polygon.length; edge++) {
    const a = clip[edge], b = clip[(edge + 1) % clip.length], next = [];
    for (let index = 0; index < polygon.length; index++) {
      const p = polygon[index], q = polygon[(index + 1) % polygon.length];
      const dp = side * cross(a, b, p), dq = side * cross(a, b, q);
      if (dp >= -1e-8) next.push(p);
      if ((dp < -1e-8 && dq > 1e-8) || (dp > 1e-8 && dq < -1e-8)) {
        const t = dp / (dp - dq);
        next.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    polygon = next;
  }
  return polygon.length >= 3 ? Math.abs(signed(polygon)) : 0;
}

function overlappingFaces(object) {
  const planes = new Map();
  for (const part of object.parts.filter(part => part.geometry.attributes.normal)) {
    const { position, normal } = part.geometry.attributes;
    for (let index = part.start; index < part.start + part.count; index += 3) {
      const face = new T.Vector3().fromBufferAttribute(normal, index);
      // Bevels and curved faces are outside this panel-join regression.
      if ([1, 2].some(offset => face.dot(new T.Vector3().fromBufferAttribute(normal, index + offset)) < .999999)) continue;
      const points = [0, 1, 2].map(offset => new T.Vector3().fromBufferAttribute(position, index + offset));
      const signature = [...face.toArray(), face.dot(points[0])].map(rounded).join(',');
      const drop = face.toArray().map(Math.abs).indexOf(Math.max(...face.toArray().map(Math.abs)));
      const flat = points.map(point => point.toArray().filter((_, axis) => axis !== drop));
      if (!planes.has(signature)) planes.set(signature, []);
      planes.get(signature).push(flat);
    }
  }
  const overlaps = [];
  for (const [plane, triangles] of planes) {
    for (let first = 0; first < triangles.length; first++) for (const second of triangles.slice(first + 1)) {
      const a = triangles[first];
      if ([0, 1].some(axis => Math.min(...a.map(point => point[axis])) >= Math.max(...second.map(point => point[axis])) - 1e-5
        || Math.min(...second.map(point => point[axis])) >= Math.max(...a.map(point => point[axis])) - 1e-5)) continue;
      if (intersectionArea(a, second) > 1e-5) overlaps.push(plane);
    }
  }
  return [...new Set(overlaps)];
}

function overlappingStrokes(object) {
  const lines = new Map();
  for (const part of object.parts.filter(part => !part.geometry.attributes.normal)) {
    const positions = part.geometry.attributes.position;
    for (let index = part.start; index < part.start + part.count; index += 2) {
      const a = new T.Vector3().fromBufferAttribute(positions, index);
      const b = new T.Vector3().fromBufferAttribute(positions, index + 1);
      const direction = b.clone().sub(a);
      if (direction.lengthSq() < 1e-12) continue;
      direction.normalize();
      if (direction.toArray().find(value => Math.abs(value) > 1e-5) < 0) direction.negate();
      const signature = [...direction.toArray(), ...a.clone().cross(direction).toArray()].map(rounded).join(',');
      if (!lines.has(signature)) lines.set(signature, []);
      lines.get(signature).push([Math.min(a.dot(direction), b.dot(direction)), Math.max(a.dot(direction), b.dot(direction))]);
    }
  }
  const overlaps = [];
  for (const [line, segments] of lines) {
    for (let first = 0; first < segments.length; first++) for (const second of segments.slice(first + 1)) {
      const a = segments[first];
      if (Math.min(a[1], second[1]) - Math.max(a[0], second[0]) > 2e-5) overlaps.push(line);
    }
  }
  return [...new Set(overlaps)];
}

test('shelf and locker panels have one same-facing surface at every join throughout the tower', () => {
  assert.ok(fixtures.length >= 15, 'The regression covers repeated panel furniture throughout the tower');
  const conflicts = fixtures.flatMap(({ object, label }) => {
    const planes = overlappingFaces(object);
    return planes.length ? [{ object: label, planes }] : [];
  });
  assert.deepEqual(conflicts, [], 'Panels within one animated object cannot retain competing coplanar faces');
});

test('shelf and locker outlines have no repeated or partially overlapping strokes', () => {
  const conflicts = fixtures.flatMap(({ object, label }) => {
    const lines = overlappingStrokes(object);
    return lines.length ? [{ object: label, lines }] : [];
  });
  assert.deepEqual(conflicts, [], 'Shared panel edges within one object must have one outline stroke');
});

test('rounded chair backs and workbench tops clear their adjoining plain panels', () => {
  const names = new Set(['Listening chair', 'Window lounge chair', 'Second lounge chair',
    'Diagnostic suite: instrument lockers, calibration worktable and technician seat']);
  const subjects = interiors.flatMap(({ section, interior }) => interior.interactions.objects
    .filter(object => names.has(object.name)).map(object => ({ object, label: `${section.id}/${object.roomIndex} ${object.name}` })));
  assert.equal(subjects.length, 4, 'All three rounded armchairs and the diagnostic worktable participate');
  const conflicts = subjects.flatMap(({ object, label }) => {
    const planes = overlappingFaces(object);
    return planes.length ? [{ object: label, planes }] : [];
  });
  assert.deepEqual(conflicts, [], 'Actual furniture triangles must be clean regardless of intervening room walls');
});

const horizontalGap = (a, b) => Math.max(a.min.x - b.max.x, b.min.x - a.max.x,
  a.min.z - b.max.z, b.min.z - a.max.z);

test('Contact tea garden leaves space between its sofas, tea table, storage and visitor seats', () => {
  const interior = createInterior(sections.find(section => section.id === 'contact'), floorContent.contact);
  const objects = interior.interactions.objects.filter(object => object.roomIndex === 2);
  const sofas = objects.filter(object => object.name === 'Lounge sofa');
  const neighbors = objects.filter(object => ['Conversation lounge with coffee table', 'Storage cabinet',
    'Connections lounge: hospitality credenza, tea cabinet and visitor armchairs', 'Visitor seat'].includes(object.name));
  assert.equal(sofas.length, 2);
  assert.equal(neighbors.length, 5, 'The tea table, both storage pieces and both extra seats participate');
  for (const sofa of sofas) for (const neighbor of neighbors) {
    assert.ok(horizontalGap(sofa.bounds, neighbor.bounds) >= .04,
      `The sofa must have a visible gap from ${neighbor.name}, including its cushions and arms`);
  }
  assert.ok(horizontalGap(sofas[0].bounds, sofas[1].bounds) >= .07, 'The sofas leave each other clear');
});

test('Contact consultation locker clears the low paneled wing divider and its cap', () => {
  const interior = createInterior(sections.find(section => section.id === 'contact'), floorContent.contact);
  const locker = interior.interactions.objects.find(object => object.roomIndex === 3 && object.name === 'Supply locker');
  assert.ok(locker);
  let triangles = 0;
  for (const mesh of interior.pickables.filter(mesh => mesh.userData.roomIndex === 3)) {
    const positions = mesh.geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 3) {
      if (mesh.userData.objectRanges.some(range => index >= range.start && index < range.start + range.count)) continue;
      const bounds = new T.Box3().setFromPoints([0, 1, 2].map(offset =>
        new T.Vector3().fromBufferAttribute(positions, index + offset)));
      assert.ok(horizontalGap(locker.bounds, bounds) >= .02,
        'The actual fixed divider triangles must leave the cabinet body and overhanging cap clear');
      triangles++;
    }
  }
  assert.ok(triangles > 20, 'The check compares the real paneled backdrop and trim');
});
