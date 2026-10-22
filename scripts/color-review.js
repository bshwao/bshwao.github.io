import { filterMarkup, visionMatrices } from './vision-simulation.js';
let frame = document.querySelector('#portfolio');
const view = document.querySelector('#view');
const viewport = document.querySelector('#viewport'), vision = document.querySelector('#vision');
document.querySelector('#vision-filters').innerHTML = filterMarkup();
function update() {
  const [width, height] = viewport.value.split('x').map(Number);
  frame.width = width; frame.height = height;
  frame.style.filter = Object.hasOwn(visionMatrices, vision.value) ? `url(#vision-${vision.value})` : 'none';
  const next = view.value === 'reading' ? '../reading.html' : `../index.html#${view.value === 'noscript' ? 'tower' : view.value}`;
  const noScripts = view.value === 'noscript';
  const sandbox = noScripts ? 'allow-same-origin' : null;
  const changedSandbox = frame.getAttribute('sandbox') !== sandbox;
  // A fragment navigation can retain an already running document. Recreate the
  // frame when changing script permissions so the no-script review is real.
  if (changedSandbox) {
    const replacement = frame.cloneNode(false);
    replacement.removeAttribute('src');
    frame.replaceWith(replacement); frame = replacement;
  }
  if (noScripts) frame.setAttribute('sandbox', sandbox); else frame.removeAttribute('sandbox');
  if (frame.getAttribute('src') !== next || changedSandbox) frame.src = next;
  document.querySelector('#status').textContent = `${view.selectedOptions[0].textContent} · ${width} × ${height} · ${vision.selectedOptions[0].textContent}`;
}
for (const control of [view, viewport, vision]) control.addEventListener('change', update);
update();
