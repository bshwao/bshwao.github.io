import { introSessionKey } from '../assets/portfolio-intro.js';
import { sections } from '../assets/tower-geometry.js';

const width = Number(new URLSearchParams(location.search).get('width')) || 1280;
const height = Number(new URLSearchParams(location.search).get('height')) || 720;
const frame = document.querySelector('#portfolio'); frame.width = width; frame.height = height;
const rows = [], results = document.querySelector('#results'), status = document.querySelector('#status');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function ready({allowIntro=false}={}) {
  for (let i = 0; i < 300; i++) {
    const main = frame.contentDocument?.querySelector('#main');
    const route = frame.contentWindow.location.hash.slice(1).split('/')[0];
    const expected = !route || route === 'tower' ? 'tower' : route === 'explore' ? 'explore' : 'section';
    const animations = frame.contentDocument?.getAnimations().some(animation => animation.playState === 'running');
    const intro=frame.contentDocument?.querySelector('#portfolio-intro');
    if (main?.dataset.mode === expected && main.dataset.transition === 'idle' && main.dataset.cameraMotion === 'idle' && !animations && (allowIntro||(!intro?.open&&!main.inert))) return;
    await delay(50);
  }
  throw new Error('Portfolio did not settle');
}
async function audit(view) {
  status.textContent = `Checking ${view}…`;
  for (let i = 0; i < 50 && frame.contentDocument.getAnimations().some(animation => animation.playState === 'running'); i++) await delay(50);
  if (!frame.contentWindow.axe) {
    const script = frame.contentDocument.createElement('script');
    script.src = new URL('../node_modules/axe-core/axe.min.js', location.href).href;
    const loaded = new Promise((resolve, reject) => { script.onload = resolve; script.onerror = () => reject(new Error('Run npm ci before this local audit')); });
    frame.contentDocument.head.append(script); await loaded;
  }
  const axe = frame.contentWindow.axe;
  const result = await axe.run(frame.contentDocument, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
  const controlsResolve = [...frame.contentDocument.querySelectorAll('[aria-controls]')].every(node => node.getAttribute('aria-controls').split(/\s+/).every(id => frame.contentDocument.getElementById(id)));
  if (!controlsResolve) throw new Error('An ARIA control references a missing element');
  const summarize = item => ({ id: item.id, impact: item.impact, help: item.help, url: item.helpUrl, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) });
  rows.push({ view, checksPassed: result.passes.length, controlsResolve, violations: result.violations.map(summarize), manualReview: result.incomplete.map(summarize) });
  results.textContent = JSON.stringify({ viewport: `${width}x${height}`, axeVersion: axe.version, rows }, null, 2);
}
try {
  try { sessionStorage.removeItem(introSessionKey); } catch { /* A fresh intro also works when storage is denied. */ }
  frame.src = '../index.html'; await ready({allowIntro:true});
  const intro=frame.contentDocument.querySelector('#portfolio-intro');
  if(!intro?.open)throw new Error('Fresh entry did not show its introduction');
  await audit('portfolio intro');
  intro.querySelector('#intro-enter').click();await ready();await audit('tower');
  frame.contentDocument.querySelector('#view-settings').open = true;
  await audit('view settings');
  const graphics = frame.contentDocument.querySelector('#graphics-preference');
  graphics.value = 'low'; graphics.dispatchEvent(new Event('change',{bubbles:true})); await ready();
  await audit('low graphics settings');
  graphics.value = 'standard'; graphics.dispatchEvent(new Event('change',{bubbles:true})); await ready();
  frame.contentDocument.querySelector('#view-settings').open = false;
  frame.contentDocument.querySelector('#show-controls-hint').click(); await audit('controls hint');
  frame.contentDocument.querySelector('#dismiss-controls-hint').click();
  for (const route of ['explore',...sections.map(({id})=>id==='penthouse'?'penthouse/b':id==='projects'?'projects/b':id==='resume'?'resume/d':id)]) {
    frame.contentWindow.location.hash = route;
    await delay(20); await ready(); await audit(route);
  }
  for(const [room,button,dialogId]of [['a','[data-bedroom-desktop]','penthouse-desktop-dialog'],['b','[data-penthouse-open="arcade"]','penthouse-arcade-dialog'],['c','[data-music-expand]','penthouse-music-dialog'],['d','[data-penthouse-open="sky"]','penthouse-sky-dialog']]){
    frame.contentWindow.location.hash=`penthouse/${room}`;await delay(20);await ready();await audit(`penthouse/${room} activities`);
    frame.contentDocument.querySelector(button).click();await delay(50);await audit(dialogId);
    const dialog=frame.contentDocument.getElementById(dialogId);
    if(room==='b')for(const game of ['2048','sudoku']){dialog.querySelector(`[data-arcade-tab="${game}"]`).click();await audit(`arcade ${game}`);}
    if(room==='a'){dialog.querySelector('[data-desktop-launch="editor"]').click();await delay(250);await audit('bedroom code studio');}
    dialog.close();await delay(20);
  }
  frame.contentWindow.location.hash='contact';await delay(20);await ready();
  frame.contentDocument.querySelector('.room-objects').open = true;
  await audit('contact object controls');
  frame.contentDocument.querySelector('.room-objects').open = false;
  frame.contentDocument.querySelector('#reading-view').click(); await delay(50); await audit('contact reading dialog');
  for (const {id:route} of sections.filter(section=>section.id!=='contact')) {
    frame.contentWindow.location.hash = route;
    await delay(20); await ready(); await audit(`${route} reading dialog`);
  }
  frame.src = '../reading.html'; await new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
  await audit('complete reading portfolio');
  const count = rows.reduce((sum, row) => sum + row.violations.length, 0);
  status.textContent = count ? `FAIL — ${count} rule violations across ${rows.length} views` : `PASS — ${rows.length} views, no automated WCAG A/AA violations`;
} catch (error) { status.textContent = `FAIL — ${error.message}`; results.textContent += `\n${error.stack}`; }
