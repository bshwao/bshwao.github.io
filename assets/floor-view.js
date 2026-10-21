import { rooms } from './content.js';
import { floorContent } from './floor-content.js';
import { createFloorPlan, planLayouts } from './floor-plans.js';
import { renderStory, renderGallery, renderCaseStudyLink, renderProjectStatus } from './project-story.js';

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function renderLink(link) {
  const external = /^https?:/.test(link.href);
  return `<a href="${escape(link.href)}"${link.download ? ` download="${escape(link.download)}"` : ''}${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escape(link.label)} <span aria-hidden="true">${link.download ? '↓' : '↗'}</span></a>`;
}

function renderRoom(sectionId, room, layout) {
  const headingId = `plan-${sectionId}-${room.id}-title`;
  return `<section class="floor-room" id="plan-${sectionId}-${room.id}" style="grid-column:${layout.column};grid-row:${layout.row}" aria-labelledby="${headingId}">
    <header class="floor-room-header"><p class="floor-room-name">${escape(room.number)} / ${escape(room.name)}</p><h3 id="${headingId}" tabindex="-1">${escape(room.title)}</h3></header>
    <div class="floor-room-scroll">
      ${renderProjectStatus(room.status)}
      ${room.description ? `<p class="floor-room-description">${escape(room.description)}</p>` : ''}
      ${renderCaseStudyLink(room.projectId)}
      ${room.facts ? `<div class="floor-facts">${room.facts.map(fact => `<div><strong>${escape(fact.value)}</strong><span>${escape(fact.label)}</span></div>`).join('')}</div>` : ''}
      ${(room.paragraphs || []).map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}
      ${renderStory(room.story)}
      ${room.bullets ? `<ul>${room.bullets.map(item => `<li>${escape(item)}</li>`).join('')}</ul>` : ''}
      ${(room.entries || []).map(entry => `<article class="floor-entry"><h4>${escape(entry.title)}</h4>${entry.subtitle ? `<p>${escape(entry.subtitle)}</p>` : ''}${entry.detail ? `<p>${escape(entry.detail)}</p>` : ''}</article>`).join('')}
      ${room.tags ? `<div class="floor-tags">${room.tags.map(tag => `<span>${escape(tag)}</span>`).join('')}</div>` : ''}
      ${renderGallery(room.images)}
    </div>
    <span class="room-scroll-cue" aria-hidden="true" hidden>MORE BELOW ↓</span>
    ${room.links ? `<footer class="floor-room-links">${room.links.map(renderLink).join('')}</footer>` : ''}
  </section>`;
}

