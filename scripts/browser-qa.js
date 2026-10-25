import { createSpatialScene } from '../assets/scene-3d.js';
import { floorContent } from '../assets/floor-content.js';

const params = new URLSearchParams(location.search);
const width = Math.max(320, Math.min(3840, Number(params.get('width')) || 1280));
const height = Math.max(360, Math.min(2160, Number(params.get('height')) || 720));
const requestedDpr = Number(params.get('dpr'));
const graphics = params.get('graphics') === 'low' ? 'low' : 'standard';
let testHour=params.has('hour')?Number(params.get('hour')):10;
const testClock=()=>new Date(2026,9,23,testHour,0,0);
if (requestedDpr > 0 && requestedDpr <= 4) Object.defineProperty(window, 'devicePixelRatio', { value: requestedDpr, configurable: true });
const stage = document.querySelector('#stage'); stage.style.width = `${width}px`; stage.style.height = `${height}px`;
const output = document.querySelector('#results'), status = document.querySelector('#status');
const rows = [], objectChecks = [], zoomChecks = []; let frames = 0, objectFrames = 0, latest, spatial, maxFrameCalls = 0;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function settled(requireFrame=true) {
  const start=frames;
  for (let i = 0; i < 200; i++) {
    const before = frames; await delay(35);
    if (latest && !latest.moving && before === frames && (!requireFrame||frames>start)) return;
  }
  throw new Error('Scene did not settle within seven seconds');
}
function sample(view, limit) {
  const metrics = spatial.metrics();
  assert(metrics.calls <= limit, `${view}: ${metrics.calls} draws exceeds ${limit}`);
  if(view==='tower')assert(metrics.triangles<=150000,`${metrics.triangles} assembled triangles exceeds the complete-city budget`);
  assert(metrics.textures <= 2 + (params.has('shadows')?1:0), `${view}: unexpected WebGL texture allocation`);
  assert(metrics.backdrop.width * metrics.backdrop.height <= 2_400_000, 'City blur exceeds the main canvas raster budget');
  if(view !== 'tower') {
    const scale = metrics.graphics === 'low' ? .5 : 1;
    assert(metrics.backdrop.width === Math.floor(Math.floor(metrics.width*metrics.pixelRatio)*scale) && metrics.backdrop.height === Math.floor(Math.floor(metrics.height*metrics.pixelRatio)*scale), `${view}: scenery buffer must match the selected graphics budget`);
  }
  assert(metrics.background === (view === 'tower' ? 'sharp' : metrics.graphics === 'low' ? 'simplified' : 'blurred'), `${view}: incorrect city focus`);
  assert(metrics.width * metrics.height * metrics.pixelRatio ** 2 <= 2_400_001, 'Raster budget exceeded');
  rows.push({ view, ...metrics });
}
async function verifyZoomStops(view) {
  for(const direction of [1,-1]) {
    for(let i=0;i<90;i++)spatial.zoom(direction);
    await settled();
    const zoom=spatial.metrics().zoom,stop=direction>0?zoom.min:zoom.max;
    assert(Math.abs(zoom.distance-stop)<.01,`${view}: zoom misses its hard stop`);
    assert(direction>0?!zoom.canZoomIn:!zoom.canZoomOut,`${view}: stopped zoom remains enabled`);
    const held=frames;
    for(let i=0;i<5;i++)spatial.zoom(direction);
    await settled(false);
    assert(frames===held,`${view}: repeated stopped zoom rendered ${frames-held} extra frames (${JSON.stringify(spatial.metrics().zoom)})`);
    zoomChecks.push({view,direction,...zoom});
  }
}
try {
  const started = performance.now();
  spatial = createSpatialScene({ container: stage, preferences:{graphics}, clock:testClock, shadowComparison:params.has('shadows'), onFrame(state) {
    latest = state; frames++;
    if (state.moving && !state.transitionType) objectFrames++;
    if(spatial) maxFrameCalls=Math.max(maxFrameCalls,spatial.metrics().calls);
  } });
  await settled(); const readyMs = Math.round(performance.now() - started);
  sample('tower', params.has('shadows')?85:69);
  await verifyZoomStops('tower');spatial.goTo('tower',null,{instant:true,reset:true});await settled();
  // Include all five sharp floors plus the uncached city and its four new ground/park batches.
  spatial.goTo('explore', null, { instant: true }); await settled(); sample('explore', 85);
  await verifyZoomStops('explore');spatial.goTo('explore',null,{instant:true,reset:true});await settled();
  for (const id of ['about', 'projects', 'experience', 'resume', 'contact']) {
    // Count both the sharp interior and the small scenery/blur passes.
    spatial.goTo('section', id, { instant: true }); await settled(); sample(id, 75);
    if(id==='about'){await verifyZoomStops(id);spatial.overview();await settled();}
    for (const [index, room] of floorContent[id].rooms.entries()) {
      spatial.focusRoom(index, { instant: true }); await settled(); sample(`${id}/${room.id}`, 75);
      if(id==='about'&&index===0){await verifyZoomStops(`${id}/${room.id}`);spatial.focusRoom(index,{instant:true});await settled();}
      const objects = spatial.objectsForRoom(id, index), before = spatial.metrics();
      assert(objects.length >= 5, `${id}/${room.id}: missing interactive objects`);
      const beforeObjectFrames = objectFrames;
      spatial.hoverObject(objects[0].id);
      for (const object of objects) spatial.activateObject(object.id);
      for (let attempt = 0; attempt < 200 && objectFrames === beforeObjectFrames; attempt++) await delay(35);
      assert(objectFrames > beforeObjectFrames, `${id}/${room.id}: object responses never rendered`);
      assert(spatial.metrics().calls <= 75, 'Object animations exceed the interior draw budget');
      await settled(false);
      const held = frames; await delay(120); assert(frames === held, 'Holding an object hover keeps rendering');
      spatial.hoverObject(null); await settled();
      const after = spatial.metrics();
      assert(after.geometries === before.geometries && after.textures === before.textures && after.programs === before.programs, 'Object responses allocate new GPU resources');
      objectChecks.push({room:`${id}/${room.id}`, objects:objects.length, calls:after.calls});
    }
  }
  const idle = frames; await delay(250); const idleFrames = frames - idle; assert(idleFrames === 0, 'Idle scene continues rendering');
  spatial.goTo('tower', null, { instant: true }); await settled();
  const memory = spatial.metrics().geometries;
  for (let i = 0; i < 3; i++) {
    spatial.goTo('section', 'projects', { instant: true }); await settled();
    spatial.goTo('tower', null, { instant: true }); await settled();
  }
  assert(spatial.metrics().geometries === memory, 'Repeated navigation grows GPU geometry allocations');
  const timeMemory=spatial.metrics(),beforeClock=frames,initialHour=testHour;
  spatial.refreshTime();await settled(false);assert(frames===beforeClock,'Unchanged minute does not redraw');
  const clockChanges=[];
  for(const hour of [22,6,18,10,initialHour]) {
    const changed=testHour!==hour;testHour=hour;spatial.refreshTime();await settled(changed);
    const metrics=spatial.metrics();clockChanges.push(metrics.timeOfDay);
    assert(metrics.timeOfDay.hour===hour,'A live clock change reaches the rendered scene');
    assert(metrics.geometries===timeMemory.geometries&&metrics.textures===timeMemory.textures&&metrics.programs===timeMemory.programs,'Day/night updates reuse GPU geometry, targets and programs');
  }
  const compactViewport = width <= 760 || Math.min(width,height) <= 480;
  async function resizeCycle() {
    stage.style.width = `${compactViewport ? 1280 : 390}px`; stage.style.height = `${compactViewport ? 720 : 844}px`; await settled();
    stage.style.width = `${width}px`; stage.style.height = `${height}px`; await settled();
  }
  await resizeCycle(); const resizedMemory = spatial.metrics().geometries;
  for (let i = 0; i < 3; i++) await resizeCycle();
  assert(spatial.metrics().geometries === resizedMemory, 'Repeated phone/desktop resizing grows GPU allocations');
  assert(maxFrameCalls <= 100, `Transition/background passes exceed 100 draws: ${maxFrameCalls}`);
  // Exercise both live graphics paths, including repeated changes after GPU warm-up.
  spatial.goTo('section','projects',{instant:true}); await settled();
  // Each terrain variant uploads once on first use; compare allocations only
  // after both have rendered, then reject any growth on subsequent switches.
  for(const quality of ['standard','low']){spatial.setPreferences({graphics:quality});await settled();}
  const qualityChecks = [], allocated = new Map();
  for (const quality of ['standard','low','standard','low','standard','low',graphics]) {
    spatial.setPreferences({graphics:quality}); await settled();
    const metrics = spatial.metrics();
    assert(metrics.background === (quality === 'low' ? 'simplified' : 'blurred'), 'Live graphics switch leaves stale scenery');
    assert(metrics.backdrop.blurPasses === (quality === 'low' ? 0 : 2), 'Low graphics must skip both blur passes');
    const previous = allocated.get(quality);
    if (previous) assert(metrics.geometries === previous.geometries && metrics.textures === previous.textures && metrics.programs === previous.programs, 'Repeated graphics changes grow GPU resources');
    allocated.set(quality,metrics); qualityChecks.push(metrics);
  }
  assert(allocated.get('low').pixelRatio < allocated.get('standard').pixelRatio, 'Low graphics does not reduce resolution');
  assert(allocated.get('low').calls < allocated.get('standard').calls, 'Low graphics does not reduce draw calls');
  output.textContent = JSON.stringify({ viewport: `${width}x${height}`, graphics, requestedDpr: requestedDpr || devicePixelRatio, userAgent: navigator.userAgent, readyMs, idleFramesOver250ms: idleFrames, maxFrameCalls, stableGeometryCount: memory, stableGeometryAfterResize: resizedMemory, clockChanges, objectChecks, zoomChecks, qualityChecks, rows }, null, 2);
  spatial.dispose();
  assert(stage.querySelector('canvas') === null, 'Disposal leaves a canvas behind');
  assert(spatial.metrics().geometries === 0, 'Disposal leaves uploaded GPU geometries behind');
  assert(spatial.metrics().textures === 0, 'Disposal leaves city blur targets behind');
  status.textContent = 'PASS — render budgets, all floors and close-ups, idle rendering, stable memory, and GPU disposal';
} catch (error) {
  spatial?.dispose(); status.textContent = `FAIL — ${error.message}`; output.textContent += `\n${error.stack}`;
}
