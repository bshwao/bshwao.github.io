import { createSpatialScene } from '../assets/scene-3d.js';
import { floorContent } from '../assets/floor-content.js';

const params = new URLSearchParams(location.search);
const width = Math.max(320, Math.min(3840, Number(params.get('width')) || 1280));
const height = Math.max(360, Math.min(2160, Number(params.get('height')) || 720));
const requestedDpr = Number(params.get('dpr'));
let testHour=params.has('hour')?Number(params.get('hour')):10;
const testClock=()=>new Date(2026,9,23,testHour,0,0);
if (requestedDpr > 0 && requestedDpr <= 4) Object.defineProperty(window, 'devicePixelRatio', { value: requestedDpr, configurable: true });
const stage = document.querySelector('#stage'); stage.style.width = `${width}px`; stage.style.height = `${height}px`;
const output = document.querySelector('#results'), status = document.querySelector('#status');
const rows = []; let frames = 0, latest, spatial, maxFrameCalls = 0;
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
  assert(metrics.textures <= 2 + (params.has('shadows')?1:0), `${view}: unexpected WebGL texture allocation`);
  assert(metrics.backdrop.width * metrics.backdrop.height <= 2_400_000, 'City blur exceeds the main canvas raster budget');
  if(view !== 'tower') {
    assert(metrics.backdrop.width === Math.floor(metrics.width*metrics.pixelRatio) && metrics.backdrop.height === Math.floor(metrics.height*metrics.pixelRatio), `${view}: city blur ${metrics.backdrop.width}x${metrics.backdrop.height} must match the ${metrics.width}x${metrics.height} canvas at DPR ${metrics.pixelRatio}`);
  }
  assert(metrics.background === (view === 'tower' ? 'sharp' : 'blurred'), `${view}: incorrect city focus`);
  assert(metrics.width * metrics.height * metrics.pixelRatio ** 2 <= 2_400_001, 'Raster budget exceeded');
  rows.push({ view, ...metrics });
}
try {
  const started = performance.now();
  spatial = createSpatialScene({ container: stage, clock:testClock, shadowComparison:params.has('shadows'), onFrame(state) {
    latest = state; frames++;
    if(spatial) maxFrameCalls=Math.max(maxFrameCalls,spatial.metrics().calls);
  } });
  await settled(); const readyMs = Math.round(performance.now() - started);
  sample('tower', params.has('shadows')?85:65);
  // Include all five sharp floors plus the uncached city and its four new ground/park batches.
  spatial.goTo('explore', null, { instant: true }); await settled(); sample('explore', 85);
  for (const id of ['about', 'projects', 'experience', 'resume', 'contact']) {
    // Count both the sharp interior and the small scenery/blur passes.
    spatial.goTo('section', id, { instant: true }); await settled(); sample(id, 75);
    for (const [index, room] of floorContent[id].rooms.entries()) {
      spatial.focusRoom(index, { instant: true }); await settled(); sample(`${id}/${room.id}`, 75);
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
  const compactViewport = stage.querySelector('canvas').dataset.detail === 'compact';
  async function resizeCycle() {
    stage.style.width = `${compactViewport ? 1280 : 390}px`; stage.style.height = `${compactViewport ? 720 : 844}px`; await settled();
    stage.style.width = `${width}px`; stage.style.height = `${height}px`; await settled();
  }
  await resizeCycle(); const resizedMemory = spatial.metrics().geometries;
  for (let i = 0; i < 3; i++) await resizeCycle();
  assert(spatial.metrics().geometries === resizedMemory, 'Repeated phone/desktop resizing grows GPU allocations');
  assert(maxFrameCalls <= 100, `Transition/background passes exceed 100 draws: ${maxFrameCalls}`);
  output.textContent = JSON.stringify({ viewport: `${width}x${height}`, requestedDpr: requestedDpr || devicePixelRatio, userAgent: navigator.userAgent, readyMs, idleFramesOver250ms: idleFrames, maxFrameCalls, stableGeometryCount: memory, stableGeometryAfterResize: resizedMemory, clockChanges, rows }, null, 2);
  spatial.dispose();
  assert(stage.querySelector('canvas') === null, 'Disposal leaves a canvas behind');
  assert(spatial.metrics().geometries === 0, 'Disposal leaves uploaded GPU geometries behind');
  assert(spatial.metrics().textures === 0, 'Disposal leaves city blur targets behind');
  status.textContent = 'PASS — render budgets, all floors and close-ups, idle rendering, stable memory, and GPU disposal';
} catch (error) {
  spatial?.dispose(); status.textContent = `FAIL — ${error.message}`; output.textContent += `\n${error.stack}`;
}
