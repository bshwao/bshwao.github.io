// DOM and camera integration checks. This does not emulate a visual WebGL browser.
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as THREE from '../assets/vendor/three.module.min.js';
import { viewportLayout } from '../assets/spatial-layout.js';
import { floorContent } from '../assets/floor-content.js';

const root = resolve(import.meta.dirname, '..');
const mobile = process.argv.includes('--mobile');
const reduced = process.argv.includes('--reduced');
const deepLink = process.argv.includes('--deep-link');
let viewportWidth = mobile ? 390 : 1280, viewportHeight = mobile ? 844 : 800;
const originalViewport = [viewportWidth, viewportHeight];
const previewURL = 'http://127.0.0.1:4173/?preview=integration';
const dom = new JSDOM(await readFile(resolve(root, 'index.html'), 'utf8'), { url: `${previewURL}${deepLink ? '#projects/b' : ''}`, pretendToBeVisual: true });
const w = dom.window;
const initialTitle = w.document.title;
let clipboardDenied = false;
const copiedURLs = [];
Object.defineProperty(w.navigator, 'clipboard', { value: {
  async writeText(value) {
    if (clipboardDenied) throw new w.DOMException('Clipboard permission denied', 'NotAllowedError');
    copiedURLs.push(value);
  },
} });
let time = 1000, counter = 0;
const frames = new Map();
const resizeObservers = new Set(), motionListeners = new Set();
let motionReduced = reduced;
let lastScene, lastCamera, renders = 0;
class Renderer {
  constructor() { this.domElement = w.document.createElement('canvas'); }
  setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
  render(scene, camera) { scene.updateMatrixWorld(); camera.updateMatrixWorld(); lastScene = scene; lastCamera = camera; renders++; }
}
w.HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, width: viewportWidth, height: viewportHeight, right: viewportWidth, bottom: viewportHeight });
Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get: () => viewportWidth });
Object.defineProperty(w.HTMLElement.prototype, 'clientHeight', { get: () => viewportHeight });
w.HTMLCanvasElement.prototype.setPointerCapture = () => {};
w.HTMLCanvasElement.prototype.releasePointerCapture = () => {};
w.HTMLCanvasElement.prototype.hasPointerCapture = () => false;
w.HTMLElement.prototype.scrollIntoView = () => {};
w.SVGElement.prototype.getBBox = () => ({ x: 205, y: 35, width: 690, height: 1030 });
Object.defineProperty(w.SVGElement.prototype, 'viewBox', { get() { const [x,y,width,height] = (this.getAttribute('viewBox') || '0 0 1100 1220').split(/\s+/).map(Number); return { baseVal: { x,y,width,height } }; } });
w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
w.HTMLDialogElement.prototype.close = function () { this.open = false; };
const raf = callback => { frames.set(++counter, callback); return counter; };
const media = query => ({
  get matches() { return query.includes('reduced-motion') ? motionReduced : query.includes('max-width') ? mobile : false; },
  addEventListener(type, callback) { if (query.includes('reduced-motion')) motionListeners.add(callback); },
  removeEventListener(type, callback) { motionListeners.delete(callback); },
});
w.matchMedia = media;
const context = vm.createContext({
  document: w.document, window: w, navigator: w.navigator, location: w.location, history: w.history,
  devicePixelRatio: 1, innerWidth: viewportWidth, innerHeight: viewportHeight,
  console, setTimeout, clearTimeout, URL, performance: { now: () => time },
  requestAnimationFrame: raf, cancelAnimationFrame: id => frames.delete(id), matchMedia: media,
  ResizeObserver: class { constructor(callback) { this.callback = callback; resizeObservers.add(this); } observe() { this.callback(); } disconnect() { resizeObservers.delete(this); } },
  addEventListener: w.addEventListener.bind(w), removeEventListener: w.removeEventListener.bind(w),
});
const cache = new Map();
const synthetic = new vm.SyntheticModule(Object.keys(THREE), function () {
  for (const [name, value] of Object.entries(THREE)) this.setExport(name, name === 'WebGLRenderer' ? Renderer : value);
}, { context });
async function load(path) {
  if (path.replaceAll('\\', '/').endsWith('vendor/three.module.min.js')) return synthetic;
  if (cache.has(path)) return cache.get(path);
  const module = new vm.SourceTextModule(await readFile(path, 'utf8'), {
    context, identifier: path,
    importModuleDynamically: async (specifier, source) => {
      const imported = await load(resolve(dirname(source.identifier), specifier));
      if (imported.status === 'unlinked') await imported.link(linker);
      if (imported.status === 'linked') await imported.evaluate();
      return imported;
    },
  });
  cache.set(path, module); return module;
}
const linker = (specifier, source) => load(resolve(dirname(source.identifier), specifier));
const settleImports = async () => { for (let i = 0; i < 30; i++) await new Promise(setImmediate); };
const tick = async delta => {
  time += delta;
  const pending = [...frames.values()]; frames.clear();
  for (const callback of pending) callback(time);
  await settleImports();
};
const click = selector => {
  const node = w.document.querySelector(selector);
  assert.ok(node, `Exists: ${selector}`); node.click();
};
function sendMouse(type, x, y, button = 0, pointerType = 'mouse', pointerId = 1) {
  const event = new w.MouseEvent(type, { bubbles: true, cancelable: true, button, buttons: type === 'pointerup' ? 0 : button === 2 ? 2 : 1, clientX: x, clientY: y });
  Object.defineProperties(event, { pointerId: { value: pointerId }, pointerType: { value: pointerType } });
  w.document.querySelector('canvas').dispatchEvent(event);
}
function assertFloorFramed(id) {
  const index = ['about', 'projects', 'experience', 'resume', 'contact'].indexOf(id);
  const root = lastScene.children.find(node => node.isGroup);
  const module = root.children[index];
  const base = module.children[1];
  const points = base.geometry.attributes.position;
  const layout = viewportLayout(viewportWidth, viewportHeight);
  const right = layout.rect.right + 10;
  const bottom = layout.rect.bottom + 10;
  const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
  for (let i = 0; i < points.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(points, i).applyMatrix4(base.matrixWorld).project(lastCamera);
    const x = (point.x + 1) * viewportWidth / 2, y = (1 - point.y) * viewportHeight / 2;
    bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x);
    bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y);
  }
  assert.ok(bounds.left > 8 && bounds.right < right && bounds.top > layout.rect.top - 10 && bounds.bottom < bottom, `${id}: the floor fits beside the content (${JSON.stringify(bounds)})`);
}
const settleCamera = async () => { for (let i = 0; i < 160 && frames.size; i++) await tick(16); };
const resizeTo = async (width, height) => {
  viewportWidth = width; viewportHeight = height;
  context.innerWidth = width; context.innerHeight = height;
  for (const observer of [...resizeObservers]) observer.callback();
  await tick(16);
};
function assertRoomFramed(sectionIndex, roomIndex) {
  const root = lastScene.children.find(node => node.isGroup);
  const zone = root.children[sectionIndex].children[2].children[roomIndex];
  const { rect } = viewportLayout(viewportWidth, viewportHeight);
  zone.traverse(mesh => {
    if (!mesh.isMesh) return;
    const points = mesh.geometry.attributes.position;
    for (let i = 0; i < points.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(points, i).applyMatrix4(mesh.matrixWorld).project(lastCamera);
      const x = (point.x + 1) * viewportWidth / 2, y = (1 - point.y) * viewportHeight / 2;
      assert.ok(x >= rect.left - 1 && x <= rect.right + 1 && y >= rect.top - 1 && y <= rect.bottom + 1, `Room ${roomIndex}: furniture stays in the visible model area (${x.toFixed(1)},${y.toFixed(1)})`);
    }
  });
}
const entry = await load(resolve(root, 'assets/spatial-app.js'));
await entry.link(linker); await entry.evaluate();
for (let i = 0; i < 300 && !w.document.querySelector('#main').dataset.mode; i++) await new Promise(resolve => setTimeout(resolve, 10));
await tick(5);
const main = w.document.querySelector('#main');
assert.ok(main.classList.contains('spatial'), '3D initialization succeeds');
if (deepLink) {
  await settleCamera();
  assert.equal(main.dataset.mode, 'section', 'A fresh room URL opens its interior directly');
  assert.equal(w.location.hash, '#projects/b');
  assert.equal(main.dataset.focusedRoom, '1', 'A fresh room URL focuses the requested room');
  assert.equal(w.document.querySelector('#interior-room-title').textContent, floorContent.projects.rooms[1].title);
  assert.equal(w.document.title, `${floorContent.projects.rooms[1].title} · Projects — Eric Hsu`);
  assertRoomFramed(1, 1);
  w.history.pushState(null, '', '#tower'); w.dispatchEvent(new w.HashChangeEvent('hashchange'));
  await tick(2000);
}
assert.equal(main.dataset.transition, 'idle');
assert.equal(main.dataset.mode, 'tower');
assert.equal(w.document.title, initialTitle, 'The opening tower restores the page title');
const towerPoint = new THREE.Vector3(0, 53, 0).project(lastCamera);
const towerX = (towerPoint.x + 1) * viewportWidth / 2, towerY = (1 - towerPoint.y) * viewportHeight / 2;
sendMouse('pointerdown', towerX, towerY); sendMouse('pointermove', towerX + 30, towerY); sendMouse('pointermove', towerX, towerY); sendMouse('pointerup', towerX, towerY);
assert.equal(main.dataset.mode, 'tower', 'Dragging away and back does not count as a click');
sendMouse('pointerdown', towerX, towerY, 0, 'touch', 7); sendMouse('pointerdown', towerX + 40, towerY, 0, 'touch', 8);
sendMouse('pointerup', towerX, towerY, 0, 'touch', 7); sendMouse('pointerup', towerX + 40, towerY, 0, 'touch', 8);
assert.equal(main.dataset.mode, 'tower', 'A two-finger gesture never counts as a section selection');
sendMouse('pointerdown', towerX, towerY); sendMouse('pointerup', towerX, towerY);
w.document.querySelector('canvas').dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: towerX, clientY: towerY }));
assert.equal(w.location.hash, '#explore', 'The browser click following a canvas tap cannot override the tower selection');
await tick(550);
assert.equal(main.dataset.transition, reduced ? 'idle' : 'moving');
const middle = lastCamera.position.clone();
await tick(900);
assert.equal(main.dataset.mode, 'explore');
assert.equal(main.dataset.transition, 'idle');
if (!reduced) assert.ok(middle.distanceTo(lastCamera.position) > 1, 'Camera moves throughout expansion');