export function createFloorExperience({ page, scene, towerSvg, floors, reducedMotion, onCloseRequest }) {
  const dialog = document.querySelector('#room-dialog');
  const collapse = document.querySelector('#collapse-tower');
  const sheet = document.querySelector('#floor-sheet');
  const closeButton = document.querySelector('#close-room');
  const visualFloors = [...scene.querySelectorAll('.tower-floor-visual')].sort((a, b) => Number(a.style.getPropertyValue('--floor-index')) - Number(b.style.getPropertyValue('--floor-index')));
  const sourceBounds = visualFloors.map(floor => floor.getBBox());
  let currentId = null;
  let phase = 'tower';
  let revision = 0;
  let selectedFloor = null;

  function setCamera(id) {
    const index = rooms.findIndex(room => room.id === id);
    const bounds = sourceBounds[index];
    const visual = visualFloors[index];
    const viewBox = towerSvg.viewBox.baseVal;
    const { width, height } = page.getBoundingClientRect();
    const drawingScale = Math.min(width / viewBox.width, height / viewBox.height);
    const offsetX = (width - viewBox.width * drawingScale) / 2;
    const offsetY = (height - viewBox.height * drawingScale) / 2;
    const dx = parseFloat(visual.style.getPropertyValue('--expand-x')) || 0;
    const dy = parseFloat(visual.style.getPropertyValue('--expand-y')) || 0;
    const centerX = offsetX + (bounds.x + bounds.width / 2 + dx - viewBox.x) * drawingScale;
    const centerY = offsetY + (bounds.y + bounds.height / 2 + dy - viewBox.y) * drawingScale;
    const zoom = Math.max(1.8, Math.min(5.5, width * .88 / (bounds.width * drawingScale), height * .72 / (bounds.height * drawingScale)));
    page.style.setProperty('--segment-zoom', zoom);
    page.style.setProperty('--segment-x', `${-(centerX - width / 2) * zoom}px`);
    page.style.setProperty('--segment-y', `${-(centerY - height / 2) * zoom}px`);
    visualFloors.forEach((element, i) => element.classList.toggle('is-selected', i === index));
    floors.forEach((element, i) => element.classList.toggle('is-selected', i === index));
  }

  function measureRooms() {
    if (!dialog.open) return;
    const stacked = window.matchMedia('(max-width: 850px)').matches;
    sheet.querySelectorAll('.floor-room').forEach(room => {
      const body = room.querySelector('.floor-room-scroll');
      const overflow = !stacked && body.scrollHeight > body.clientHeight + 3;
      const more = overflow && body.scrollTop + body.clientHeight < body.scrollHeight - 5;
      body.tabIndex = overflow ? 0 : -1;
      if (overflow) body.setAttribute('aria-label', `Read more: ${room.querySelector('h3').textContent}`);
      else body.removeAttribute('aria-label');
      room.querySelector('.room-scroll-cue').hidden = !more;
    });
  }

  function render(id) {
    const section = rooms.find(room => room.id === id);
    const content = floorContent[id];
    const layout = planLayouts[id];
    document.querySelector('#room-location').textContent = `LEVEL ${section.number} / INTERIOR PLAN`;
    document.querySelector('#room-title').textContent = section.name;
    document.querySelector('#floor-description').textContent = content.note;
    const index = rooms.indexOf(section);
    const previous = rooms[(index + rooms.length - 1) % rooms.length];
    const next = rooms[(index + 1) % rooms.length];
    document.querySelector('#floor-navigation').innerHTML = `<a href="#${previous.id}" data-room="${previous.id}" aria-label="Previous floor: ${escape(previous.name)}">← <span>${escape(previous.name)}</span></a><a href="#${next.id}" data-room="${next.id}" aria-label="Next floor: ${escape(next.name)}"><span>${escape(next.name)}</span> →</a>`;
    sheet.innerHTML = `<div class="plan-map"><div class="floor-plan-art">${createFloorPlan(id)}</div><div class="plan-hotspots">${content.rooms.map((room, i) => {
      const position = layout.rooms[i];
      const x = (position.x + position.width / 2) / 12;
      const y = (position.y + position.height / 2) / 8;
      return `<button type="button" data-plan-room="plan-${id}-${room.id}" style="left:${x}%;top:${y}%" aria-label="Go to room ${room.number}: ${escape(room.title)}"><span>${escape(room.number)}</span><span class="hotspot-label" aria-hidden="true">${escape(room.title)}</span></button>`;
    }).join('')}</div></div><div class="floor-rooms">${content.rooms.map((room, index) => renderRoom(id, room, layout.rooms[index])).join('')}</div>`;
    document.querySelector('.floor-scroll').scrollTop = 0;
  }

  async function enter(id, { animate = true } = {}) {
    if (!floorContent[id] || (currentId === id && phase === 'floor')) return;
    const token = ++revision;
    const changePlan = dialog.open;
    currentId = id;
    selectedFloor = floors.find(floor => floor.dataset.room === id);
    phase = 'entering';
    scene.inert = true;
    collapse.disabled = true;
    page.classList.add('is-entering-floor');
    document.querySelector('#hint-text').textContent = `ENTERING ${rooms.find(room => room.id === id).name.toUpperCase()}…`;
    if (changePlan) {
      dialog.classList.remove('is-visible');
      await pause(animate && !reducedMotion.matches ? 170 : 0);
      if (token !== revision) return;
    }
    render(id);
    setCamera(id);
    scene.classList.add('is-zoomed');
    if (!changePlan) {
      await pause(animate && !reducedMotion.matches ? 850 : 0);
      if (token !== revision) return;
      dialog.showModal();
    }
    // Establish the initial plan pose before animating to the top-down view.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (token !== revision) return;
    dialog.classList.add('is-visible');
    phase = 'floor';
    closeButton.focus({ preventScroll: true });
    measureRooms();
  }

  async function leave({ expanded = true, animate = true } = {}) {
    if (phase === 'tower') return;
    const token = ++revision;
    const focusTarget = expanded ? selectedFloor : document.querySelector('#tower-trigger');
    phase = 'leaving';
    currentId = null;
    document.querySelector('#hint-text').textContent = 'RETURNING TO TOWER…';
    dialog.classList.remove('is-visible');
    scene.classList.remove('is-zoomed');
    visualFloors.forEach(element => element.classList.remove('is-selected'));
    floors.forEach(element => element.classList.remove('is-selected'));
    await pause(animate && !reducedMotion.matches ? 260 : 0);
    if (token !== revision) return;
    if (dialog.open) dialog.close();
    await pause(animate && !reducedMotion.matches ? 590 : 0);
    if (token !== revision) return;
    phase = 'tower';
    page.classList.remove('is-entering-floor');
    scene.inert = false;
    collapse.disabled = false;
    document.querySelector('#hint-text').textContent = expanded ? 'CHOOSE A LEVEL TO EXPLORE' : 'CLICK THE STRUCTURE TO UNFOLD';
    focusTarget?.focus({ preventScroll: true });
  }

  closeButton.addEventListener('click', onCloseRequest);
  dialog.addEventListener('cancel', event => { event.preventDefault(); onCloseRequest(); });
  dialog.addEventListener('click', event => {
    const jump = event.target.closest('[data-plan-room]');
    if (!jump) return;
    const target = document.getElementById(jump.dataset.planRoom);
    target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    target.querySelector('h3').focus({ preventScroll: true });
  });
  dialog.addEventListener('scroll', event => {
    if (event.target.classList?.contains('floor-room-scroll')) measureRooms();
  }, { capture: true, passive: true });
  new ResizeObserver(() => {
    if (currentId) setCamera(currentId);
    measureRooms();
  }).observe(page);

  return { enter, leave, get active() { return phase !== 'tower'; } };
}
