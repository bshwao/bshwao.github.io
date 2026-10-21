import test from 'node:test';
import assert from 'node:assert/strict';
import { floorContent } from '../assets/floor-content.js';
import { parseRoute, routeHash } from '../assets/routes.js';

const overview = sectionId => ({ mode: 'section', sectionId, roomIndex: null });
const tower = { mode: 'tower', sectionId: null, roomIndex: null };

test('every floor and individual room has a stable shareable round-trip', () => {
  for (const [sectionId, { rooms }] of Object.entries(floorContent)) {
    assert.equal(routeHash(overview(sectionId)), `#${sectionId}`);
    assert.deepEqual(parseRoute(`#${sectionId}`), overview(sectionId));
    for (const [roomIndex, room] of rooms.entries()) {
      const route = { mode: 'section', sectionId, roomIndex };
      const hash = `#${sectionId}/${room.id}`;
      assert.equal(routeHash(route), hash);
      assert.deepEqual(parseRoute(hash), route);
      assert.deepEqual(parseRoute(hash.slice(1)), route, 'bare hashes accepted by internal navigation');
      assert.equal(routeHash(parseRoute(hash)), hash);
    }
  }
});

test('encoded room links resolve to the same destination', () => {
  assert.deepEqual(parseRoute('#%70rojects/%62'), { mode: 'section', sectionId: 'projects', roomIndex: 1 });
  assert.deepEqual(parseRoute('#%65xplore'), { mode: 'explore', sectionId: null, roomIndex: null });
});

test('unknown or excess room path segments preserve a valid floor overview', () => {
  for (const sectionId of Object.keys(floorContent)) {
    for (const suffix of ['/', '/unknown', '/-1', '/0', '/a/extra', '/a/', '//a', '/__proto__', '/%', '/%E0%A4%A', '/a%2Fb']) {
      const route = parseRoute(`#${sectionId}${suffix}`);
      assert.deepEqual(route, overview(sectionId), `${sectionId}${suffix}`);
      assert.equal(routeHash(route), `#${sectionId}`, 'sharing normalizes invalid room suffixes');
    }
  }
});

test('only existing integer room indexes are serialized', () => {
  for (const sectionId of Object.keys(floorContent)) {
    const invalidIndexes = [-1, floorContent[sectionId].rooms.length, 0.5, '1', NaN, Infinity, null, undefined];
    for (const roomIndex of invalidIndexes) {
      assert.equal(routeHash({ sectionId, roomIndex }), `#${sectionId}`);
    }
  }
});

test('tower, explore, and unrecognized routes normalize safely', () => {
  assert.deepEqual(parseRoute('#explore'), { mode: 'explore', sectionId: null, roomIndex: null });
  assert.equal(routeHash(parseRoute('#explore')), '#explore');
  assert.deepEqual(parseRoute(), tower);
  for (const hash of ['', '#', '#tower', '#missing/a', '#constructor/a', '#__proto__/a', '#toString', '#EXPLORE', '#explore/a', '#explore/', '#%', '#%E0%A4%A', '#projects%2Fb']) {
    assert.deepEqual(parseRoute(hash), tower, hash);
    assert.equal(routeHash(parseRoute(hash)), '#tower');
  }
  for (const sectionId of ['missing', 'constructor', '__proto__', 'toString', undefined]) {
    assert.equal(routeHash({ sectionId, roomIndex: 0 }), '#tower');
  }
  assert.equal(routeHash({ mode: 'explore', sectionId: 'projects', roomIndex: 1 }), '#explore');
  assert.equal(routeHash({ mode: 'tower', sectionId: 'projects', roomIndex: 1 }), '#tower');
});