// Exercise the actual vendored OrbitControls using right-button pointer events.
const canvas = w.document.querySelector('canvas');
const sendPointer = (type, x, y) => sendMouse(type, x, y, 2);
const angle = Number(main.dataset.azimuth);
sendPointer('pointerdown', viewportWidth * .4, 400); sendPointer('pointermove', viewportWidth * .6, 430); sendPointer('pointerup', viewportWidth * .6, 430);
for (let i = 0; i < 12; i++) await tick(16);
assert.ok(Math.abs(Number(main.dataset.azimuth) - angle) > .1, 'RMB drag orbits the real camera');
const contextMenu = new w.MouseEvent('contextmenu', { cancelable: true });
canvas.dispatchEvent(contextMenu); assert.ok(contextMenu.defaultPrevented, 'Browser context menu is suppressed on the canvas');
if (mobile) {
  const before = Number(main.dataset.azimuth);
  sendMouse('pointerdown', 140, 270, 0, 'touch', 2); sendMouse('pointermove', 200, 290, 0, 'touch', 2); sendMouse('pointerup', 200, 290, 0, 'touch', 2);
  for (let i = 0; i < 12; i++) await tick(16);
  assert.ok(Math.abs(Number(main.dataset.azimuth) - before) > .1, 'One finger rotates without opening a section');
  assert.equal(main.dataset.mode, 'explore');
}

