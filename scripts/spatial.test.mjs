// DOM and camera integration checks. This does not emulate a visual WebGL browser.
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as THREE from '../assets/vendor/three.module.min.js';
import { viewportLayout } from '../assets/spatial-layout.js';
import { floorContent } from '../assets/floor-content.js';
import { sections } from '../assets/tower-geometry.js';
import { sectionColors } from '../assets/color-theme.js';

const root = resolve(import.meta.dirname, '..');
const mobile = process.argv.includes('--mobile');
const reduced = process.argv.includes('--reduced');
const deepLink = process.argv.includes('--deep-link');
const unavailable = process.argv.includes('--no-webgl');
let viewportWidth = mobile ? 390 : 1280, viewportHeight = mobile ? 844 : 800;
const originalViewport = [viewportWidth, viewportHeight];
const previewURL = 'http://127.0.0.1:4173/?preview=integration';
const dom = new JSDOM(await readFile(resolve(root, 'index.html'), 'utf8'), { url: `${previewURL}${deepLink ? '#projects/b' : ''}`, pretendToBeVisual: true });
const w = dom.window;
let pageHidden = false;
Object.defineProperty(w.document, 'hidden', { get: () => pageHidden });
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
  constructor() { if (unavailable) throw new Error('WebGL unavailable'); this.domElement = w.document.createElement('canvas'); }
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
function assertFloorFramed(id, stage = 'settled') {
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
  assert.ok(bounds.left > 8 && bounds.right < right && bounds.top > layout.rect.top - 10 && bounds.bottom < bottom, `${id} (${stage}): the floor fits beside the content (${JSON.stringify(bounds)})`);
}
const settleCamera = async () => { for (let i = 0; i < 160 && frames.size; i++) await tick(16); };
const resizeTo = async (width, height) => {
  viewportWidth = width; viewportHeight = height;
  context.innerWidth = width; context.innerHeight = height;
  for (const observer of [...resizeObservers]) observer.callback();
  await tick(16);
};
function assertRoomFramed(sectionIndex, roomIndex, stage = 'settled') {
  const root = lastScene.children.find(node => node.isGroup);
  const zone = root.children[sectionIndex].children[2].children[roomIndex];
  const { rect } = viewportLayout(viewportWidth, viewportHeight);
  const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity, near: Infinity, far: -Infinity };
  zone.traverse(mesh => {
    if (!mesh.isMesh) return;
    const points = mesh.geometry.attributes.position;
    for (let i = 0; i < points.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(points, i).applyMatrix4(mesh.matrixWorld).project(lastCamera);
      const x = (point.x + 1) * viewportWidth / 2, y = (1 - point.y) * viewportHeight / 2;
      bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x);
      bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y);
      bounds.near = Math.min(bounds.near, point.z); bounds.far = Math.max(bounds.far, point.z);
    }
  });
  assert.ok(bounds.left >= rect.left - 1 && bounds.right <= rect.right + 1 && bounds.top >= rect.top - 1 && bounds.bottom <= rect.bottom + 1 && bounds.near > -1 && bounds.far < 1,
    `${sections[sectionIndex].id} room ${roomIndex} (${stage}): furniture stays in the visible model area (${JSON.stringify(bounds)})`);
}
async function sampleRoomFlight(sectionIndex, roomIndex) {
  for (const progress of [.25, .5, .75]) {
    await tick(190);
    assertRoomFramed(sectionIndex, roomIndex, `${progress * 100}% of room flight`);
  }
  await tick(230);
}
async function sampleSectionEntry(id) {
  await tick(1387.5);
  assertFloorFramed(id, '75% of section entry');
  await tick(277.5);
  assertFloorFramed(id, '90% of section entry');
  await tick(335);
}
const entry = await load(resolve(root, 'assets/spatial-app.js'));
await entry.link(linker); await entry.evaluate();
for (let i = 0; i < 300 && !w.document.querySelector('#main').dataset.mode && !w.document.querySelector('#main').classList.contains('unavailable'); i++) await new Promise(resolve => setTimeout(resolve, 10));
await tick(5);
const main = w.document.querySelector('#main');
if (unavailable) {
  assert.ok(main.classList.contains('unavailable'));
  assert.equal(w.document.querySelector('#unavailable-portfolio').getAttribute('href'), './reading.html');
  assert.equal(w.document.activeElement.id, 'unavailable-title');
  assert.equal(w.document.querySelector('canvas'), null);
  assert.equal(frames.size, 0);
  console.log('Initial WebGL failure passes: complete reading portfolio remains accessible without a canvas or render loop.');
  dom.window.close(); process.exit(0);
}
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
assert.equal(lastScene.getObjectByName('district-buildings').visible, true, 'The opening view includes the surrounding district buildings');
assert.equal(lastScene.getObjectByName('district-character').visible, true, 'The opening view includes the landscaped district');
assert.equal(lastScene.getObjectByName('district-contact-shadows').visible, true, 'The opening city includes its contact shading');
assert.equal(w.document.querySelector('canvas').dataset.detail, mobile ? 'compact' : 'full');
const cityDepthReferences = [];
lastScene.traverse(node => { if (node.material?.userData.districtDepth) cityDepthReferences.push(node.material.userData.districtDepth); });
assert.ok(cityDepthReferences.length > 0 && cityDepthReferences.every(reference => reference.value === cityDepthReferences[0].value && Number.isFinite(reference.value) && reference.value > 0), 'City layers share a finite camera-relative fading distance');
assert.ok(sections.every(section => !lastScene.getObjectByName(`cap-plans-${section.id}`).visible), 'Assembled tower hides the cap plans');
assert.equal(w.document.querySelector('#reading-view').hidden, true, 'Reading mode is unavailable on the tower');
assert.equal(w.document.title, initialTitle, 'The opening tower restores the page title');
// At street level a solid foreground building must block the tower behind it.
const outdoorCanvas = w.document.querySelector('canvas');
const cameraKey = key => outdoorCanvas.dispatchEvent(new w.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
for (let i = 0; i < 6; i++) { cameraKey('ArrowDown'); await tick(16); }
const towerMeshes = lastScene.children.find(node => node.isGroup).children.slice(0, 5).flatMap(module => module.children[0].children.filter(node => node.isMesh));
const sceneryMeshes = ['district-buildings', 'district-character'].flatMap(name => lastScene.getObjectByName(name).children.filter(node => node.isMesh));
let blockedPoint;
for (let i = 0; i < 49 && !blockedPoint; i++) {
  for (const height of [2, 5, 9]) {
    const point = new THREE.Vector3(0, height, 0);
    const ray = new THREE.Raycaster(lastCamera.position, point.clone().sub(lastCamera.position).normalize());
    const towerHit = ray.intersectObjects(towerMeshes)[0], obstacle = ray.intersectObjects(sceneryMeshes)[0];
    if (towerHit && obstacle && obstacle.distance < towerHit.distance - .01) { blockedPoint = point.project(lastCamera); break; }
  }
  if (!blockedPoint) { cameraKey('ArrowRight'); await tick(16); }
}
assert.ok(blockedPoint, 'The street-level orbit includes an occluded tower surface');
const blockedX = (blockedPoint.x + 1) * viewportWidth / 2, blockedY = (1 - blockedPoint.y) * viewportHeight / 2;
sendMouse('pointerdown', blockedX, blockedY); sendMouse('pointerup', blockedX, blockedY);
assert.equal(main.dataset.mode, 'tower', 'Solid scenery cannot select the tower through its walls');
click('#reset-spatial'); await settleCamera();
const towerPoint = new THREE.Vector3(0, 53, 0).project(lastCamera);
const towerX = (towerPoint.x + 1) * viewportWidth / 2, towerY = (1 - towerPoint.y) * viewportHeight / 2;
sendMouse('pointerdown', towerX, towerY); sendMouse('pointermove', towerX + 30, towerY); sendMouse('pointermove', towerX, towerY); sendMouse('pointerup', towerX, towerY);
assert.equal(main.dataset.mode, 'tower', 'Dragging away and back does not count as a click');
sendMouse('pointerdown', towerX, towerY, 0, 'touch', 7); sendMouse('pointerdown', towerX + 40, towerY, 0, 'touch', 8);
sendMouse('pointerup', towerX, towerY, 0, 'touch', 7); sendMouse('pointerup', towerX + 40, towerY, 0, 'touch', 8);
assert.equal(main.dataset.mode, 'tower', 'A two-finger gesture never counts as a section selection');
click('#reset-spatial'); await settleCamera();
const openingPosition = lastCamera.position.clone();
sendMouse('pointerdown', towerX, towerY); sendMouse('pointerup', towerX, towerY);
w.document.querySelector('canvas').dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: towerX, clientY: towerY }));
assert.equal(w.location.hash, '#explore', 'The browser click following a canvas tap cannot override the tower selection');
await tick(550);
assert.equal(main.dataset.transition, reduced ? 'idle' : 'moving');
const middle = lastCamera.position.clone();
await tick(900);
assert.equal(main.dataset.mode, 'explore');
assert.ok(lastScene.getObjectByName('building-outlines').material.opacity < .3, 'Surrounding buildings recede while choosing a section');
assert.ok(lastScene.getObjectByName('district-detail-ink').material.opacity < .25, 'Landscaping recedes while choosing a section');
assert.ok(sections.every(section => lastScene.getObjectByName(`cap-plans-${section.id}`).visible), 'Expansion reveals all cut-face plans');
assert.equal(w.document.querySelector('#reading-view').hidden, true, 'Reading mode is unavailable on the expanded tower');
assert.equal(main.dataset.transition, 'idle');
if (!reduced) assert.ok(middle.distanceTo(lastCamera.position) > 1, 'Camera moves throughout expansion');

