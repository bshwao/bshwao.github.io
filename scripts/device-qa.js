// Developer-only check for a real browser/device. No external analytics or settings changes.
const frame = document.querySelector('#portfolio'), run = document.querySelector('#run');
const status = document.querySelector('#status'), output = document.querySelector('#results');
const saveStatus = document.querySelector('#save-status');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let report = null, running = false, interrupted = false;
const round = value => Math.round(value * 10) / 10;
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)] ?? null;
function metadata() {
  return { userAgent: navigator.userAgent, platform: navigator.platform, touchPoints: navigator.maxTouchPoints,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    appViewport: { width: frame.clientWidth, height: frame.clientHeight },
    screen: { width: screen.width, height: screen.height }, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
}
document.addEventListener('visibilitychange', () => { if (running && document.hidden) interrupted = true; });
addEventListener('resize', () => { if (running) interrupted = true; });
async function settled() {
  for (let i = 0; i < 200; i++) {
    const main = frame.contentDocument?.querySelector('#main');
    const intro = frame.contentDocument?.querySelector('#portfolio-intro');
    const enter = intro?.querySelector('#intro-enter');
    if (intro?.open && enter && !enter.disabled) enter.click();
    if (main?.dataset.transition === 'idle' && main.dataset.cameraMotion === 'idle' && !intro?.open && !main.inert) return;
    if (main?.dataset.mode === 'fallback') throw new Error('3D is unavailable on this browser. Open the full portfolio to use its reading view.');
    await pause(50);
  }
  throw new Error('The model did not become ready. Open the full portfolio to check its fallback.');
}
function loadProbe() {
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); frame.removeEventListener('load', loaded); };
    const loaded = () => { cleanup(); resolve(); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('The test preview could not load. Refresh this page and try again.')); }, 15000);
    frame.addEventListener('load', loaded);
    frame.src = '/scripts/frame-probe.html';
  });
}
function assertVisible() {
  if (interrupted || document.hidden) throw new Error('The page was hidden or resized during measurement. Run again with this page visible and the device held steady.');
  const bounds = frame.getBoundingClientRect();
  if (bounds.top < 0 || bounds.bottom > innerHeight + 2) throw new Error('The preview moved off screen during measurement. Scroll to the top and run again.');
}
function orbit() {
  let active = true, token;
  const win = frame.contentWindow, doc = frame.contentDocument;
  const step = () => {
    if (!active) return;
    doc.querySelector('canvas')?.dispatchEvent(new win.KeyboardEvent('keydown', {key:'ArrowLeft',bubbles:true,cancelable:true}));
    token = win.requestAnimationFrame(step);
  };
  step();
  return () => { active = false; win.cancelAnimationFrame(token); };
}
async function sample(name, action, duration) {
  assertVisible(); frame.contentWindow.frameProbe.length = 0;
  const stop = action();
  try { await pause(duration); } finally { stop?.(); }
  assertVisible();
  const samples = frame.contentWindow.frameProbe;
  const intervals = samples.slice(1).map((entry, i) => entry.time - samples[i].time).filter(value => value > 0);
  if (intervals.length < 3) throw new Error(`Insufficient rendered frames for ${name}.`);
  const total = intervals.reduce((a, b) => a + b, 0), canvas = frame.contentDocument.querySelector('canvas');
  report.rows.push({ name, frames:intervals.length, fps:round(intervals.length * 1000 / total), medianMs:round(percentile(intervals,.5)),
    p95Ms:round(percentile(intervals,.95)), callbackP95Ms:round(percentile(samples.map(entry=>entry.cpu),.95)),
    over33ms:intervals.filter(value=>value>33.34).length, detail:canvas.dataset.detail, quality:canvas.dataset.quality || '0', buffer:{width:canvas.width,height:canvas.height} });
  await pause(400);
}
async function persist(kind) {
  report.kind = kind;
  report.deviceLabel = document.querySelector('#device-label').value.trim();
  report.manual = Object.fromEntries([...document.querySelectorAll('input[name="manual"]')].map(input => [input.value,input.checked]));
  output.textContent = JSON.stringify(report,null,2);
  try {
    const response = await fetch('/__device-results', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});
    if (!response.ok) throw new Error(`Local receiver returned ${response.status}`);
    const saved = await response.json();
    saveStatus.textContent = `Saved on the PC: ${saved.file}.`;
  } catch (error) { saveStatus.textContent = `Could not save on the PC. Keep this page open; measured results are available below. ${error.message}`; }
}
run.addEventListener('click', async () => {
  if (running) return;
  running = true; interrupted = false; run.disabled = true; document.querySelector('#save').disabled = true;
  report = null;
  status.textContent = 'Preparing the performance check…';
  output.textContent = 'Preparing a fresh preview…';
  saveStatus.textContent = 'Results will be saved after measurement finishes.';
  try {
    for (const input of document.querySelectorAll('input[name="manual"]')) input.checked = false;
    // The frame stays visible at a fixed size while results are collected below it.
    const available = innerHeight - document.querySelector('header').getBoundingClientRect().height;
    document.querySelector('#stage').style.height = `${Math.max(200, available)}px`;
    document.querySelector('#manual').open = false;
    scrollTo(0,0);
    await loadProbe();
    await settled();
    if (frame.contentDocument.querySelector('#main').dataset.motion === 'reduced') throw new Error('Select Full motion in the preview’s Settings before running the animation benchmark. You can restore Reduced motion afterward.');
    // Preparing/scrolling the page may resize Safari's viewport before measurement.
    interrupted = false;
    report = {version:1,kind:'automatic',createdAt:new Date().toISOString(),...metadata(),rows:[],manual:{},deviceLabel:''};
    const doc = frame.contentDocument;
    for (const [name,action,duration] of [
      ['tower orbit',orbit,4000],
      ['unfold',()=>{doc.querySelector('#unfold-structure').click();},1800],
      ['explore orbit',orbit,4000],
      ['open projects',()=>{doc.querySelector('#tower-labels [data-section="projects"]').click();},2200],
      ['floor orbit',orbit,4000],
      ['room flight',()=>{doc.querySelector('#station-navigation [data-station="1"]').click();},1400]
    ]) { status.textContent = `Measuring ${name}…`; await sample(name,action,duration); await settled(); }
    await settled();
    const before = frame.contentWindow.frameProbe.length;
    await pause(500);
    report.idleFramesOver500ms = frame.contentWindow.frameProbe.length - before;
    const gl = doc.querySelector('canvas').getContext('webgl2'), debug = gl?.getExtension('WEBGL_debug_renderer_info');
    report.renderer = gl ? (debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : 'Unavailable';
    report.qualityTrace = frame.contentWindow.frameQualityTrace;
    report.status = 'COMPLETE'; report.hiddenOrResizeDuringRun = interrupted;
    assertVisible();
    status.textContent = 'Benchmark complete. You can use the live model now; manual checks are below.';
    await persist('automatic'); document.querySelector('#save').disabled = false;
  } catch (error) {
    status.textContent = `Check stopped: ${error.message}`;
    if (report) { report.status = 'INCOMPLETE'; report.error = error.message; output.textContent=JSON.stringify(report,null,2); }
    else output.textContent = status.textContent;
  } finally { running = false; run.disabled = false; }
});
document.querySelector('#save').addEventListener('click',()=>persist('manual'));