click('[data-section="about"]'); await tick(600);
assert.equal(main.dataset.transition, reduced ? 'idle' : 'moving');
if (!reduced) {
  const entryModule = lastScene.children.find(node => node.isGroup).children[0];
  const shell = entryModule.children[0].children.find(node => node.isMesh);
  const visibleHeight = shell.material.clippingPlanes[0].constant - entryModule.position.y;
  assert.ok(visibleHeight > 30, 'Entry approaches the section before opening its facade');
  assert.equal(Number(main.style.getPropertyValue('--interior-progress')), 0, 'The reading panel follows the architectural approach');
}
await tick(1400);
assert.equal(main.dataset.mode, 'section'); assert.equal(main.dataset.transition, 'idle');
assert.equal(canvas.dataset.section, 'about');
assertFloorFramed('about');
assert.ok(w.document.querySelector('#interior-content').textContent.includes('Eric Hsu'));
const previewButton = w.document.querySelector('#station-navigation [data-station="2"]');
previewButton.dispatchEvent(new w.MouseEvent('pointerover', { bubbles: true })); await tick(16);
assert.equal(main.dataset.hoveredRoom, '2', 'Room names preview the matching 3D furniture');
assert.equal(w.document.querySelector('#station-markers [data-station="2"]').dataset.hovered, 'true', 'Projected markers mirror room hover');
assert.ok(w.document.querySelector('#spatial-hint').textContent.includes('EXPLORE ROOM 03'));
previewButton.dispatchEvent(new w.MouseEvent('pointerout', { bubbles: true, relatedTarget: w.document.querySelector('#reading-view') })); await tick(16);
assert.equal(main.dataset.hoveredRoom, '', 'Room preview clears when the pointer leaves');
previewButton.focus(); await tick(16);
assert.equal(main.dataset.hoveredRoom, '2', 'Keyboard focus offers the same room preview');
w.document.querySelector('#reading-view').focus(); await tick(16);
assert.equal(main.dataset.hoveredRoom, '', 'Moving keyboard focus clears the preview');
// Pick real room geometry, then bubble the click a browser emits after pointerup.
const aboutRooms = lastScene.children.find(node => node.isGroup).children[0].children[2].children.slice(0, 4);
const roomMeshes = aboutRooms.flatMap(room => room.children.filter(node => node.isMesh));
const chosenMesh = aboutRooms[2].children.find(node => node.isMesh);
let furniturePoint;
for (let i = 0; i < chosenMesh.geometry.attributes.position.count && !furniturePoint; i += 3) {
  const point = [0, 1, 2].map(offset => new THREE.Vector3().fromBufferAttribute(chosenMesh.geometry.attributes.position, i + offset).applyMatrix4(chosenMesh.matrixWorld)).reduce((sum, vertex) => sum.add(vertex), new THREE.Vector3()).multiplyScalar(1 / 3);
  const found = new THREE.Raycaster(lastCamera.position, point.clone().sub(lastCamera.position).normalize()).intersectObjects(roomMeshes)[0];
  if (found?.object.userData.roomIndex === 2) furniturePoint = point.project(lastCamera);
}
assert.ok(furniturePoint, 'The room has a visible selectable furniture surface');
const furnitureX = (furniturePoint.x + 1) * viewportWidth / 2, furnitureY = (1 - furniturePoint.y) * viewportHeight / 2;
sendMouse('pointerdown', furnitureX, furnitureY); sendMouse('pointerup', furnitureX, furnitureY);
canvas.dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: furnitureX, clientY: furnitureY }));
await tick(240);
assert.equal(lastScene.children.find(node => node.isGroup).children.slice(0, 5).filter(node => node.visible).length, 1, 'Other tower sections stay hidden throughout a room close-up');
assert.equal(w.location.hash, '#about/c', 'Room selection has a stable shareable URL');
assert.equal(w.document.title, `${floorContent.about.rooms[2].title} · About — Eric Hsu`);
assert.ok(w.document.querySelector('#interior-content').textContent.includes('Piano'));
assert.equal(w.document.querySelector('#station-markers [data-station="2"]').getAttribute('aria-pressed'), 'true');
await tick(800);
assert.equal(canvas.dataset.focusedRoom, '2');
assertRoomFramed(0, 2);
assert.equal(main.dataset.cameraMotion, 'idle');
assert.equal(w.document.querySelector('#floor-overview').disabled, false);
const about = lastScene.children.find(node => node.isGroup).children[0].children[2];
assert.equal(about.children[2].children[0].children[0].material.color.getHexString(), '174d91', 'The selected room has a stronger 3D outline');
click('#share-room'); await settleImports();
assert.equal(copiedURLs.at(-1), `${previewURL}#about/c`, 'Copy link preserves origin, path, search, and the exact room');
assert.equal(w.document.querySelector('#share-status').textContent, 'Link copied.');
assert.equal(w.document.querySelector('#share-url').hidden, true);
clipboardDenied = true;
click('#share-room'); await settleImports();
const manualLink = w.document.querySelector('#share-url');
assert.equal(manualLink.hidden, false, 'Denied clipboard access exposes a selectable link');
assert.equal(manualLink.readOnly, true);
assert.equal(manualLink.value, `${previewURL}#about/c`);
assert.equal(w.document.activeElement, manualLink);
assert.equal(manualLink.selectionStart, 0);
assert.equal(manualLink.selectionEnd, manualLink.value.length);
assert.equal(w.document.querySelector('#share-status').textContent, 'Copy this link:');
clipboardDenied = false;
click('#station-navigation [data-station="1"]'); await tick(200);
assert.equal(manualLink.hidden, true, 'Changing the route clears the manual copy field');
assert.equal(w.document.querySelector('#share-status').textContent, '');
click('#station-navigation [data-station="3"]'); await tick(800);
assert.equal(canvas.dataset.focusedRoom, '3', 'Rapid room changes keep the most recent camera destination');
assertRoomFramed(0, 3);
w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await tick(800);
assert.equal(main.dataset.mode, 'section', 'Escape from a close view stays on this floor');
assert.equal(canvas.dataset.focusedRoom, '');
assert.equal(w.location.hash, '#about', 'Escape from a room returns to its floor URL');
assert.equal(w.document.title, 'About — Eric Hsu');
assert.equal(w.document.querySelector('#interior-room-title').textContent, floorContent.about.rooms[3].title, 'The floor overview preserves the selected room content');
assertFloorFramed('about');
const station = w.document.querySelector('#station-navigation [data-station="3"]');
station.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })); await tick(800);
assert.equal(canvas.dataset.focusedRoom, '2', 'Room navigation works with arrow keys');
click('#floor-overview'); await tick(800);
assert.equal(canvas.dataset.focusedRoom, '');
assert.equal(w.location.hash, '#about', 'Whole floor removes the room from the URL');
assert.equal(w.document.querySelector('#interior-room-title').textContent, floorContent.about.rooms[2].title, 'Whole floor preserves the selected room content');
click('#share-room'); await settleImports();
assert.equal(copiedURLs.at(-1), `${previewURL}#about`, 'Whole floor has its own shareable URL');
assertFloorFramed('about');