// Exercise the actual vendored OrbitControls using left-button pointer events.
const canvas = w.document.querySelector('canvas');
const sendPointer = (type, x, y) => sendMouse(type, x, y, 0);
const angle = Number(main.dataset.azimuth);
sendPointer('pointerdown', viewportWidth * .4, 400); sendPointer('pointermove', viewportWidth * .6, 430); sendPointer('pointerup', viewportWidth * .6, 430);
for (let i = 0; i < 12; i++) await tick(16);
assert.ok(Math.abs(Number(main.dataset.azimuth) - angle) > .1, 'Left-button drag orbits the real camera');
assert.equal(w.location.hash, '#explore', 'Orbiting does not select a section');
const contextMenu = new w.MouseEvent('contextmenu', { cancelable: true });
canvas.dispatchEvent(contextMenu); assert.ok(contextMenu.defaultPrevented, 'Browser context menu is suppressed on the canvas');
if (mobile) {
  const before = Number(main.dataset.azimuth);
  sendMouse('pointerdown', 140, 270, 0, 'touch', 2); sendMouse('pointermove', 200, 290, 0, 'touch', 2); sendMouse('pointerup', 200, 290, 0, 'touch', 2);
  for (let i = 0; i < 12; i++) await tick(16);
  assert.ok(Math.abs(Number(main.dataset.azimuth) - before) > .1, 'One finger rotates without opening a section');
  assert.equal(main.dataset.mode, 'explore');
}

