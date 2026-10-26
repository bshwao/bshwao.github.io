import { sections } from './tower-geometry.js';
import { floorContent } from './floor-content.js';
import { roomMarkerLayout, towerLabelLayout, outdoorViewLayout } from './spatial-layout.js';
import { parseRoute, routeHash } from './routes.js';
import { renderStory, renderGallery, renderCaseStudyLink, renderProjectStatus, renderProjectSummary } from './project-story.js';
import { createSectionReadingView } from './floor-view.js';
import { sectionColors } from './color-theme.js';
import { createLocalClock } from './local-clock.js';
import { readViewPreferences, saveViewPreferences, shouldReduceMotion } from './view-preferences.js';
import { createPortfolioIntro } from './portfolio-intro.js';
import { penthouseGameMarkup, createPenthousePlay } from './penthouse-play.js';
import { penthouseExperienceMarkup,createPenthouseExperiences } from './penthouse-experiences.js';

const page = document.querySelector('#main');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let spatial, currentId = null, currentRoomIndex = null, revision = 0;
const defaultTitle = document.title;
let routeKey = '', fallbackActive = false;
let readingView, localClock, intro, penthousePlay, penthouseExperiences;
let preferenceStorage;
try { preferenceStorage = window.localStorage; } catch { /* Private browsing may deny storage. */ }
let viewPreferences = readViewPreferences(preferenceStorage);
const $ = selector => page.querySelector(selector);
const labelSizes = new WeakMap();
const labelObserver = new ResizeObserver(entries => {
  let changed = false;
  for (const entry of entries || []) {
    const box = entry.borderBoxSize?.[0];
    const width = box?.inlineSize ?? entry.contentRect.width;
    const height = box?.blockSize ?? entry.contentRect.height;
    const previous = labelSizes.get(entry.target);
    // Hidden labels keep their last useful measurement until they are shown again.
    if (width > 0 && height > 0 && (previous?.width !== width || previous?.height !== height)) {
      labelSizes.set(entry.target, { width, height }); changed = true;
    }
  }
  if (changed) spatial?.refreshLabels();
});
function observeLabels() {
  labelObserver.disconnect();
  page.querySelectorAll('.tower-label, .station-marker-label').forEach(node => labelObserver.observe(node));
}
const setData = (node, key, value) => { if (node.dataset[key] !== value) node.dataset[key] = value; };
const setStyle = (node, key, value) => { if (node.style.getPropertyValue(key) !== value) node.style.setProperty(key, value); };
const link = item => `<a href="${escape(item.href)}"${item.download ? ` download="${escape(item.download)}"` : ''}${/^https?:/.test(item.href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escape(item.label)} <span aria-hidden="true">↗</span></a>`;

function roomMarkup(room, index) {
  const objects = spatial?.objectsForRoom(currentId, index) || [];
  const counts = new Map();
  const objectControls = objects.map(object => {
    const count = (counts.get(object.name) || 0) + 1; counts.set(object.name, count);
    const label = `${object.name}${count > 1 ? ` ${count}` : ''}`;
    const opens=currentId==='penthouse'&&/Bedroom computer monitor|Telescope|Vinyl record|Game controller|Game console|Arcade machine/.test(object.name);
    return `<button type="button" data-room-object="${object.id}" aria-label="${opens?'Open':'Animate'} ${escape(label)}">${escape(label)} <span aria-hidden="true">${opens?'↗':'↻'}</span></button>`;
  }).join('');
  return `<p class="spatial-eyebrow">${escape(room.number)} / ${escape(room.name)}</p>
    <h3 id="interior-room-title" tabindex="-1">${escape(room.title)}</h3>
    ${renderProjectStatus(room.status)}
    ${room.projectId ? `<div class="project-actions">${renderCaseStudyLink(room.projectId)}${(room.links || []).map(link).join('')}</div>` : ''}
    ${room.summary ? renderProjectSummary(room.summary) : room.description ? `<p class="interior-intro">${escape(room.description)}</p>` : ''}
    ${currentId==='penthouse'?penthouseExperienceMarkup(index):''}
    ${room.facts ? `<dl class="interior-facts">${room.facts.map(item => `<div><dt>${escape(item.value)}</dt><dd>${escape(item.label)}</dd></div>`).join('')}</dl>` : ''}
    ${(room.paragraphs || []).map(text => `<p>${escape(text)}</p>`).join('')}
    ${renderStory(room.story)}
    ${penthouseGameMarkup(room.activity)}
    ${room.bullets ? `<ul>${room.bullets.map(text => `<li>${escape(text)}</li>`).join('')}</ul>` : ''}
    ${(room.entries || []).map(item => `<section class="interior-entry"><h4>${escape(item.title)}</h4>${item.subtitle ? `<p>${escape(item.subtitle)}</p>` : ''}${item.detail ? `<p>${escape(item.detail)}</p>` : ''}</section>`).join('')}
    ${room.tags ? `<ul class="interior-tags" aria-label="Skills and topics">${room.tags.map(text => `<li>${escape(text)}</li>`).join('')}</ul>` : ''}
    ${renderGallery(room.images)}
    ${room.links && !room.projectId ? `<div class="interior-links">${room.links.map(link).join('')}</div>` : ''}
    ${objects.length ? `<details class="room-objects"><summary>Play with room objects</summary><p>Hover or focus to highlight. Click, tap, or press Enter to animate.</p><div>${objectControls}</div></details>` : ''}`;
}