// Resize must preserve an orbit rather than resetting it to the opening angle.
sendPointer('pointerdown', viewportWidth * .4, 300); sendPointer('pointermove', viewportWidth * .55, 340); sendPointer('pointerup', viewportWidth * .55, 340);
await settleCamera();
const preservedAzimuth = Number(main.dataset.azimuth), preservedPolar = Number(main.dataset.polar);
await resizeTo(viewportWidth - 30, viewportHeight - 80);
assert.ok(Math.abs(Number(main.dataset.azimuth) - preservedAzimuth) <= .002, 'Resize preserves the chosen azimuth');
assert.ok(Math.abs(Number(main.dataset.polar) - preservedPolar) <= .002, 'Resize preserves the chosen elevation');
click('#station-navigation [data-station="1"]'); await tick(240);
await resizeTo(mobile ? 650 : 844, 390); await tick(800);
assert.equal(canvas.dataset.focusedRoom, '1', 'A resize can interrupt a room flight safely');
assertRoomFramed(0, 1);
await resizeTo(0, 0);
assert.ok(lastCamera.position.toArray().every(Number.isFinite), 'A temporarily hidden viewport cannot corrupt the camera');
await resizeTo(...originalViewport);
click('#floor-overview'); await tick(800);
await settleCamera();
const idleRenders = renders; await tick(500);
assert.equal(renders, idleRenders, 'An idle scene stops rendering');