await settleCamera();
const depthBeforeZoom = cityDepthReferences[0].value;
cameraKey('-'); await settleCamera();
assert.ok(Math.abs(cityDepthReferences[0].value / depthBeforeZoom - 1 / .9) < .002, 'Atmospheric depth follows zoom instead of washing out at a fixed camera distance');
const savedOutdoorPosition = lastCamera.position.clone(), savedOutdoorRotation = lastCamera.quaternion.clone();
await resizeTo(320, 568); await settleCamera();
assert.equal(w.document.querySelector('#tower-labels').dataset.layout, 'dock', 'Portrait exposes every section in a fixed dock');
await resizeTo(650, 390); await settleCamera();
assert.equal(w.document.querySelector('#tower-labels').dataset.layout, 'compact', 'Short landscape screens use compact section labels');
assert.equal(canvas.dataset.detail, 'compact', 'Landscape phones keep the lighter drawing budget');
await resizeTo(...originalViewport); await settleCamera();
assert.ok(lastCamera.position.distanceTo(savedOutdoorPosition) < .02, 'Outdoor resize round trips preserve orbit and relative zoom');

click('[data-section="about"]'); await tick(600);
assert.equal(main.dataset.transition, reduced ? 'idle' : 'moving');
if (!reduced) {
  const entryModule = lastScene.children.find(node => node.isGroup).children[0];
  const shell = entryModule.children[0].children.find(node => node.isMesh);
  const visibleHeight = shell.material.clippingPlanes[0].constant - entryModule.position.y;
  assert.ok(visibleHeight > 30, 'Entry approaches the section before opening its facade');
  assert.equal(Number(main.style.getPropertyValue('--interior-progress')), 0, 'The reading panel follows the architectural approach');
}
assert.equal(lastScene.getObjectByName('district-buildings').visible, false, 'City buildings clear before the facade opens');
assert.equal(lastScene.getObjectByName('district-character').visible, false, 'City furnishings clear before the facade opens');
assert.equal(lastScene.getObjectByName('district-contact-shadows').visible, false, 'Ground washes clear before the facade opens');
await tick(787.5);
assertFloorFramed('about', '75% of section entry'); // The facade has almost fully cut away.
await tick(277.5);
assertFloorFramed('about', '90% of section entry'); // Inspect the visible cut before settling.
await tick(335);
assert.equal(main.dataset.mode, 'section'); assert.equal(main.dataset.transition, 'idle');
assert.equal(canvas.dataset.section, 'about');
assert.equal(lastScene.getObjectByName('blueprint-district').visible, false, 'The district clears away for interior reading');
assert.equal(lastScene.getObjectByName('district-buildings').visible, false, 'District buildings clear away before interior reading');
assert.equal(lastScene.getObjectByName('district-character').visible, false, 'Landscaping and test vehicles clear away before interior reading');
assert.equal(lastScene.getObjectByName('cap-plans-about').visible, false, 'The cap drawing clears before the furnished interior is read');
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
await tick(190);
assertRoomFramed(0, 2, '25% of overview-to-room flight');
assert.equal(lastScene.children.find(node => node.isGroup).children.slice(0, 5).filter(node => node.visible).length, 1, 'Other tower sections stay hidden throughout a room close-up');
assert.equal(w.location.hash, '#about/c', 'Room selection has a stable shareable URL');
assert.equal(w.document.title, `${floorContent.about.rooms[2].title} · About — Eric Hsu`);
assert.ok(w.document.querySelector('#interior-content').textContent.includes('Piano'));
assert.equal(w.document.querySelector('#station-markers [data-station="2"]').getAttribute('aria-pressed'), 'true');
await tick(190);
assertRoomFramed(0, 2, '50% of overview-to-room flight');
await tick(190);
assertRoomFramed(0, 2, '75% of overview-to-room flight');
await tick(470);
assert.equal(canvas.dataset.focusedRoom, '2');
assertRoomFramed(0, 2);
assert.equal(main.dataset.cameraMotion, 'idle');
assert.equal(w.document.querySelector('#floor-overview').disabled, false);
const about = lastScene.children.find(node => node.isGroup).children[0].children[2];
assert.equal(about.children[2].children[0].children[0].material.color.getHexString(), sectionColors.about.ink.slice(1), 'The selected room has a stronger 3D outline');
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
click('#station-navigation [data-station="3"]'); await sampleRoomFlight(0, 3);
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
click('#station-navigation [data-station="1"]'); await tick(100);
pageHidden = true; w.document.dispatchEvent(new w.Event('visibilitychange'));
const hiddenRenders = renders; await tick(2000);
assert.equal(renders, hiddenRenders, 'Hidden tabs suspend rendering even during a room flight');
pageHidden = false; w.document.dispatchEvent(new w.Event('visibilitychange')); await settleCamera();
assert.equal(canvas.dataset.focusedRoom, '1', 'Visibility restoration safely completes the pending room flight');
assertRoomFramed(0, 1);
click('#floor-overview'); await settleCamera();

