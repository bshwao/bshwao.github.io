import { createSpatialScene } from '../assets/scene-3d.js';

const params = new URLSearchParams(location.search);
const width = Math.max(320, Math.min(3840, Number(params.get('width')) || 1280));
const height = Math.max(360, Math.min(2160, Number(params.get('height')) || 720));
const requestedDpr = Number(params.get('dpr'));
if (requestedDpr > 0 && requestedDpr <= 4) Object.defineProperty(window, 'devicePixelRatio', { value: requestedDpr, configurable: true });
const stage = document.querySelector('#stage'); stage.style.width = `${width}px`; stage.style.height = `${height}px`;
const output = document.querySelector('#results'), status = document.querySelector('#status');
const rows = []; let frames = 0, latest, spatial;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function settled() {
  for (let i = 0; i < 200; i++) {
    const before = frames; await delay(35);
    if (latest && !latest.moving && before === frames) return;
  }
  throw new Error('Scene did not settle within seven seconds');
}
function sample(view, limit) {
  const metrics = spatial.metrics();
  assert(metrics.calls <= limit, `${view}: ${metrics.calls} draws exceeds ${limit}`);
  assert(metrics.textures <= (params.has('shadows')?1:0), `${view}: unexpected WebGL texture allocation`);
  assert(metrics.width * metrics.height * metrics.pixelRatio ** 2 <= 2_400_001, 'Raster budget exceeded');
  rows.push({ view, ...metrics });
}
try {
  const started = performance.now();
  spatial = createSpatialScene({ container: stage, shadowComparison:params.has('shadows'), onFrame(state) { latest = state; frames++; } });
  await settled(); const readyMs = Math.round(performance.now() - started);
  sample('tower', params.has('shadows')?85:65);
  spatial.goTo('explore', null, { instant: true }); await settled(); sample('explore', 75);
  for (const id of ['about', 'projects', 'experience', 'resume', 'contact']) {
    spatial.goTo('section', id, { instant: true }); await settled(); sample(id, 45);
    spatial.focusRoom(1, { instant: true }); await settled(); sample(`${id}/room`, 45);
  }
  const idle = frames; await delay(250); const idleFrames = frames - idle; assert(idleFrames === 0, 'Idle scene continues rendering');
  spatial.goTo('tower', null, { instant: true }); await settled();
  const memory = spatial.metrics().geometries;
  for (let i = 0; i < 3; i++) {
    spatial.goTo('section', 'projects', { instant: true }); await settled();
    spatial.goTo('tower', null, { instant: true }); await settled();
  }
  assert(spatial.metrics().geometries === memory, 'Repeated navigation grows GPU geometry allocations');
  const compactViewport = stage.querySelector('canvas').dataset.detail === 'compact';
  async function resizeCycle() {
    stage.style.width = `${compactViewport ? 1280 : 390}px`; stage.style.height = `${compactViewport ? 720 : 844}px`; await settled();
    stage.style.width = `${width}px`; stage.style.height = `${height}px`; await settled();
  }
  await resizeCycle(); const resizedMemory = spatial.metrics().geometries;
  for (let i = 0; i < 3; i++) await resizeCycle();
  assert(spatial.metrics().geometries === resizedMemory, 'Repeated phone/desktop resizing grows GPU allocations');
  output.textContent = JSON.stringify({ viewport: `${width}x${height}`, requestedDpr: requestedDpr || devicePixelRatio, userAgent: navigator.userAgent, readyMs, idleFramesOver250ms: idleFrames, stableGeometryCount: memory, stableGeometryAfterResize: resizedMemory, rows }, null, 2);
  spatial.dispose();
  assert(stage.querySelector('canvas') === null, 'Disposal leaves a canvas behind');
  assert(spatial.metrics().geometries === 0, 'Disposal leaves uploaded GPU geometries behind');
  status.textContent = 'PASS — render budgets, all floors and close-ups, idle rendering, stable memory, and GPU disposal';
} catch (error) {
  spatial?.dispose(); status.textContent = `FAIL — ${error.message}`; output.textContent += `\n${error.stack}`;
}