// Move between all interior models and check the document/source links.
for (const id of ['projects', 'experience', 'resume', 'contact']) {
  w.history.pushState(null, '', `#${id}`); w.dispatchEvent(new w.HashChangeEvent('hashchange'));
  await tick(2000);
  assert.equal(canvas.dataset.section, id); assert.equal(main.dataset.transition, 'idle');
  assert.equal(w.document.querySelector('#complete-portfolio').getAttribute('href'), `./reading.html#${id === 'resume' ? 'education' : id}`, 'The complete portfolio opens the corresponding reading section');
  assertFloorFramed(id);
  assert.ok(w.document.querySelector('#interior-content').textContent.trim().length > 40);
  const count = w.document.querySelectorAll('#station-navigation button').length;
  for (let i = 0; i < count; i++) {
    click(`#station-navigation [data-station="${i}"]`); await tick(800);
    assert.equal(w.location.hash, `#${id}/${floorContent[id].rooms[i].id}`);
    assertRoomFramed(['about', 'projects', 'experience', 'resume', 'contact'].indexOf(id), i);
  }
  click('#floor-overview'); await tick(800);
}
click('#station-navigation [data-station="3"]');
assert.equal(w.document.querySelector('#interior-content a[download]').getAttribute('href'), './assets/eric-hsu-resume.pdf');