function selectRoom(index, { focus = false, moveCamera = true, writeRoute = true } = {}) {
  if (!currentId) return;
  const content = floorContent[currentId];
  if (!Number.isInteger(index) || !content.rooms[index]) return;
  if (moveCamera && writeRoute) {
    navigate(routeHash({ sectionId: currentId, roomIndex: index }), { force: true });
    if (focus) $('#interior-room-title').focus({ preventScroll: true });
    return;
  }
  const restoreFocus = $('#interior-content').contains(document.activeElement);
  $('#interior-content').innerHTML = roomMarkup(content.rooms[index], index);
  penthousePlay?.mount();
  penthouseExperiences?.mount(currentId,index);
  $('#interior-content').scrollTop = 0;
  $('#interior-panel').scrollTop = 0;
  page.querySelectorAll('[data-station]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.station) === index)));
  if (moveCamera) spatial.focusRoom(index);
  if (focus || restoreFocus) $('#interior-room-title').focus({ preventScroll: true });
}

function sectionMarkup(id) {
  const section = sections.find(item => item.id === id);
  const content = floorContent[id];
  $('#spatial-level').textContent = `LEVEL ${section.number} / ${section.theme.toUpperCase()}`;
  $('#spatial-title').textContent = section.name;
  $('#station-navigation').innerHTML = content.rooms.map((room, i) => `<button type="button" data-station="${i}" aria-pressed="${i === 0}" aria-label="Explore room ${escape(room.number)}: ${escape(room.name)}"><span>${escape(room.number)}</span>${escape(room.name)}<span class="station-navigation-arrow" aria-hidden="true">↗</span></button>`).join('');
  $('#station-markers').innerHTML = content.rooms.map((room, i) => `<button type="button" class="station-marker" data-station="${i}" aria-pressed="${i === 0}" aria-label="Explore room ${escape(room.number)}: ${escape(room.name)}"><span>${escape(room.number)}</span><span class="station-marker-label" aria-hidden="true">${escape(room.name)}<span class="station-marker-action">Explore room ↗</span></span></button>`).join('');
  observeLabels();
  const index = sections.indexOf(section);
  const previous = sections[(index + sections.length - 1) % sections.length], next = sections[(index + 1) % sections.length];
  $('#interior-navigation').innerHTML = `<a href="#${previous.id}" data-section="${previous.id}" aria-label="Previous floor: ${escape(previous.name)}">← ${escape(previous.name)}</a><a href="#${next.id}" data-section="${next.id}" aria-label="Next floor: ${escape(next.name)}">${escape(next.name)} →</a>`;
  $('#interior-note').textContent = content.note || '';
  $('#interior-note').hidden = !content.note;
  selectRoom(0, { moveCamera: false });
}

function navigate(hash, { force = false } = {}) {
  const target = hash.startsWith('#') ? hash : `#${hash}`;
  if (location.hash === target && !force) return;
  if (location.hash !== target) history.pushState(null, '', target);
  syncRoute({ force });
}

function syncRoute({ instant = false, force = false } = {}) {
  if (parseRoute(location.hash).mode !== 'tower') intro?.dismiss();
  if (!spatial || fallbackActive) return;
  const route = parseRoute(location.hash);
  const { mode, sectionId: id, roomIndex } = route;
  const key = `${mode}:${id || ''}:${roomIndex ?? ''}`;
  if (key === routeKey && !instant && !force) return;
  routeKey = key;
  const token = ++revision;
  const oldId = currentId;
  const sameSection = id && oldId === id && page.dataset.transition === 'idle';
  currentId = id;
  if(id!=='penthouse')penthouseExperiences?.mount(id,null);
  page.dataset.sectionTheme = id || '';
  currentRoomIndex = roomIndex;
  const sectionName = sections.find(section => section.id === id)?.name;
  document.title = id ? `${roomIndex === null ? '' : `${floorContent[id].rooms[roomIndex].title} · `}${sectionName} — Eric Hsu` : defaultTitle;
  const projectId = id === 'projects' && roomIndex !== null ? floorContent.projects.rooms[roomIndex].projectId : null;
  $('#complete-portfolio').href = `./reading.html${projectId ? `#project-${projectId}` : id ? `#${id === 'resume' ? 'education' : id}` : ''}`;
  $('#complete-portfolio').textContent = projectId ? 'Full case study ↗' : 'Full portfolio ↗';
  $('#share-status').textContent = '';
  $('#share-url').hidden = true;
  $('#reading-view').hidden = mode !== 'section';
  if (readingView.active) {
    if (id) readingView.show(id, roomIndex);
    else readingView.close({ focus: false });
  }
  if (sameSection) {
    if (roomIndex === null) {penthouseExperiences?.mount(id,0);spatial.overview();}
    else selectRoom(roomIndex, { writeRoute: false });
    return;
  }
  page.dataset.mode = mode;
  page.dataset.transition = 'moving';
  page.classList.remove('is-settled');
  $('#interior-panel').inert = true;
  $('#interior-panel').hidden = mode !== 'section';
  $('#spatial-heading').hidden = mode !== 'section';
  $('#back-to-structure').hidden = mode !== 'section';
  $('#collapse-structure').hidden = mode !== 'explore';
  $('#unfold-structure').inert = mode !== 'tower';
  $('#tower-labels').inert = true;
  $('#station-markers').inert = true;
  $('#tower-labels').setAttribute('aria-hidden', String(mode !== 'explore'));
  $('#station-markers').setAttribute('aria-hidden', String(mode !== 'section'));
  $('#interior-content').setAttribute('aria-busy', String(mode === 'section'));
  $('#spatial-hint').textContent = id ? 'OPENING THE INTERIOR…' : mode === 'explore' ? 'CHOOSE A SECTION TO EXPLORE' : 'CLICK THE STRUCTURE TO UNFOLD';
  if (id) {
    sectionMarkup(id);
    if (roomIndex !== null) selectRoom(roomIndex, { moveCamera: false });
  }
  spatial.goTo(mode, id, { instant, onComplete() {
    if (token !== revision) return;
    page.dataset.transition = 'idle';
    page.classList.add('is-settled');
    $('#interior-panel').inert = mode !== 'section';
    $('#tower-labels').inert = mode !== 'explore';
    $('#station-markers').inert = mode !== 'section';
    $('#interior-content').setAttribute('aria-busy', 'false');
    if (id && roomIndex !== null) spatial.focusRoom(roomIndex, { instant });
    $('#spatial-hint').textContent = id ? 'SELECT A ROOM TO EXPLORE' : mode === 'explore' ? 'CHOOSE A SECTION TO EXPLORE' : 'CLICK THE STRUCTURE TO UNFOLD';
    if (readingView.active) return;
    if (id && !instant) $('#interior-room-title').focus({ preventScroll: true });
    else if (mode === 'explore' && !instant) (oldId ? $(`#tower-labels [data-section="${oldId}"]`) : $('#tower-labels button'))?.focus({ preventScroll: true });
    else if (mode === 'tower' && !instant) $('#unfold-structure').focus({ preventScroll: true });
  } });
}

function onFrame(state) {
  if (!state.transitionType && page.dataset.transition === 'idle') intro?.ready();
  setData(page, 'motion', state.reducedMotion ? 'reduced' : 'full');
  setData(document.documentElement, 'motion', state.reducedMotion ? 'reduced' : 'full');
  $('#zoom-in').disabled=Boolean(state.transitionType)||!state.zoom.canZoomIn;
  $('#zoom-out').disabled=Boolean(state.transitionType)||!state.zoom.canZoomOut;
  setData(page,'zoomDistance',state.zoom.distance.toFixed(3));
  setData(page,'zoomMin',state.zoom.min.toFixed(3));
  setData(page,'zoomMax',state.zoom.max.toFixed(3));
  const timeLabel=page.querySelector('.material-key small');
  const timeText=`CITY / ${state.timeOfDay.toUpperCase()}`;
  if(timeLabel&&timeLabel.textContent!==timeText)timeLabel.textContent=timeText;
  setStyle(page, '--interior-progress', state.panel.toFixed(4));
  setData(page, 'azimuth', state.azimuth.toFixed(3));
  setData(page, 'polar', state.polar.toFixed(3));
  setData(page, 'cameraMotion', state.transitionType || 'idle');
  setData(page, 'focusedRoom', state.focusedRoom === null ? '' : String(state.focusedRoom));
  const hoveredRoom = state.hoveredRoom ?? null;
  setData(page, 'hoveredRoom', hoveredRoom === null ? '' : String(hoveredRoom));
  for (const node of page.querySelectorAll('[data-station]')) setData(node, 'hovered', String(Number(node.dataset.station) === hoveredRoom));
  if (currentId && page.dataset.transition === 'idle') {
    const room = floorContent[currentId].rooms[hoveredRoom];
    const hint = state.hoveredObject ? `${state.hoveredObject.toUpperCase()} / CLICK TO ANIMATE`
      : room ? `EXPLORE ROOM ${room.number} / ${room.name.toUpperCase()}` : 'HOVER OBJECTS · CLICK OR TAP TO ANIMATE';
    if ($('#spatial-hint').textContent !== hint) $('#spatial-hint').textContent = hint;
  }
  const { width, height } = state.viewport;
  setData(page, 'layout', state.viewport.stacked ? 'stacked' : 'split');
  const overview = $('#floor-overview');
  if (overview.disabled !== (state.focusedRoom === null)) overview.disabled = state.focusedRoom === null;
  const viewStatus = state.focusedRoom === null ? 'FLOOR OVERVIEW' : `ROOM ${String(state.focusedRoom + 1).padStart(2, '0')} / CLOSE VIEW`;
  if ($('#room-view-status').textContent !== viewStatus) $('#room-view-status').textContent = viewStatus;
  const nodes = state.mode === 'section' ? $('#station-markers').children : $('#tower-labels').children;
  if (state.mode !== 'section') {
    const layout = outdoorViewLayout(width, height, 'explore').labelLayout;
    setData($('#tower-labels'), 'layout', layout);
    setData(page, 'labelLayout', layout);
  }
  const towerLabels = state.mode === 'section' ? null : towerLabelLayout(state.labels.map(item => {
    const node = [...nodes].find(element => element.dataset.section === item.id);
    const size = labelSizes.get(node);
    return { ...item, labelWidth: size?.width, labelHeight: size?.height };
  }), width, height);
  if (towerLabels) {
    setData($('#tower-labels'), 'layout', towerLabels.layout);
    setData(page, 'labelLayout', towerLabels.layout);
  }
  const points = state.mode === 'section' ? roomMarkerLayout(state.labels.map(item => {
    const caption = nodes[Number(item.id)]?.querySelector('.station-marker-label');
    const size = labelSizes.get(caption);
    return { ...item, captionWidth: size?.width, captionHeight: size?.height };
  }), state.viewport, state.activeRoom, hoveredRoom) : towerLabels.points;
  for (const item of points) {
    const node = state.mode === 'section' ? nodes[Number(item.id)] : [...nodes].find(element => element.dataset.section === item.id);
    if (!node) continue;
    if (state.mode === 'section') {
      if (node.hidden !== !item.shown) node.hidden = !item.shown;
      setData(node, 'captionHidden', String(!item.captionShown));
      node.style.left = `${item.x}px`; node.style.top = `${item.y}px`;
      const dx = item.sourceX - item.x, dy = item.sourceY - item.y;
      node.style.setProperty('--leader-length', `${Math.hypot(dx, dy)}px`);
      node.style.setProperty('--leader-angle', `${Math.atan2(dy, dx)}rad`);
      continue;
    }
    node.style.left = towerLabels.layout === 'dock' ? '' : `${item.x}px`;
    node.style.top = towerLabels.layout === 'dock' ? '' : `${item.y}px`;
    node.style.visibility = 'visible';
    node.dataset.leader = String(item.leader);
    const dx = item.leader ? item.sourceX - item.x : 0, dy = item.leader ? item.sourceY - item.y : 0;
    node.style.setProperty('--tower-leader-length', `${item.leader ? Math.hypot(dx, dy) : 0}px`);
    node.style.setProperty('--tower-leader-angle', `${Math.atan2(dy, dx)}rad`);
    node.style.setProperty('--tower-anchor-x', `${item.leader ? dx : 0}px`);
    node.style.setProperty('--tower-anchor-y', `${item.leader ? dy : 0}px`);
    if (item.side) node.dataset.side = String(item.side);
  }
}

function useFallback() {
  if (fallbackActive) return;
  intro?.dispose();
  fallbackActive = true; revision++;
  labelObserver.disconnect();
  readingView?.close({ focus: false });
  localClock?.dispose();
  penthousePlay?.dispose();
  penthouseExperiences?.dispose();
  spatial?.dispose();
  page.className = 'tower-page unavailable';
  for (const name of [...page.attributes].map(attribute => attribute.name)) if (name.startsWith('data-') || name === 'style') page.removeAttribute(name);
  const route = parseRoute(location.hash);
  const anchor = route.sectionId === 'projects' && route.roomIndex !== null ? `project-${floorContent.projects.rooms[route.roomIndex].projectId}` : route.sectionId === 'resume' ? 'education' : route.sectionId;
  page.innerHTML = `<section class="unavailable-content" aria-labelledby="unavailable-title"><p class="spatial-eyebrow">ERIC HSU / STRUCTURES & SYSTEMS</p><h1 id="unavailable-title" tabindex="-1">The 3D view is unavailable.</h1><p>Try reloading to open the 3D structure, or read the complete portfolio below.</p><button type="button" id="retry-spatial">Reload 3D view ↗</button><a href="./reading.html${anchor ? `#${anchor}` : ''}" id="unavailable-portfolio">Read the complete portfolio ↗</a><nav aria-label="Portfolio sections">${sections.map(section => `<a href="./reading.html#${section.id === 'resume' ? 'education' : section.id}">${escape(section.name)}</a>`).join('')}</nav></section>`;
  $('#retry-spatial').addEventListener('click', () => location.reload());
  $('#unavailable-title').focus({ preventScroll: true });
}

async function start() {
  document.body.classList.add('js-enabled');
  let introStorage;
  try { introStorage = window.sessionStorage; } catch { /* Storage may be denied. */ }
  const introMotion = matchMedia('(prefers-reduced-motion: reduce)');
  intro = createPortfolioIntro({
    dialog: document.querySelector('#portfolio-intro'), page, storage: introStorage,
    reducedMotion: () => shouldReduceMotion(viewPreferences.motion, introMotion.matches),
    onEntered: () => spatial?.focus(),
  });
  addEventListener('pagehide', event => { if (!event.persisted) {intro.dispose();penthouseExperiences?.dispose();} });
  page.className = 'tower-page spatial';
  page.innerHTML = `
    <h1 class="sr-only">Eric Hsu — Electrical Engineering, Projects, and Experience</h1>
    <div class="spatial-stage" id="spatial-stage"></div>
    <div class="drawing-reference" aria-hidden="true"><span>EH—001</span><span>STRUCTURES & SYSTEMS</span></div>
    <div class="material-key">${sections.map(section => `<span aria-hidden="true" style="--swatch:${sectionColors[section.id].accent}"></span>`).join('')}<small aria-hidden="true">CITY / LOCAL TIME</small><time id="local-clock" aria-live="off"></time></div>
    <div class="spatial-tools" role="group" aria-label="View controls">
      <div class="zoom-controls" role="group" aria-label="Zoom"><button type="button" id="zoom-out" aria-label="Zoom out" disabled>−</button><button type="button" id="zoom-in" aria-label="Zoom in" disabled>+</button></div>
      <button type="button" id="reset-spatial" aria-label="Reset the 3D camera" disabled>↺ <span>Reset view</span></button>
      <button type="button" id="reading-view" aria-haspopup="dialog" aria-controls="room-dialog" hidden>Reading view</button>
      <details class="view-settings" id="view-settings"><summary>Settings</summary><div class="view-settings-panel">
        <p class="spatial-eyebrow">YOUR VIEW</p>
        <label for="motion-preference">Motion</label><select id="motion-preference"><option value="system">Use device setting</option><option value="reduced">Reduced motion</option><option value="full">Full motion</option></select>
        <p>Reduced motion skips camera flights and object movement, keeping color feedback.</p>
        <label for="graphics-preference">Graphics</label><select id="graphics-preference"><option value="standard">Standard graphics</option><option value="low">Low graphics</option></select>
        <p>Low graphics uses a lower resolution, simpler scenery and solid panels to ease GPU work.</p>
        <button type="button" id="show-controls-hint">Show controls hint</button><button type="button" id="replay-intro">Replay introduction</button><small>Preferences are saved on this device.</small>
      </div></details>
    </div>
    <aside class="controls-hint" id="controls-hint" aria-label="3D controls"${viewPreferences.controlsSeen ? ' hidden' : ''}><div><strong>Take a look around</strong><p id="controls-hint-text"></p><small>Arrow keys orbit · + / − zoom · Enter selects</small></div><button type="button" id="dismiss-controls-hint" aria-label="Dismiss controls hint">×</button></aside>
    <nav class="tower-labels" id="tower-labels" aria-label="Portfolio sections" aria-hidden="true" inert>${sections.map(section => `<button type="button" class="tower-label" data-section="${section.id}"><span class="spatial-eyebrow">${section.number} / PORTFOLIO</span><span class="tower-label-name">${escape(section.name)}</span><span class="tower-label-subtitle">${section.subtitle}</span></button>`).join('')}</nav>
    <div class="station-markers" id="station-markers" role="group" aria-label="Rooms in this interior" aria-hidden="true" inert></div>
    <button type="button" class="structure-action" id="back-to-structure" hidden>↖ <span>Back to tower</span></button>
    <button type="button" class="structure-action" id="collapse-structure" hidden>↙ <span>Collapse structure</span></button>
    <header class="spatial-heading" id="spatial-heading" hidden><p class="spatial-eyebrow" id="spatial-level"></p><h2 id="spatial-title"></h2></header>
    <aside class="interior-panel" id="interior-panel" aria-label="Interior portfolio content" hidden inert>
      <div class="panel-drawing-index" aria-hidden="true">E.H. / INHABITED SPACES <span>01—04</span></div>
      <div class="interior-viewbar"><p id="room-view-status" aria-live="polite">FLOOR OVERVIEW</p><button id="floor-overview" type="button" disabled>↗ Whole floor</button></div>
      <nav id="station-navigation" class="station-navigation" aria-label="Choose a room"></nav>
      <div id="interior-content" class="interior-content" role="region" aria-labelledby="interior-room-title" tabindex="0"></div>
      <footer class="interior-footer"><p id="interior-note"></p><div class="interior-share"><button id="share-room" type="button">Copy link ↗</button><a id="complete-portfolio" href="./reading.html">Full portfolio ↗</a></div><p id="share-status" role="status"></p><input id="share-url" type="text" readonly aria-label="Link to this view" hidden><nav id="interior-navigation" aria-label="Explore another section"></nav></footer>
    </aside>
    <div class="page-identity"><span class="identity-name">ERIC HSU</span><span>ELECTRICAL ENGINEERING · McGILL</span></div>
    <div class="spatial-bottom"><button type="button" id="unfold-structure" aria-label="Unfold the structure" disabled>+ <span id="spatial-hint" aria-live="polite">DRAWING THE STRUCTURE…</span></button><p id="orbit-instructions">LEFT DRAG TO ORBIT <span>·</span> SCROLL TO ZOOM</p></div>
    <span class="drawing-edition" aria-hidden="true">PORTFOLIO / 2026</span>`;
  localClock = createLocalClock($('#local-clock'));
  readingView = createSectionReadingView({
    onClose: () => $('#reading-view')?.focus({ preventScroll: true }),
    onTower: () => navigate('explore'),
    onNavigate: navigate,
  });
  penthousePlay=createPenthousePlay($('#interior-content'),()=>{
    if(currentId!=='penthouse')return;
    const toy=spatial.objectsForRoom('penthouse',1).find(object=>/controller|arcade/i.test(object.name));
    if(toy)spatial.activateObject(toy.id,{notify:false});
  });
  penthouseExperiences=createPenthouseExperiences({container:$('#interior-content'),
    onAtmosphere:value=>spatial?.setPenthouseAtmosphere(value),
    reducedMotion:()=>shouldReduceMotion(viewPreferences.motion,introMotion.matches)});
  observeLabels();
  $('#reading-view').addEventListener('click', () => { if (currentId) readingView.show(currentId, currentRoomIndex); });
  const { createSpatialScene } = await import('./scene-3d.js');
  if (fallbackActive) return;
  spatial = createSpatialScene({
    container: $('#spatial-stage'),
    preferences: viewPreferences,
    onSelectSection: id => navigate(id || 'explore'),
    onSelectRoom: index => selectRoom(index, { focus: true }),
    onObjectActivate: object => penthouseExperiences?.onObject(object),
    onFrame,
    onContextLost: () => void useFallback(true),
  });
  $('#reset-spatial').disabled = false;
  $('#zoom-in').disabled = false; $('#zoom-out').disabled = false;
  page.dataset.graphics = viewPreferences.graphics;
  document.documentElement.dataset.graphics = viewPreferences.graphics;
  $('#motion-preference').value = viewPreferences.motion;
  $('#graphics-preference').value = viewPreferences.graphics;
  const dismissHint = () => {
    if ($('#controls-hint').hidden) return;
    $('#controls-hint').hidden = true;
    viewPreferences = saveViewPreferences(preferenceStorage, { ...viewPreferences, controlsSeen: true });
  };
  $('#dismiss-controls-hint').addEventListener('click', () => { dismissHint(); spatial.focus(); });
  $('#show-controls-hint').addEventListener('click', () => {
    $('#view-settings').open = false; $('#controls-hint').hidden = false;
    viewPreferences = saveViewPreferences(preferenceStorage, { ...viewPreferences, controlsSeen: false });
    $('#dismiss-controls-hint').focus({ preventScroll: true });
  });
  $('#replay-intro').addEventListener('click', () => {
    $('#view-settings').open = false;
    readingView.close({ focus: false });
    const waitForReady = page.dataset.mode !== 'tower' || page.dataset.cameraMotion !== 'idle';
    if (page.dataset.mode !== 'tower') navigate('tower', { force: true });
    intro.show({ waitForReady });
  });
  const changePreferences = () => {
    viewPreferences = saveViewPreferences(preferenceStorage, { ...viewPreferences, motion: $('#motion-preference').value, graphics: $('#graphics-preference').value });
    page.dataset.graphics = viewPreferences.graphics;
    document.documentElement.dataset.graphics = viewPreferences.graphics;
    spatial.setPreferences(viewPreferences);
  };
  $('#motion-preference').addEventListener('change', changePreferences);
  $('#graphics-preference').addEventListener('change', changePreferences);
  for (const [id, direction] of [['zoom-in', 1], ['zoom-out', -1]]) {
    $(`#${id}`).addEventListener('click', () => { spatial.zoom(direction); dismissHint(); });
  }
  const canvas = $('#spatial-stage canvas');
  canvas.addEventListener('pointerup', event => { if (event.button === 0 || event.pointerType === 'touch') dismissHint(); });
  canvas.addEventListener('wheel', dismissHint, { passive: true });
  canvas.addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Enter', ' '].includes(event.key)) dismissHint(); });
  document.addEventListener('pointerdown', event => { if (!fallbackActive && !event.target.closest('#view-settings')) $('#view-settings').open = false; });
  $('#unfold-structure').disabled = false;
  $('#unfold-structure').addEventListener('click', () => navigate('explore'));
  $('#collapse-structure').addEventListener('click', () => navigate('tower'));
  $('#back-to-structure').addEventListener('click', () => navigate('explore'));
  $('#reset-spatial').addEventListener('click', () => currentId ? navigate(currentId, { force: true }) : spatial.reset());
  $('#floor-overview').addEventListener('click', () => navigate(currentId, { force: true }));
  $('#share-room').addEventListener('click', async () => {
    const hash = routeHash(parseRoute(location.hash));
    const url = new URL(`${location.pathname}${location.search}${hash}`, location.href).href;
    const sharingKey = routeKey;
    try {
      await navigator.clipboard.writeText(url);
      if (!fallbackActive && sharingKey === routeKey) $('#share-status').textContent = 'Link copied.';
    } catch {
      if (fallbackActive || sharingKey !== routeKey) return;
      $('#share-url').value = url; $('#share-url').hidden = false;
      $('#share-status').textContent = 'Copy this link:';
      $('#share-url').focus(); $('#share-url').select();
    }
  });
  page.addEventListener('click', event => {
    if (fallbackActive) return;
    if (event.target.closest('[data-room-object], [data-station], [data-section], #unfold-structure')) dismissHint();
    const object = event.target.closest('[data-room-object]');
    if (object) { spatial.activateObject(Number(object.dataset.roomObject)); return; }
    const station = event.target.closest('[data-station]');
    if (station) { selectRoom(Number(station.dataset.station), { focus: station.classList.contains('station-marker') }); return; }
    const section = event.target.closest('button[data-section], a[data-section]');
    if (!section || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(section.dataset.section);
  });
  const objectButton = node => node?.closest?.('[data-room-object]');
  const objectControls = $('#interior-content');
  const refreshObjectHover = node => spatial.hoverObject(node ? Number(node.dataset.roomObject) : null);
  objectControls.addEventListener('focusin', event => { if (!fallbackActive) refreshObjectHover(objectButton(event.target)); });
  objectControls.addEventListener('focusout', event => { if (!fallbackActive) refreshObjectHover(objectButton(event.relatedTarget)); });
  objectControls.addEventListener('pointerover', event => {
    if (!fallbackActive && event.pointerType !== 'touch' && objectButton(event.target)) refreshObjectHover(objectButton(event.target));
  });
  objectControls.addEventListener('pointerout', event => {
    if (!fallbackActive && event.pointerType !== 'touch' && objectButton(event.target) !== objectButton(event.relatedTarget)) {
      refreshObjectHover(objectButton(event.relatedTarget) || objectButton(document.activeElement));
    }
  });
  $('#station-navigation').addEventListener('keydown', event => {
    const button = event.target.closest('[data-station]');
    if (!button || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...$('#station-navigation').querySelectorAll('button')];
    const index = buttons.indexOf(button);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus({ preventScroll: true }); buttons[next].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    selectRoom(next);
  });
  let pointedRoom = null;
  const roomButton = node => node?.closest?.('[data-station]');
  const refreshRoomHover = () => {
    const focused = roomButton(document.activeElement);
    spatial.hoverRoom(pointedRoom ?? (focused ? Number(focused.dataset.station) : null));
  };
  for (const controls of [$('#station-navigation'), $('#station-markers')]) {
    controls.addEventListener('pointerover', event => {
      if (fallbackActive || event.pointerType === 'touch') return;
      const button = roomButton(event.target);
      if (!button) return;
      pointedRoom = Number(button.dataset.station); refreshRoomHover();
    });
    controls.addEventListener('pointerout', event => {
      if (fallbackActive || roomButton(event.target) === roomButton(event.relatedTarget)) return;
      const next = roomButton(event.relatedTarget);
      pointedRoom = next ? Number(next.dataset.station) : null; refreshRoomHover();
    });
    controls.addEventListener('pointerleave', () => { if (!fallbackActive) { pointedRoom = null; refreshRoomHover(); } });
    controls.addEventListener('focusin', event => {
      if (fallbackActive) return;
      const button = roomButton(event.target);
      if (button) spatial.hoverRoom(Number(button.dataset.station));
    });
    controls.addEventListener('focusout', event => {
      if (fallbackActive) return;
      const next = roomButton(event.relatedTarget);
      spatial.hoverRoom(next ? Number(next.dataset.station) : pointedRoom);
    });
  }
  document.addEventListener('keydown', event => {
    if (fallbackActive || intro.active || readingView.active || document.querySelector('.penthouse-dialog[open]') || event.key !== 'Escape') return;
    if ($('#view-settings').open) { event.preventDefault(); $('#view-settings').open = false; $('#view-settings summary').focus(); return; }
    if (!$('#controls-hint').hidden) { event.preventDefault(); dismissHint(); spatial.focus(); return; }
    if (currentId && currentRoomIndex !== null) { event.preventDefault(); navigate(currentId); return; }
    if (currentId || page.dataset.mode === 'explore') { event.preventDefault(); navigate(currentId ? 'explore' : 'tower'); }
  });
  const route = () => syncRoute();
  addEventListener('popstate', route); addEventListener('hashchange', route);
  const touch = matchMedia('(pointer: coarse)').matches;
  $('#controls-hint-text').textContent = touch ? 'Drag to orbit · Pinch to zoom · Tap the tower or objects to explore.' : 'Left drag to orbit · Scroll to zoom · Click the tower or objects to explore.';
  if (touch) $('#orbit-instructions').textContent = 'DRAG TO ORBIT · PINCH TO ZOOM';
  syncRoute({ instant: true });
}

start().catch(error => { console.warn('The 3D scene could not start:', error); return useFallback(true); });