click('#back-to-structure'); await settleCamera();
assert.ok(lastCamera.position.distanceTo(savedOutdoorPosition) < .02, 'Leaving an interior restores the expanded view after viewport changes');
assert.ok(lastCamera.quaternion.angleTo(savedOutdoorRotation) < .001, 'Leaving an interior restores the expanded viewing angle');
w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await settleCamera();
assert.ok(lastCamera.position.distanceTo(openingPosition) < .02, 'Collapsing restores the independent assembled city camera');
click('#unfold-structure'); await settleCamera();
assert.ok(lastCamera.position.distanceTo(savedOutdoorPosition) < .02, 'Unfolding restores the previous expanded orbit and zoom');

// Move between all interior models and check the document/source links.
for (const id of ['projects', 'experience', 'resume', 'contact']) {
  w.history.pushState(null, '', `#${id}`); w.dispatchEvent(new w.HashChangeEvent('hashchange'));
  await sampleSectionEntry(id);
  assert.equal(canvas.dataset.section, id); assert.equal(main.dataset.transition, 'idle');
  assert.equal(w.document.querySelector('#complete-portfolio').getAttribute('href'), `./reading.html#${id === 'resume' ? 'education' : id}`, 'The complete portfolio opens the corresponding reading section');
  assertFloorFramed(id);
  assert.ok(w.document.querySelector('#interior-content').textContent.trim().length > 40);
  const count = w.document.querySelectorAll('#station-navigation button').length;
  for (let i = 0; i < count; i++) {
    click(`#station-navigation [data-station="${i}"]`);
    await sampleRoomFlight(['about', 'projects', 'experience', 'resume', 'contact'].indexOf(id), i);
    assert.equal(w.location.hash, `#${id}/${floorContent[id].rooms[i].id}`);
    if (id === 'projects') assert.equal(w.document.querySelector('#complete-portfolio').getAttribute('href'), `./reading.html#project-${floorContent.projects.rooms[i].projectId}`, 'Each project opens its own complete case study');
    assertRoomFramed(['about', 'projects', 'experience', 'resume', 'contact'].indexOf(id), i);
  }
  click('#floor-overview'); await tick(800);
}
if (mobile) {
  // Actual furniture projections in the short landscape layout, including all
  // three intermediate flight samples, supplement the portrait phone pass.
  await resizeTo(650, 390); await settleCamera();
  for (const [sectionIndex, { id }] of sections.entries()) {
    w.history.pushState(null, '', `#${id}`); w.dispatchEvent(new w.HashChangeEvent('hashchange'));
    await sampleSectionEntry(id);
    assertFloorFramed(id);
    for (let roomIndex = 0; roomIndex < floorContent[id].rooms.length; roomIndex++) {
      click(`#station-navigation [data-station="${roomIndex}"]`);
      await sampleRoomFlight(sectionIndex, roomIndex);
      assertRoomFramed(sectionIndex, roomIndex);
    }
    click('#floor-overview'); await tick(800);
  }
  await resizeTo(...originalViewport); await settleCamera();
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
assert.equal(lastScene.getObjectByName('blueprint-district').visible, true, 'Returning to the tower restores the district');
assert.equal(lastScene.getObjectByName('district-buildings').visible, true, 'Cancelled flights restore the surrounding buildings');
assert.equal(lastScene.getObjectByName('district-character').visible, true, 'Cancelled flights restore landscaping and workshop details');
assert.equal(lastScene.getObjectByName('district-contact-shadows').visible, true, 'Cancelled flights restore the ground washes');
assert.ok(sections.every(section => !lastScene.getObjectByName(`cap-plans-${section.id}`).visible), 'Interrupted entry and collapse cannot leave cap plans floating over the assembled tower');
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
// Reading mode is a reversible section overlay; it never replaces the live 3D scene.
assert.equal(w.document.querySelector('#reading-view').hidden, false);
const readingCamera = lastCamera.position.clone();
click('#reading-view');
const dialog = w.document.querySelector('#room-dialog');
assert.equal(dialog.open, true);
assert.ok(main.classList.contains('spatial'));
assert.equal(w.document.querySelector('canvas'), canvas, 'Reading mode retains the same 3D canvas');
assert.equal(w.document.querySelector('#tower-art'), null, 'No legacy SVG tower exists');
assert.equal(w.location.hash, '#resume/d');
assert.equal(w.document.querySelector('#room-title').textContent, 'Résumé');
assert.ok(w.document.querySelector('#plan-resume-d a[download]'));
assert.equal(w.document.activeElement, w.document.querySelector('#plan-resume-d h3'), 'Reading mode focuses the linked room');
assert.equal(w.document.title, `${floorContent.resume.rooms[3].title} · Résumé — Eric Hsu`);
click('#close-room');
assert.equal(dialog.open, false);
assert.equal(w.document.activeElement, w.document.querySelector('#reading-view'));
assert.equal(w.location.hash, '#resume/d', 'Returning to 3D preserves the room URL');
assert.equal(lastCamera.position.distanceTo(readingCamera), 0, 'Toggling the view preserves the camera exactly');
click('#reading-view');
for (const id of ['contact', 'about', 'projects', 'experience', 'resume']) {
  click(`#floor-navigation [data-room="${id}"]`); await settleCamera();
  assert.equal(dialog.open, true, 'Section navigation keeps reading mode open');
  assert.equal(canvas.dataset.section, id, 'The underlying 3D model follows the selected section');
  assert.equal(w.document.querySelector('#room-title').textContent, sections.find(section => section.id === id).name);
  assert.ok(w.document.querySelector(`#plan-${id}-${floorContent[id].rooms[0].id}`));
  assert.equal(w.document.activeElement, w.document.querySelector('#close-room'), 'Camera completion cannot steal focus from the dialog');
}
// Back/forward or a nested hash also updates a reading section.
w.history.pushState(null, '', '#projects/c'); w.dispatchEvent(new w.PopStateEvent('popstate')); await settleCamera();
assert.equal(dialog.open, true);
assert.equal(w.document.activeElement, w.document.querySelector('#plan-projects-c h3'));
dialog.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
assert.equal(dialog.open, false, 'Escape returns to 3D before changing routes');
assert.equal(w.location.hash, '#projects/c');
click('#reading-view');
click('#reading-tower'); await settleCamera();
assert.equal(dialog.open, false);
assert.equal(main.dataset.mode, 'explore', 'Reading mode returns to the real 3D tower');
assert.equal(canvas.isConnected, true);
assert.equal(w.document.querySelector('#reading-view').hidden, true);
w.history.pushState(null, '', '#resume/d'); w.dispatchEvent(new w.PopStateEvent('popstate')); await settleCamera();
if (!reduced) {
  // A sustained slow flight must retain the user's original graphics quality.
  w.history.pushState(null, '', '#projects'); w.dispatchEvent(new w.PopStateEvent('popstate'));
  for (let i = 0; i < 58; i++) await tick(34);
  assert.equal(canvas.dataset.quality, '0', 'Slow frames never lower the rendering resolution');
  assert.equal(canvas.dataset.detail, mobile ? 'compact' : 'full', 'Desktop line detail stays full under load');
  assert.equal(canvas.dataset.section, 'projects');
  assertFloorFramed('projects');
  const quality = canvas.dataset.quality;
  await resizeTo(...originalViewport);
  assert.equal(canvas.dataset.quality, quality, 'Resizing preserves original graphics quality');
  w.history.pushState(null, '', '#resume/d'); w.dispatchEvent(new w.PopStateEvent('popstate')); await settleCamera();
}
click('#reading-view');
const loss = new w.Event('webglcontextlost', { cancelable: true }); canvas.dispatchEvent(loss);
assert.ok(loss.defaultPrevented);
assert.equal(dialog.open, false, 'Context loss closes the section overlay');
assert.ok(main.classList.contains('unavailable'));
assert.equal(w.document.querySelector('#tower-art'), null, 'Context loss cannot revive the removed 2D tower');
assert.equal(w.document.querySelector('#unavailable-portfolio').getAttribute('href'), './reading.html#education', 'The text fallback keeps the selected section available');
assert.equal(canvas.isConnected, false);
assert.equal(motionListeners.size, 0, 'Media preference listeners are cleaned up');
console.log(`DOM/camera integration passed (${mobile ? 'mobile' : reduced ? 'reduced motion' : deepLink ? 'fresh room link' : 'desktop'}): room URLs, titles, clipboard/manual sharing, section reading mode, retained 3D navigation, room flights, highlighting, left-drag/touch, resize, framing, gestures, history, cancellation, keyboard, idle rendering, motion preferences, and text fallback (${renders} frames).`);
dom.window.close();