// Cancel an entry halfway through, then collapse halfway through its return.
click('#back-to-structure'); await tick(1600);
click('[data-section="projects"]'); await tick(400);
w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await tick(450);
w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await tick(1700);
assert.equal(main.dataset.mode, 'tower'); assert.equal(main.dataset.transition, 'idle');
assert.equal(canvas.dataset.section, '');
const before = Number(main.dataset.azimuth);
canvas.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })); await tick(16);
assert.notEqual(Number(main.dataset.azimuth), before, 'Keyboard rotation works after interrupted transitions');

// A system motion preference change finishes an in-progress flight immediately.
w.history.pushState(null, '', '#about'); w.dispatchEvent(new w.HashChangeEvent('hashchange')); await tick(100);
motionReduced = true; for (const callback of [...motionListeners]) callback(); await tick(16);
assert.equal(main.dataset.transition, 'idle', 'Enabling reduced motion ends the current camera flight');
motionReduced = reduced; for (const callback of [...motionListeners]) callback();

// Browser history and direct deep links share the same route handler.
w.history.pushState(null, '', '#projects/b'); w.dispatchEvent(new w.PopStateEvent('popstate')); await settleCamera();
assert.equal(canvas.dataset.section, 'projects');
assert.equal(canvas.dataset.focusedRoom, '1', 'History restoration recovers the exact room camera');
assert.equal(w.document.querySelector('#station-navigation [data-station="1"]').getAttribute('aria-pressed'), 'true');
assert.equal(w.document.querySelector('#interior-room-title').textContent, floorContent.projects.rooms[1].title);
assert.equal(w.document.title, `${floorContent.projects.rooms[1].title} · Projects — Eric Hsu`);
w.document.querySelector('#interior-room-title').focus();
w.history.pushState(null, '', '#projects/c'); w.dispatchEvent(new w.HashChangeEvent('hashchange')); await tick(800);
assert.equal(canvas.dataset.focusedRoom, '2', 'A room hash change updates the current floor without re-entering it');
assert.equal(w.document.querySelector('#interior-room-title').textContent, floorContent.projects.rooms[2].title);
assert.equal(w.document.activeElement, w.document.querySelector('#interior-room-title'), 'Replacing focused content keeps focus on the new room heading');
w.history.pushState(null, '', '#resume/d'); w.dispatchEvent(new w.PopStateEvent('popstate')); await settleCamera();
assert.equal(canvas.dataset.section, 'resume');
assert.equal(canvas.dataset.focusedRoom, '3');
assert.equal(w.location.hash, '#resume/d');
assert.ok(w.document.querySelector('a[download]'));
if (mobile) {
  const loss = new w.Event('webglcontextlost', { cancelable: true }); canvas.dispatchEvent(loss);
  assert.ok(loss.defaultPrevented, 'Context loss is handled by the reading fallback');
} else click('#reading-view');
for (let i = 0; i < 300 && !w.document.querySelector('#tower-art svg'); i++) await new Promise(resolve => setTimeout(resolve, 10));
await tick(5); await tick(5); await settleImports();
for (let i = 0; i < 30 && w.document.activeElement !== w.document.querySelector('#plan-resume-d h3'); i++) {
  await new Promise(resolve => setTimeout(resolve, 5)); await tick(16);
}
assert.ok(!main.classList.contains('spatial'), 'Reading view restores the previous accessible experience');
assert.ok(w.document.querySelector('#tower-art svg'), 'The SVG fallback is intact');
assert.equal(w.location.hash, '#resume/d', 'Reading fallback preserves the incoming room URL');
assert.equal(w.document.querySelector('#room-title').textContent, 'Résumé', 'Reading fallback opens the section from a nested room URL');
assert.equal(w.document.querySelector('#room-dialog').open, true);
assert.ok(w.document.querySelector('#plan-resume-d a[download]'), 'The requested section still exposes its résumé download');
assert.equal(w.document.activeElement, w.document.querySelector('#plan-resume-d h3'), 'Reading fallback focuses the exact room from the nested URL');
assert.equal(w.document.title, `${floorContent.resume.rooms[3].title} · Résumé — Eric Hsu`);
assert.equal(canvas.isConnected, false, 'The old canvas is removed during fallback');
assert.equal(motionListeners.size, 0, 'Media preference listeners are cleaned up');
console.log(`DOM/camera integration passed (${mobile ? 'mobile' : reduced ? 'reduced motion' : deepLink ? 'fresh room link' : 'desktop'}): room URLs, titles, clipboard/manual sharing, reading links, room flights, highlighting, RMB/touch, resize, framing, gestures, history, cancellation, keyboard, idle rendering, motion preferences, and nested-link fallback (${renders} frames).`);
dom.window.close();

