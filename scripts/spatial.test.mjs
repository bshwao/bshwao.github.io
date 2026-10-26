// DOM and camera integration checks. This does not emulate a visual WebGL browser.
import { JSDOM } from 'jsdom';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as THREE from '../assets/vendor/three.module.min.js';
import { viewportLayout } from '../assets/spatial-layout.js';
import { floorContent } from '../assets/floor-content.js';
import { sections } from '../assets/tower-geometry.js';
import { sectionColors } from '../assets/color-theme.js';
import { outdoorTerrainFloor } from '../assets/city-island.js';
import { outdoorCameraPose } from '../assets/camera-framing.js';
import { interiorRoomDesign } from '../assets/interior-design.js';

const root = resolve(import.meta.dirname, '..');
const sectionIds=sections.map(section=>section.id);
const sectionIndex=id=>sections.findIndex(section=>section.id===id);
const mobile = process.argv.includes('--mobile');
const reduced = process.argv.includes('--reduced');
const deepLink = process.argv.includes('--deep-link');
const unavailable = process.argv.includes('--no-webgl');
const drawInventory=process.argv.includes('--draw-inventory');
let viewportWidth = mobile ? 390 : 1280, viewportHeight = mobile ? 844 : drawInventory ? 720 : 800;
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
let localDate=new Date(2026,9,23,10,0,0);
class LocalDate extends Date {
  constructor(...args){super(...(args.length?args:[localDate.getTime()]));}
  static now(){return localDate.getTime();}
}
const frames = new Map();
const resizeObservers = new Set(), motionListeners = new Set();
let motionReduced = reduced;
let lastScene, lastCamera, lastRenderer, renders = 0;
const drawEstimates={method:'CPU visible-geometry/group estimate with frustum/layer filtering and transparent DoubleSide passes; not a WebGL measurement or GPU benchmark.',frames:0,byMode:{},peak:null,checkpoints:[]};
class Renderer {
  constructor() {
    if (unavailable) throw new Error('WebGL unavailable');
    lastRenderer = this;
    this.domElement = w.document.createElement('canvas'); this.autoClear = true; this.target = null;
    this.size = new THREE.Vector2();
    this.info = {render:{calls:0,triangles:0},reset:()=>{
      this.commitFrame();this.info.render.calls=0;this.info.render.triangles=0;this.frameContext=null;this.frameCommitted=false;
    }};
  }
  setClearColor() {} dispose() {this.commitFrame();} clearDepth() {}
  setPixelRatio(value) { this.pixelRatio = value; }
  setSize(width, height) { this.size.set(width, height); }
  getSize(target) { return target.copy(this.size); }
  getDrawingBufferSize(target) { return target.copy(this.size).multiplyScalar(this.pixelRatio).floor(); }
  getRenderTarget() { return this.target; }
  setRenderTarget(target) { this.target = target; }
  commitFrame(){
    if(!drawInventory||!this.frameContext||this.frameCommitted)return;
    this.frameCommitted=true;drawEstimates.frames++;
    const sample={...this.frameContext,...this.info.render};
    const key=`${sample.graphics}/${sample.mode}`,record=drawEstimates.byMode[key]??={frames:0,peakCalls:0,peakTriangles:0};
    record.frames++;record.peakCalls=Math.max(record.peakCalls,sample.calls);record.peakTriangles=Math.max(record.peakTriangles,sample.triangles);
    if(!drawEstimates.peak||sample.calls>drawEstimates.peak.calls)drawEstimates.peak=sample;
  }
  render(scene, camera) {
    scene.updateMatrixWorld();camera.updateMatrixWorld();lastScene=scene;lastCamera=camera;renders++;
    if(!drawInventory)return;
    this.frameContext??={mode:this.domElement.dataset.mode,section:this.domElement.dataset.section,room:this.domElement.dataset.focusedRoom,graphics:this.domElement.dataset.graphics,width:this.size.x,height:this.size.y,transition:w.document.querySelector('#main').dataset.transition};
    const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    scene.traverseVisible(node=>{
      if(!(node.isMesh||node.isLine||node.isPoints)||!node.geometry||!node.layers.test(camera.layers))return;
      if(node.frustumCulled&&!frustum.intersectsObject(node))return;
      const geometry=node.geometry,total=geometry.index?.count??geometry.attributes.position?.count??0;
      const add=(material,start=0,count=total)=>{
        if(!material?.visible)return;
        const first=Math.max(start,geometry.drawRange.start),last=Math.min(start+count,total,geometry.drawRange.start+geometry.drawRange.count);
        if(last<=first)return;
        const passes=node.isMesh&&material.transparent&&material.side===THREE.DoubleSide&&!material.forceSinglePass?2:1;
        this.info.render.calls+=passes;
        if(node.isMesh)this.info.render.triangles+=(last-first)/3*passes;
      };
      if(Array.isArray(node.material))for(const group of geometry.groups)add(node.material[group.materialIndex],group.start,group.count);
      else add(node.material);
    });
  }
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
  console, setTimeout, clearTimeout, URL, Date:LocalDate, performance: { now: () => time },
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
  const index = sectionIndex(id);
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
async function verifyRoomObjects(sectionIndex, roomIndex) {
  await settleCamera();
  const interior = lastScene.children.find(node => node.isGroup).children[sectionIndex].children[2];
  const meshes = interior.children.slice(0, floorContent[sections[sectionIndex].id].rooms.length).flatMap(room => room.children.filter(node => node.isMesh));
  const own = meshes.filter(mesh => mesh.userData.roomIndex === roomIndex);
  let sample;
  for (const mesh of own) {
    for (const range of mesh.userData.objectRanges) {
      for (let vertex = range.start; vertex < range.start + range.count; vertex += 3) {
        const point = new THREE.Vector3();
        for (let offset = 0; offset < 3; offset++) point.add(new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, vertex + offset));
        point.multiplyScalar(1 / 3).applyMatrix4(mesh.matrixWorld);
        const hit = new THREE.Raycaster(lastCamera.position, point.clone().sub(lastCamera.position).normalize()).intersectObjects(meshes, false)[0];
        const target = hit?.object.userData.objectRanges?.find(part => hit.faceIndex * 3 >= part.start && hit.faceIndex * 3 < part.start + part.count)?.target;
        const projected = point.project(lastCamera);
        if (target?.roomIndex === roomIndex && Math.abs(projected.x) < .98 && Math.abs(projected.y) < .98) {
          sample = { target, x: (projected.x + 1) * viewportWidth / 2, y: (1 - projected.y) * viewportHeight / 2 }; break;
        }
      }
      if (sample) break;
    }
    if (sample) break;
  }
  assert.ok(sample, `${sections[sectionIndex].id}/${roomIndex}: every close-up has a visible, individually pickable object`);
  const { target, x, y } = sample;
  const hover = new w.MouseEvent('pointermove', { bubbles: true, buttons: 0, clientX: x, clientY: y });
  Object.defineProperty(hover, 'pointerType', { value: 'mouse' });
  canvas.dispatchEvent(hover); await tick(32);
  assert.equal(canvas.dataset.hoveredObject, String(target.id), 'Pointer hover resolves the actual furniture object');
  assert.ok(target.hover > 0, 'Hover starts the object highlight');
  assert.ok(w.document.querySelector('#spatial-hint').textContent.includes(target.name.toUpperCase()));
  const route = w.location.hash;
  sendMouse('pointerdown', x, y); sendMouse('pointerup', x, y); await tick(200);
  assert.notEqual(target.clickedAt, null, 'A click on the focused room animates its object');
  assert.equal(w.location.hash, route, 'Object clicks preserve the current room URL');
  assert.equal(main.dataset.cameraMotion, 'idle', 'Repeated object clicks do not restart the camera flight');
  const clickedAt = target.clickedAt;
  sendMouse('pointerdown', x, y); sendMouse('pointermove', x + 20, y); sendMouse('pointermove', x, y); sendMouse('pointerup', x, y);
  assert.equal(target.clickedAt, clickedAt, 'Dragging away and back never activates an object');
  await settleCamera();
  const button = w.document.querySelector(`[data-room-object="${target.id}"]`);
  assert.ok(button && /^(Animate|Open) /.test(button.getAttribute('aria-label')), 'Objects also expose named HTML buttons');
  button.closest('details').open = true; button.focus(); await tick(32);
  assert.ok(target.hover > 0, 'Keyboard focus provides the same object highlight');
  button.click(); await tick(200); assert.notEqual(target.clickedAt, null, 'The accessible button starts the same animation');
  w.document.querySelector('#reading-view').focus();
  canvas.dispatchEvent(new w.MouseEvent('pointerleave'));
  await settleCamera();
  const beforeIdle = renders; await tick(200);
  assert.equal(renders, beforeIdle, 'Object feedback stops rendering once it settles');
}
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
function roomSurfaceColors(id) {
  const interior=lastScene.children.find(node=>node.isGroup).children[sectionIndex(id)].children[2];
  return interior.children.slice(0,floorContent[id].rooms.length).map(room=>room.children.filter(node=>node.isMesh).map(mesh=>({surface:mesh.userData.surface,color:mesh.material.color.toArray()})));
}
function assertCameraPoseUnchanged(position,rotation,message) {
  const displacement=lastCamera.position.distanceTo(position),rotationDelta=lastCamera.quaternion.angleTo(rotation);
  assert.ok(displacement<1e-8,`${message}: camera position stays continuous (${displacement.toExponential(3)} units)`);
  assert.ok(rotationDelta<1e-6,`${message}: camera orientation stays continuous (${rotationDelta.toExponential(3)} radians)`);
}
async function sampleRoomFlight(sectionIndex, roomIndex, onSample) {
  for (const progress of [.25, .5, .75]) {
    await tick(190);
    assertRoomFramed(sectionIndex, roomIndex, `${progress * 100}% of room flight`);
    onSample?.(progress);
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
  assert.equal(w.document.querySelector('#portfolio-intro').open,false,'WebGL failure releases the intro immediately');
  assert.equal(main.inert,false,'The reading fallback remains interactive');
  console.log('Initial WebGL failure passes: complete reading portfolio remains accessible without a canvas or render loop.');
  dom.window.close(); process.exit(0);
}
assert.ok(main.classList.contains('spatial'), '3D initialization succeeds');
const introDialog=w.document.querySelector('#portfolio-intro');
if(!deepLink){
  assert.equal(introDialog.open,true,'A first home visit introduces the portfolio before the city');
  assert.equal(main.inert,true,'Covered city controls cannot receive focus or pointer input');
  click('#intro-enter');
  assert.equal(introDialog.dataset.state,reduced?'closed':'leaving','Entering waits for a rendered city and follows the motion preference');
  if(!reduced)await new Promise(resolve=>setTimeout(resolve,900));
  assert.equal(introDialog.open,false);
  assert.equal(main.inert,false);
  assert.equal(w.sessionStorage.getItem('eh-intro-seen-v1'),'1');
}else assert.equal(introDialog.open,false,'Room deep links bypass the title page');
if (deepLink) {
  await settleCamera();
  assert.equal(main.dataset.mode, 'section', 'A fresh room URL opens its interior directly');
  assert.equal(w.location.hash, '#projects/b');
  assert.equal(main.dataset.focusedRoom, '1', 'A fresh room URL focuses the requested room');
  assert.equal(w.document.querySelector('#interior-room-title').textContent, floorContent.projects.rooms[1].title);
  assert.equal(w.document.title, `${floorContent.projects.rooms[1].title} · Projects — Eric Hsu`);
  assertRoomFramed(sectionIndex('projects'), 1);
  w.history.pushState(null, '', '#tower'); w.dispatchEvent(new w.HashChangeEvent('hashchange'));
  await tick(2000);
}
assert.equal(main.dataset.transition, 'idle');
assert.equal(main.dataset.mode, 'tower');
const towerModules=()=>lastScene.children.find(node=>node.isGroup).children.slice(0,sections.length);
assert.ok(towerModules().every((module,index)=>module.children[1].visible===(index===sections.length-1)),'Assembled facade hides encased structural slab/outline draws while retaining the ground base');
assert.ok(towerModules().every(module=>!module.getObjectByName('tower-structural-plates')?.visible),'Closed opaque shells hide their enclosed internal floor plates');
if(drawInventory){
  const checkpoint=label=>{
    lastRenderer.commitFrame();
    drawEstimates.checkpoints.push({label,graphics:w.document.querySelector('canvas').dataset.graphics,...lastRenderer.info.render});
  };
  const visit=async hash=>{w.history.pushState(null,'',hash);w.dispatchEvent(new w.PopStateEvent('popstate'));await settleCamera();};
  for(const graphics of ['standard','low']){
    const preference=w.document.querySelector('#graphics-preference');preference.value=graphics;preference.dispatchEvent(new w.Event('change',{bubbles:true}));await settleCamera();
    await visit('#tower');checkpoint('tower');
    click('#unfold-structure');await settleCamera();checkpoint('explore');
    for(const {id}of sections){
      await visit(`#${id}`);checkpoint(`${id} overview`);
      for(let index=0;index<floorContent[id].rooms.length;index++){
        click(`#station-navigation [data-station="${index}"]`);await settleCamera();checkpoint(`${id}/${floorContent[id].rooms[index].id}`);
      }
    }
  }
  const loss=new w.Event('webglcontextlost',{cancelable:true});w.document.querySelector('canvas').dispatchEvent(loss);
  const path=resolve(root,`state/penthouse/cpu-draw-inventory-${mobile?'phone':'desktop'}.json`);
  await writeFile(path,JSON.stringify(drawEstimates,null,2));
  console.log(JSON.stringify({method:drawEstimates.method,frames:drawEstimates.frames,peak:drawEstimates.peak,byMode:drawEstimates.byMode,opening:drawEstimates.checkpoints.filter(row=>['tower','explore'].includes(row.label)),path},null,2));
  dom.window.close();process.exit(0);
}
// A native RAF can arrive less than a millisecond after a navigation request.
// Instant calls must finish on that first frame rather than briefly revealing
// enclosed static floor plates and uploading a new buffer on a later visit.
{
  const primary={scene:lastScene,camera:lastCamera,renderer:lastRenderer,renders};
  const container=w.document.createElement('div');w.document.body.append(container);
  const {createSpatialScene}=(await load(resolve(root,'assets/scene-3d.js'))).namespace;
  let state,completions=0;
  const probe=createSpatialScene({container,clock:()=>new LocalDate(),onFrame:next=>{state=next;}});
  try{
    await tick(.0001);
    assert.equal(state.transitionType,null,'Initial instant camera completes even on a sub-millisecond RAF');
    probe.goTo('section','penthouse',{instant:true,onComplete:()=>completions++});await tick(.0001);
    assert.equal(state.transitionType,null);
    assert.equal(state.reveal,1);assert.equal(state.expansion,1);assert.equal(state.panel,1);
    assert.equal(completions,1,'An instant section completes on its first frame');
    assert.ok(lastScene.children.find(node=>node.isGroup).children.slice(0,sections.length)
      .every(module=>!module.getObjectByName('tower-structural-plates')?.visible),'Instant cuts never expose enclosed structural-plate buffers');
    probe.focusRoom(0,{instant:true});await tick(.0001);
    assert.equal(state.transitionType,null);assert.equal(state.focusedRoom,0);
    probe.setPenthouseAtmosphere({hour:22,brightness:.62,lamps:true,weather:'rain'});await tick(.0001);
    assert.equal(state.timeOfDay,'night','Rainy Night changes the city clock, not just bedroom lighting');
    assert.equal(state.atmosphere.outdoors.night,1);assert.equal(state.atmosphere.outdoors.rain,true);
    assert.equal(container.querySelector('.penthouse-weather'),null,'No weather layer is placed over the occupied room');
    probe.setPreferences({motion:'reduced'});await tick(.0001);
    assert.equal(state.atmosphere.outdoors.time,0,'Reduced motion keeps outdoor rain static');
    probe.setPreferences({motion:reduced?'reduced':'full'});
    probe.setPenthouseAtmosphere(null);await tick(.0001);
    assert.equal(state.atmosphere.outdoors.rain,false);assert.equal(state.atmosphere.outdoors.night,0);
    assert.equal(state.localHour,state.atmosphere.realHour,'Clearing the atmosphere restores the real local clock');
    probe.goTo('tower',null);await tick(.0001);
    if(!reduced)assert.equal(state.transitionType,'scene','Ordinary navigation retains its camera flight');
    probe.setPreferences({motion:'reduced'});await tick(.0001);
    assert.equal(state.transitionType,null,'A live reduced-motion change also completes on its next frame');
    assert.equal(state.expansion,0);
  }finally{
    probe.dispose();container.remove();
    lastScene=primary.scene;lastCamera=primary.camera;lastRenderer=primary.renderer;renders=primary.renders;
  }
}
assert.equal(lastScene.getObjectByName('district-buildings').visible, true, 'The opening view includes the surrounding district buildings');
assert.equal(lastScene.getObjectByName('district-character').visible, true, 'The opening view includes the landscaped district');
assert.equal(lastScene.getObjectByName('district-contact-shadows').visible, true, 'The opening city includes its contact shading');
assert.equal(lastScene.getObjectByName('city-waterfront').visible,true,'The opening city includes the river and bridges');
assert.equal(lastScene.getObjectByName('city-outskirts').visible,true,'The opening city includes the outer neighborhoods');
assert.equal(w.document.querySelector('canvas').dataset.detail, mobile ? 'compact' : 'full');
const cityDepthReferences = [];
lastScene.traverse(node => { if (node.material?.userData.districtDepth) cityDepthReferences.push(node.material.userData.districtDepth); });
assert.ok(cityDepthReferences.length > 0 && cityDepthReferences.every(reference => reference.value === cityDepthReferences[0].value && Number.isFinite(reference.value) && reference.value > 0), 'City layers share a finite camera-relative fading distance');
assert.ok(sections.every(section => !lastScene.getObjectByName(`cap-plans-${section.id}`).visible), 'Assembled tower hides the cap plans');
assert.equal(w.document.querySelector('#reading-view').hidden, true, 'Reading mode is unavailable on the tower');
assert.equal(w.document.title, initialTitle, 'The opening tower restores the page title');
// The visible controls use the real camera and renderer, rather than a second UI-only state.
const hint = w.document.querySelector('#controls-hint');
assert.equal(hint.hidden, false, 'A first visit shows help until the visitor selects something');
const initialCamera = lastCamera.position.clone();
click('#zoom-in'); await settleCamera();
assert.ok(lastCamera.position.distanceTo(initialCamera) > 1, 'Visible zoom-in moves the camera');
assert.equal(hint.hidden, true, 'Using the view dismisses onboarding');
click('#zoom-out'); await settleCamera();
assert.ok(lastCamera.position.distanceTo(initialCamera) < .001, 'Zoom-out reverses the camera step');
async function verifyZoomStops(label,{gestures=false,resize=false}={}){
  const canvas=w.document.querySelector('canvas');
  const key=value=>canvas.dispatchEvent(new w.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
  const wheel=deltaY=>canvas.dispatchEvent(new w.WheelEvent('wheel',{deltaY,bubbles:true,cancelable:true}));
  for(const [value,button,field,delta]of [['+','zoom-in','zoomMin',-10000],['-','zoom-out','zoomMax',10000]]){
    for(let i=0;i<90;i++)key(value);await settleCamera();
    assert.ok(Math.abs(Number(main.dataset.zoomDistance)-Number(main.dataset[field]))<.02,`${label}: the real camera reaches its ${field} boundary`);
    assert.equal(w.document.querySelector(`#${button}`).disabled,true,`${label}: its button disables at the boundary`);
    const stopped=lastCamera.position.clone();
    const stoppedRenders=renders;
    for(let i=0;i<4;i++)key(value);await settleCamera();
    assert.equal(renders,stoppedRenders,`${label}: zooming against a stop does not schedule redundant renders`);
    for(let i=0;i<4;i++){key(value);wheel(delta);}await settleCamera();
    assert.ok(lastCamera.position.distanceTo(stopped)<.003,`${label}: repeated keyboard and wheel input cannot pass the hard stop`);
    if(gestures){
      sendMouse('pointerdown',150,200,1);sendMouse('pointermove',150,value==='+'?-20000:20000,1);sendMouse('pointerup',150,200,1);await settleCamera();
      assert.ok(Number(main.dataset.zoomDistance)>=Number(main.dataset.zoomMin)-.02&&Number(main.dataset.zoomDistance)<=Number(main.dataset.zoomMax)+.02,`${label}: middle-button dolly stays bounded`);
      sendMouse('pointerdown',150,200,0,'touch',21);sendMouse('pointerdown',250,200,0,'touch',22);
      sendMouse('pointermove',value==='+'?20150:151,200,0,'touch',22);
      sendMouse('pointerup',150,200,0,'touch',21);sendMouse('pointerup',250,200,0,'touch',22);await settleCamera();
      assert.ok(Number(main.dataset.zoomDistance)>=Number(main.dataset.zoomMin)-.02&&Number(main.dataset.zoomDistance)<=Number(main.dataset.zoomMax)+.02,`${label}: pinch stays bounded`);
    }
    if(resize)for(const viewport of [[320,568],[650,390],originalViewport]){
      await resizeTo(...viewport);
      assert.ok(Number(main.dataset.zoomDistance)>=Number(main.dataset.zoomMin)-.02&&Number(main.dataset.zoomDistance)<=Number(main.dataset.zoomMax)+.02,`${label}: resizing at a stop applies the new viewport's limits`);
    }
  }
}
await verifyZoomStops('city',{gestures:true,resize:true});click('#reset-spatial');await settleCamera();
const settings = w.document.querySelector('#view-settings');
click('#show-controls-hint'); assert.equal(hint.hidden, false);
w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
assert.equal(hint.hidden, true); assert.equal(main.dataset.mode, 'tower');
settings.open = true;
w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
assert.equal(settings.open, false, 'Escape closes settings before navigating away');
const selectPreference = async (id, value) => {
  const select = w.document.querySelector(id); select.value = value;
  select.dispatchEvent(new w.Event('change', { bubbles: true })); await settleCamera();
};
await selectPreference('#motion-preference', 'full'); assert.equal(main.dataset.motion, 'full');
motionReduced = true; for (const callback of [...motionListeners]) callback(); await settleCamera();
assert.equal(main.dataset.motion, 'full', 'The explicit full-motion setting overrides a device change');
await selectPreference('#motion-preference', 'reduced'); assert.equal(main.dataset.motion, 'reduced');
motionReduced = reduced;
await selectPreference('#motion-preference', 'system'); assert.equal(main.dataset.motion, reduced ? 'reduced' : 'full');
const standardRatio = lastRenderer.pixelRatio;
await selectPreference('#graphics-preference', 'low');
assert.ok(lastRenderer.pixelRatio < standardRatio, 'Low graphics lowers actual renderer resolution');
assert.equal(w.document.querySelector('canvas').dataset.detail, 'compact');
assert.equal(w.document.querySelector('canvas').dataset.graphics, 'low');
assert.equal(lastScene.getObjectByName('building-facades').visible, false, 'Fine facade geometry is omitted');
const savedPreferences = JSON.parse(w.localStorage.getItem('eh-view-preferences-v1'));
assert.deepEqual(savedPreferences, { motion: 'system', graphics: 'low', controlsSeen: true });
await selectPreference('#graphics-preference', 'standard');
assert.equal(lastRenderer.pixelRatio, standardRatio, 'Standard graphics restores the original resolution');
assert.equal(w.document.querySelector('canvas').dataset.quality, '0');
const fullTerrain=lastScene.getObjectByName('city-ground').geometry;
await selectPreference('#graphics-preference','low');
assert.ok(lastScene.getObjectByName('city-ground').geometry.attributes.position.count<fullTerrain.attributes.position.count*.7,'Low graphics thins individual trees while retaining all terrain');
await selectPreference('#graphics-preference','standard');
assert.equal(lastScene.getObjectByName('city-ground').geometry,fullTerrain,'Changing graphics reuses the full terrain geometry');
// At street level a solid foreground building must block the tower behind it.
const outdoorCanvas = w.document.querySelector('canvas');
const cameraKey = key => outdoorCanvas.dispatchEvent(new w.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
const originalTarget=outdoorCameraPose('tower',viewportWidth,viewportHeight).target;
let raisedViews=0;
for(const radius of [2300,3200,3500])for(let i=0;i<16;i++){
  lastCamera.position.setFromSphericalCoords(radius,1.56,i*Math.PI/8).add(originalTarget);lastCamera.lookAt(originalTarget);
  cameraKey('ArrowDown');await tick(32);await settleCamera();
  const floor=outdoorTerrainFloor(lastCamera.position.x,lastCamera.position.z);
  if(floor>10)raisedViews++;
  assert.ok(lastCamera.position.y>=floor-.002,'Low outdoor orbit clears the actual mountain/foothill surface');
}
assert.ok(raisedViews>=8,'Camera clearance is exercised over different mountain regions and distances');
click('#reset-spatial');await settleCamera();
for(let i=0;i<24;i++){cameraKey('ArrowDown');await tick(16);}
await settleCamera();assert.ok(lastCamera.position.y>=1.49,'Outdoor orbit stops above street level');
click('#reset-spatial');await settleCamera();
// The skyline opening is already at street level. The old six-step downward
// preparation would now move the camera underneath the ground plane.
const towerMeshes = lastScene.children.find(node => node.isGroup).children.slice(0, sections.length).flatMap(module => module.children[0].children.filter(node => node.isMesh));
const sceneryMeshes = ['district-buildings', 'district-character'].flatMap(name => lastScene.getObjectByName(name).children.filter(node => node.isMesh));
let blockedPoint;
for (let i = 0; i < 49 && !blockedPoint; i++) {
  for (const height of [2, 5, 9, 15, 25]) {
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
assert.equal(lastScene.getObjectByName('district-buildings').visible,false,'Tall city buildings clear before unfolded sections can cross them');
assert.equal(lastScene.getObjectByName('city-environment').visible,false,'Sunset renders behind the sharp model in a separate blurred pass');
assert.equal(w.document.querySelector('canvas').dataset.background,'blurred','Opening the tower keeps a blurred city backdrop');
assert.equal(lastScene.getObjectByName('city-waterfront').visible,false,'River scenery joins the blurred pass instead of covering unfolded floors');
assert.equal(lastScene.getObjectByName('city-outskirts').visible,false,'Outer neighborhoods join the blurred background instead of covering the tower');
const middle = lastCamera.position.clone();
await tick(171);
if(!reduced){
  assert.ok(towerModules()[0].position.y>sections[0].low+50+5,'Unfolding stretches past the final crown height before recoiling');
  const modules=towerModules();
  for(let i=0;i<modules.length-1;i++)assert.ok(modules[i].position.y>=modules[i+1].position.y+sections[i+1].high-sections[i+1].low-1e-5,'Springing floors keep vertical clearance');
}
await tick(729);
assert.equal(main.dataset.mode, 'explore');
assert.equal(w.document.querySelector('canvas').dataset.background,'blurred','City and landscaping stay defocused while choosing a section');
assert.ok(sections.every(section => lastScene.getObjectByName(`cap-plans-${section.id}`).visible), 'Expansion reveals all cut-face plans');
assert.ok(towerModules().every(module=>module.children[1].visible),'Separated floors restore every exposed structural slab and its edge drawing');
const assertBottomCaps=()=>{
  assert.ok(towerModules().every((module,index)=>module.getObjectByName('tower-bottom-cap').visible===(index===sections.length-1||lastCamera.position.y<=module.position.y)),'Closed floor bottom caps follow the actual camera elevation while the ground cap stays visible');
};
assertBottomCaps();
for(let i=0;i<24;i++){cameraKey('ArrowDown');await tick(16);}
await settleCamera();assertBottomCaps();
assert.ok(towerModules().slice(0,-1).every(module=>module.getObjectByName('tower-bottom-cap').visible),'A below-floor orbit restores every exposed underside');
click('#reset-spatial');await settleCamera();assertBottomCaps();
assert.equal(w.document.querySelector('#reading-view').hidden, true, 'Reading mode is unavailable on the expanded tower');
assert.equal(main.dataset.transition, 'idle');
if (!reduced) assert.ok(middle.distanceTo(lastCamera.position) > 1, 'Camera moves throughout expansion');
await verifyZoomStops('expanded tower',{gestures:true});click('#reset-spatial');await settleCamera();

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
  const entryModule = lastScene.children.find(node => node.isGroup).children[sectionIndex('about')];
  const shell = entryModule.children[0].children.find(node => node.isMesh);
  const visibleHeight = shell.material.clippingPlanes[0].constant - entryModule.position.y;
  const aboutSection=sections.find(section=>section.id==='about');
  assert.ok(visibleHeight > (aboutSection.high-aboutSection.low)*.7, 'Entry approaches the section before opening its facade');
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
assert.equal(canvas.dataset.background, 'blurred', 'The city backdrop continues behind inhabited floors');
assert.equal(lastScene.getObjectByName('blueprint-district').visible, false, 'The district clears away for interior reading');
assert.equal(lastScene.getObjectByName('district-buildings').visible, false, 'District buildings clear away before interior reading');
assert.equal(lastScene.getObjectByName('district-character').visible, false, 'Landscaping and test vehicles clear away before interior reading');
assert.equal(lastScene.getObjectByName('cap-plans-about').visible, false, 'The cap drawing clears before the furnished interior is read');
const openAbout=towerModules()[sectionIndex('about')];
assert.equal(openAbout.getObjectByName('tower-bottom-cap').visible,true,'An opened floor keeps its closing surface');
assert.equal(openAbout.getObjectByName('tower-structural-plates').visible,false,'Fully clipped internal plates add no hidden draw');
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
const aboutRooms = lastScene.children.find(node => node.isGroup).children[sectionIndex('about')].children[2].children.slice(0, floorContent.about.rooms.length);
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
assertRoomFramed(sectionIndex('about'), 2, '25% of overview-to-room flight');
assert.equal(lastScene.children.find(node => node.isGroup).children.slice(0, sections.length).filter(node => node.visible).length, 1, 'Other tower sections stay hidden throughout a room close-up');
assert.equal(w.location.hash, '#about/c', 'Room selection has a stable shareable URL');
assert.equal(w.document.title, `${floorContent.about.rooms[2].title} · About — Eric Hsu`);
assert.ok(w.document.querySelector('#interior-content').textContent.includes('Piano'));
assert.equal(w.document.querySelector('#station-markers [data-station="2"]').getAttribute('aria-pressed'), 'true');
await tick(190);
assertRoomFramed(sectionIndex('about'), 2, '50% of overview-to-room flight');
await tick(190);
assertRoomFramed(sectionIndex('about'), 2, '75% of overview-to-room flight');
await tick(470);
assert.equal(canvas.dataset.focusedRoom, '2');
assertRoomFramed(sectionIndex('about'), 2);
assert.equal(main.dataset.cameraMotion, 'idle');
assert.equal(w.document.querySelector('#floor-overview').disabled, false);
const about = lastScene.children.find(node => node.isGroup).children[sectionIndex('about')].children[2];
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
const firstRoomPosition=lastCamera.position.clone(),firstRoomRotation=lastCamera.quaternion.clone(),firstRoomColors=roomSurfaceColors('about');
click('#station-navigation [data-station="1"]');
if(!reduced){
  assertCameraPoseUnchanged(firstRoomPosition,firstRoomRotation,'Starting a room close-up');
  await tick(0);
  assertCameraPoseUnchanged(firstRoomPosition,firstRoomRotation,'The first room-flight frame');
  assert.deepEqual(roomSurfaceColors('about'),firstRoomColors,'Room surfaces retain the rendered color treatment when a new focus begins');
}
await tick(200);
assert.equal(manualLink.hidden, true, 'Changing the route clears the manual copy field');
assert.equal(w.document.querySelector('#share-status').textContent, '');
const interruptedPosition=lastCamera.position.clone(),interruptedRotation=lastCamera.quaternion.clone(),interruptedColors=roomSurfaceColors('about');
click('#station-navigation [data-station="3"]');
if(!reduced){
  assertCameraPoseUnchanged(interruptedPosition,interruptedRotation,'Rapid room retarget');
  assert.deepEqual(roomSurfaceColors('about'),interruptedColors,'Changing the destination does not instantly swap the room surface colors');
  await tick(0);
  assertCameraPoseUnchanged(interruptedPosition,interruptedRotation,'The replacement room-flight frame');
  assert.deepEqual(roomSurfaceColors('about'),interruptedColors,'The replacement flight starts from the displayed material pose');
}
await sampleRoomFlight(sectionIndex('about'), 3,progress=>{
  if(!reduced&&progress===.25)assert.notDeepEqual(roomSurfaceColors('about'),interruptedColors,'Room surface colors blend during travel instead of jumping only at arrival');
});
assert.equal(canvas.dataset.focusedRoom, '3', 'Rapid room changes keep the most recent camera destination');
assertRoomFramed(sectionIndex('about'), 3);
assert.equal(main.dataset.cameraMotion,'idle','The retargeted room flight settles completely');
for(const surface of roomSurfaceColors('about')[3]){
  const authored=new THREE.Color(interiorRoomDesign('about',3).colors[surface.surface]);
  assert.ok(authored.toArray().every((value,i)=>Math.abs(value-surface.color[i])<1e-8),'The destination room finishes in its authored surface palette');
}
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
assertRoomFramed(sectionIndex('about'), 1);
await resizeTo(0, 0);
assert.ok(lastCamera.position.toArray().every(Number.isFinite), 'A temporarily hidden viewport cannot corrupt the camera');
await resizeTo(...originalViewport);
click('#floor-overview'); await tick(800);
await settleCamera();
const idleRenders = renders; await tick(500);
assert.equal(renders, idleRenders, 'An idle scene stops rendering');
assert.equal(canvas.dataset.timeOfDay,'morning');
const clockRoute=w.location.hash,clockCamera=lastCamera.position.clone();
localDate=new Date(2026,9,23,22,0,0);
w.document.dispatchEvent(new w.Event('visibilitychange'));await settleCamera();
assert.equal(canvas.dataset.timeOfDay,'night','The local clock catches up without reloading or navigating');
assert.equal(canvas.dataset.daylight,'0.0000');
assert.equal(w.location.hash,clockRoute);assert.ok(lastCamera.position.distanceTo(clockCamera)<1e-8);
const clockSky=lastScene.getObjectByName('local-time-sky').material.uniforms;
assert.equal(clockSky.starVisibility.value,1);assert.equal(clockSky.sunVisibility.value,0);assert.equal(clockSky.moonVisibility.value,1);
assert.match(w.document.querySelector('.material-key small').textContent,/NIGHT/);
assert.equal(w.document.querySelector('#local-clock').textContent,'10:00:00 PM','The top bar catches up to the device clock independently of the scene');
localDate=new Date(2026,9,23,10,0,0);
w.document.dispatchEvent(new w.Event('visibilitychange'));await settleCamera();
assert.equal(canvas.dataset.timeOfDay,'morning');
assert.equal(w.document.querySelector('#local-clock').textContent,'10:00:00 AM');
assert.equal(clockSky.starVisibility.value,0);assert.equal(clockSky.sunVisibility.value,1);
click('#station-navigation [data-station="1"]'); await tick(100);
pageHidden = true; w.document.dispatchEvent(new w.Event('visibilitychange'));
const hiddenRenders = renders; await tick(2000);
assert.equal(renders, hiddenRenders, 'Hidden tabs suspend rendering even during a room flight');
pageHidden = false; w.document.dispatchEvent(new w.Event('visibilitychange')); await settleCamera();
assert.equal(canvas.dataset.focusedRoom, '1', 'Visibility restoration safely completes the pending room flight');
assertRoomFramed(sectionIndex('about'), 1);
click('#floor-overview'); await settleCamera();

click('#back-to-structure'); await settleCamera();
assert.ok(lastCamera.position.distanceTo(savedOutdoorPosition) < .02, 'Leaving an interior restores the expanded view after viewport changes');
assert.ok(lastCamera.quaternion.angleTo(savedOutdoorRotation) < .001, 'Leaving an interior restores the expanded viewing angle');
w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
if(!reduced){
  const crownHeights=[];
  for(let sample=0;sample<41;sample++){
    await tick(32);const modules=towerModules();crownHeights.push(modules[0].position.y);
    for(let i=0;i<modules.length-1;i++)assert.ok(modules[i].position.y>=modules[i+1].position.y+sections[i+1].high-sections[i+1].low-1e-5,'Landing floors never pass through the floor underneath');
  }
  assert.ok(crownHeights.some((height,i)=>i>0&&height>crownHeights[i-1]+.03),'The collapsing tower rebounds upward before its final landing');
}
await settleCamera();
for(const [index,module]of towerModules().entries())assert.ok(module.position.distanceTo(new THREE.Vector3(0,sections[index].low,0))<1e-5,'The rubber-band effect leaves no residual floor displacement');
assert.ok(lastCamera.position.distanceTo(openingPosition) < .02, 'Collapsing restores the independent assembled city camera');
click('#unfold-structure'); await settleCamera();
assert.ok(lastCamera.position.distanceTo(savedOutdoorPosition) < .02, 'Unfolding restores the previous expanded orbit and zoom');

// Move between all interior models and check the document/source links.
for (const id of sectionIds) {
  w.history.pushState(null, '', `#${id}`); w.dispatchEvent(new w.HashChangeEvent('hashchange'));
  await sampleSectionEntry(id);
  assert.equal(canvas.dataset.section, id); assert.equal(main.dataset.transition, 'idle');
  assert.equal(w.document.querySelector('#complete-portfolio').getAttribute('href'), `./reading.html#${id === 'resume' ? 'education' : id}`, 'The complete portfolio opens the corresponding reading section');
  assertFloorFramed(id);
  await verifyZoomStops(`${id} floor`);click('#reset-spatial');await settleCamera();
  assert.ok(w.document.querySelector('#interior-content').textContent.trim().length > 40);
  const count = w.document.querySelectorAll('#station-navigation button').length;
  for (let i = 0; i < count; i++) {
    click(`#station-navigation [data-station="${i}"]`);
    await sampleRoomFlight(sectionIndex(id), i);
    assert.equal(w.location.hash, `#${id}/${floorContent[id].rooms[i].id}`);
    if (id === 'projects') {
      assert.equal(w.document.querySelector('#complete-portfolio').getAttribute('href'), `./reading.html#project-${floorContent.projects.rooms[i].projectId}`, 'Each project opens its own complete case study');
      assert.deepEqual([...w.document.querySelectorAll('#interior-content .project-summary dt')].map(node => node.textContent), ['What I built', 'My contribution', 'Result']);
    }
    assertRoomFramed(sectionIndex(id), i);
    if(id==='penthouse'&&i===1){
      const gameRoute=w.location.hash;
      click('#interior-content [data-penthouse-open="arcade"]');
      assert.equal(w.document.querySelectorAll('#penthouse-arcade-dialog [data-arcade-launch]').length,7);
      click('#penthouse-arcade-dialog [data-arcade-launch="tic-tac-toe"]');
      const cell=w.document.querySelector('#penthouse-arcade-dialog [data-game-cell="0"]');
      assert.ok(cell,'The play lounge exposes a real keyboard-accessible game');
      click('#penthouse-arcade-dialog [data-game-cell="0"]');await settleCamera();
      assert.equal(cell.textContent,'X');assert.equal(cell.disabled,true);
      assert.equal(w.document.querySelectorAll('#penthouse-arcade-dialog [data-game-cell][data-mark="O"]').length,1,'The house replies once');
      assert.equal(w.location.hash,gameRoute,'Playing does not navigate away from the lounge');
      click('#penthouse-arcade-dialog [data-game-reset]');
      assert.ok([...w.document.querySelectorAll('#penthouse-arcade-dialog [data-game-cell]')].every(button=>!button.disabled&&!button.textContent),'A new round clears and enables all nine squares');
      click('#penthouse-arcade-dialog [data-close-experience]');
    }
    await verifyZoomStops(`${id}/${i} room`,{resize:id==='about'&&i===0});click(`#station-navigation [data-station="${i}"]`);await settleCamera();
    await verifyRoomObjects(sections.findIndex(section => section.id === id), i);
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
w.history.pushState(null,'','#contact');w.dispatchEvent(new w.HashChangeEvent('hashchange'));await settleCamera();
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
assert.equal(canvas.dataset.background, 'sharp', 'Returning to the tower restores sharp scenery');
assert.equal(lastScene.getObjectByName('city-waterfront').visible,true,'Returning to the city restores the river and bridges');
assert.equal(lastScene.getObjectByName('city-outskirts').visible,true,'Returning to the city restores the outer neighborhoods');
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
w.history.pushState(null, '', '#projects/b'); w.dispatchEvent(new w.PopStateEvent('popstate'));
const directRoomPhases=[];
for(let i=0;i<180&&frames.size;i++){await tick(16);directRoomPhases.push(main.dataset.cameraMotion);}
const directRoomSequence=directRoomPhases.filter((phase,index)=>index===0||phase!==directRoomPhases[index-1]);
assert.deepEqual(directRoomSequence,reduced?['idle']:['scene','idle'],'A direct room URL uses one continuous scene entry without a second room flight or stop/restart');
assert.equal(main.dataset.transition,'idle');
assert.equal(canvas.dataset.section, 'projects');
assert.equal(canvas.dataset.focusedRoom, '1', 'History restoration recovers the exact room camera');
assert.equal(w.document.querySelector('#station-navigation [data-station="1"]').getAttribute('aria-pressed'), 'true');
assert.equal(w.document.querySelector('#interior-room-title').textContent, floorContent.projects.rooms[1].title);
assert.equal(w.document.title, `${floorContent.projects.rooms[1].title} · Projects — Eric Hsu`);
assertRoomFramed(sectionIndex('projects'),1,'direct room entry arrival');
w.document.querySelector('#interior-room-title').focus();
w.history.pushState(null, '', '#projects/c'); w.dispatchEvent(new w.HashChangeEvent('hashchange')); await tick(800);
assert.equal(canvas.dataset.focusedRoom, '2', 'A room hash change updates the current floor without re-entering it');
assert.equal(w.document.querySelector('#interior-room-title').textContent, floorContent.projects.rooms[2].title);
assert.equal(w.document.activeElement, w.document.querySelector('#interior-room-title'), 'Replacing focused content keeps focus on the new room heading');
w.history.pushState(null, '', '#resume/b'); w.dispatchEvent(new w.PopStateEvent('popstate'));await tick(1400);
const lateEntryPosition=lastCamera.position.clone(),lateEntryRotation=lastCamera.quaternion.clone(),lateEntryColors=roomSurfaceColors('resume');
if(!reduced)assert.equal(main.dataset.cameraMotion,'scene','Retarget while the entry is still opening the interior');
w.history.pushState(null, '', '#resume/d'); w.dispatchEvent(new w.PopStateEvent('popstate'));
if(!reduced){
  assertCameraPoseUnchanged(lateEntryPosition,lateEntryRotation,'A late same-floor room route change');
  assert.deepEqual(roomSurfaceColors('resume'),lateEntryColors,'Late scene-entry retargeting preserves the existing room color blend');
  await tick(0);
  assertCameraPoseUnchanged(lateEntryPosition,lateEntryRotation,'The first frame after a late entry retarget');
  assert.deepEqual(roomSurfaceColors('resume'),lateEntryColors,'The replacement entry does not reset the surface fades');
}
await settleCamera();
assert.equal(canvas.dataset.section, 'resume');
assert.equal(canvas.dataset.focusedRoom, '3');
assert.equal(main.dataset.cameraMotion,'idle');
assertRoomFramed(sectionIndex('resume'),3,'late scene-entry retarget arrival');
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
const readingStart=sectionIndex('resume');
for(let step=1;step<=sections.length;step++){
  const id=sections[(readingStart+step)%sections.length].id;
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
// Unfolding must not replace moonlight with the bright interior reading lights.
localDate=new Date(2026,9,23,22,0,0);
w.document.dispatchEvent(new w.Event('visibilitychange'));await settleCamera();
w.history.pushState(null,'','#explore');w.dispatchEvent(new w.PopStateEvent('popstate'));await settleCamera();
const nightAmbient=lastScene.children.find(node=>node.isHemisphereLight);
assert.equal(nightAmbient.intensity,.85,'Night unfolding keeps outdoor ambient light');
assert.ok(lastScene.children.filter(node=>node.isDirectionalLight).every(node=>node.intensity<=.65),'Night unfolding cannot restore daytime key lights');
w.history.pushState(null,'','#resume/d');w.dispatchEvent(new w.PopStateEvent('popstate'));await settleCamera();
assert.equal(nightAmbient.intensity,2.25,'Opening a furnished room retains its readable interior lighting');
localDate=new Date(2026,9,23,10,0,0);
w.document.dispatchEvent(new w.Event('visibilitychange'));await settleCamera();
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
