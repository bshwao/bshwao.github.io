import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { sections, footprint, floorLayout } from '../assets/tower-geometry.js';
import { floorContent } from '../assets/floor-content.js';
import { createFloorPlan, planLayouts } from '../assets/floor-plans.js';
import { createSectionReadingView } from '../assets/floor-view.js';
import { createCapPlans } from '../assets/cap-plans.js';

const inside = ([x, z], polygon) => {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
};

test('reading SVG uses the actual occupied section cut and matching numbered regions', () => {
  for (const section of sections) {
    const layout = planLayouts[section.id];
    const floor = floorLayout(section.low + .02, floorContent[section.id].rooms.length);
    const dom = new JSDOM(createFloorPlan(section.id), { contentType: 'image/svg+xml' });
    const values = dom.window.document.querySelector('.plan-outline').getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
    const drawing = Array.from({ length: values.length / 2 }, (_, i) => values.slice(i * 2, i * 2 + 2));
    assert.equal(drawing.length, floor.outline.length, `${section.id}: all facade corners retained`);
    const minX = Math.min(...floor.outline.map(p => p[0])), maxX = Math.max(...floor.outline.map(p => p[0]));
    const minZ = Math.min(...floor.outline.map(p => p[1])), maxZ = Math.max(...floor.outline.map(p => p[1]));
    const scale = Math.min(1000 / (maxX - minX), 540 / (maxZ - minZ));
    for (const [index, [x, y]] of drawing.entries()) {
      assert.ok(Math.abs((x - 600) / scale + (minX + maxX) / 2 - floor.outline[index][0]) < .001);
      assert.ok(Math.abs((y - 390) / scale + (minZ + maxZ) / 2 - floor.outline[index][1]) < .001);
    }
    const numbers = [...dom.window.document.querySelectorAll('[data-plan-number]')].map(node => node.dataset.planNumber);
    assert.deepEqual(numbers, floorContent[section.id].rooms.map(room => room.number));
    assert.equal(layout.rooms.length, floor.stations.length);
    for (const [index, room] of layout.rooms.entries()) {
      assert.ok(Math.abs(room.anchorX - (600 + (floor.stations[index].x - (minX + maxX) / 2) * scale)) < 1e-7);
      assert.ok(Math.abs(room.anchorY - (390 + (floor.stations[index].z - (minZ + maxZ) / 2) * scale)) < 1e-7);
    }
    dom.window.close();
  }
});

test('reading hotspots reach every original room and use the shared map anchors', async () => {
  const dom = new JSDOM(await readFile(new URL('../index.html', import.meta.url), 'utf8'), { pretendToBeVisual: true });
  const previous = { document: globalThis.document, window: globalThis.window, ResizeObserver: globalThis.ResizeObserver };
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  globalThis.ResizeObserver = class { observe() {} };
  dom.window.matchMedia = () => ({ matches: true });
  dom.window.HTMLElement.prototype.scrollIntoView = function () {};
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  try {
    const view = createSectionReadingView({ onClose() {}, onTower() {}, onNavigate() {} });
    for (const section of sections) {
      view.show(section.id);
      const buttons = [...document.querySelectorAll('.plan-hotspots button')];
      assert.equal(buttons.length, floorContent[section.id].rooms.length);
      for (const [index, button] of buttons.entries()) {
        const room = floorContent[section.id].rooms[index];
        const position = planLayouts[section.id].rooms[index];
        assert.equal(button.getAttribute('aria-controls'), `plan-${section.id}-${room.id}`);
        assert.ok(Math.abs(parseFloat(button.style.left) * 12 - position.anchorX) < 1e-6);
        assert.ok(Math.abs(parseFloat(button.style.top) * 8 - position.anchorY) < 1e-6);
        button.click();
        assert.equal(document.activeElement.id, `plan-${section.id}-${room.id}-title`);
      }
      view.close({ focus: false });
    }
  } finally {
    Object.assign(globalThis, previous);
    dom.window.close();
  }
});

test('cap plan segments cannot bridge the empty L recess and furnish every content room', () => {
  for (const section of sections) {
    const cap = createCapPlans(section, -.2);
    for (const face of cap.faces) {
      assert.equal(face.roomCount, floorContent[section.id].rooms.length);
      assert.equal(face.rooms.length, face.roomCount);
      assert.ok(face.rooms.every(room => room.segments > 4), `${section.id}: every numbered room has tangible furniture strokes`);
    }
    for (const layer of cap.group.children) {
      const points = layer.geometry.attributes.position;
      for (let i = 0; i < points.count; i += 2) {
        const height = cap.faces.find(face => Math.abs(face.y - points.getY(i)) < 1e-4).height;
        const polygon = footprint(height);
        for (const t of [.01, .25, .5, .75, .99]) {
          const point = [points.getX(i) * (1 - t) + points.getX(i + 1) * t, points.getZ(i) * (1 - t) + points.getZ(i + 1) * t];
          assert.ok(inside(point, polygon), `${section.id}: each stroke stays on the occupied cut`);
        }
      }
    }
    assert.equal(cap.faces.some(face => face.side === 'top'), section.id !== 'about');
    cap.group.traverse(node => { node.geometry?.dispose(); node.material?.dispose(); });
  }
});
