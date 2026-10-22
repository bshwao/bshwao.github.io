// Exercises the complete app, including its DOM overlays. No results leave this page.
const frame = document.querySelector('iframe');
const output = document.querySelector('#results'), status = document.querySelector('#status');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const params = new URLSearchParams(location.search);
const width = Math.max(320, Math.min(3840, Number(params.get('width')) || 1280));
const height = Math.max(360, Math.min(2160, Number(params.get('height')) || 720));
frame.style.width = `${width}px`; frame.style.height = `${height}px`;
frame.src = `./frame-probe.html${location.search}`;
const rows = [];
const rounded = value => Math.round(value * 10) / 10;
const percentile = (values, fraction) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * fraction)] || 0;
async function sample(name, action, duration) {
  frame.contentWindow.frameProbe.length = 0;
  const stop = action();
  await delay(duration);
  stop?.();
  const data = frame.contentWindow.frameProbe;
  const intervals = data.slice(1).map((entry, index) => entry.time - data[index].time).filter(value => value > 0);
  const elapsed = intervals.reduce((sum, value) => sum + value, 0);
  rows.push({ name, frames: intervals.length, fps: rounded(intervals.length * 1000 / elapsed), medianMs: rounded(percentile(intervals, .5)), p95Ms: rounded(percentile(intervals, .95)), callbackP95Ms: rounded(percentile(data.map(entry => entry.cpu), .95)), detail: frame.contentDocument.querySelector('canvas').dataset.detail, quality: frame.contentDocument.querySelector('canvas').dataset.quality || '0' });
  output.textContent = JSON.stringify({ rows }, null, 2);
  await delay(400);
}
try {
  for (let i = 0; i < 200 && frame.contentDocument?.querySelector('#main')?.dataset.transition !== 'idle'; i++) await delay(50);
  const doc = frame.contentDocument;
  if (!doc.querySelector('canvas')) throw new Error('Scene failed to initialize');
  const orbit = () => {
    let active = true, timer;
    const step = () => {
      doc.querySelector('canvas').dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
      if (active) timer = frame.contentWindow.requestAnimationFrame(step);
    };
    step();
    return () => { active = false; frame.contentWindow.cancelAnimationFrame(timer); };
  };
  await sample('tower orbit', orbit, 4000);
  await sample('unfold', () => { doc.querySelector('#unfold-structure').click(); }, 1800);
  await sample('explore orbit', orbit, 4000);
  await sample('open projects', () => { doc.querySelector('#tower-labels [data-section="projects"]').click(); }, 2200);
  await sample('floor orbit', orbit, 4000);
  await sample('room flight', () => { doc.querySelector('#station-navigation [data-station="1"]').click(); }, 1400);
  const gl = doc.querySelector('canvas').getContext('webgl2');
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  let contextLossFallback = null;
  if (params.has('contextLoss')) {
    const loss = gl.getExtension('WEBGL_lose_context');
    if (!loss) throw new Error('Context-loss extension unavailable');
    loss.loseContext();
    for (let i = 0; i < 100 && !doc.querySelector('#unavailable-title'); i++) await delay(50);
    contextLossFallback = !!doc.querySelector('#unavailable-title') && !doc.querySelector('canvas') && !!doc.querySelector('#unavailable-portfolio');
    if (!contextLossFallback) throw new Error('Context loss did not release the canvas and expose the reading fallback');
  }
  output.textContent = JSON.stringify({ viewport: `${width}x${height}`, simulatedFrameDelayMs: Math.max(0, Math.min(50, Number(params.get('delay')) || 0)), userAgent: navigator.userAgent, renderer, contextLossFallback, qualityTrace: frame.contentWindow.frameQualityTrace, rows }, null, 2);
  status.textContent = 'COMPLETE — timings describe this browser and machine, not other devices.';
} catch (error) {
  status.textContent = `FAIL — ${error.message}`;
}
