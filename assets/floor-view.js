import { rooms } from './content.js';
import { floorContent } from './floor-content.js';
import { createFloorPlan, planLayouts } from './floor-plans.js';
import { renderStory, renderGallery, renderCaseStudyLink, renderProjectStatus, renderProjectSummary } from './project-story.js';

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

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
      ${room.summary ? renderProjectSummary(room.summary) : room.description ? `<p class="floor-room-description">${escape(room.description)}</p>` : ''}
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

export function createSectionReadingView({ onClose, onTower, onNavigate }) {
  const dialog = document.querySelector('#room-dialog');
  const sheet = document.querySelector('#floor-sheet');
  const closeButton = document.querySelector('#close-room');
  let currentId = null;
  let currentRoomIndex = null;

  function measureRooms() {
    if (!dialog.open) return;
    const stacked = window.matchMedia('(max-width: 850px)').matches;
    sheet.querySelectorAll('.floor-room').forEach(room => {
      const body = room.querySelector('.floor-room-scroll');
      const overflow = !stacked && body.scrollHeight > body.clientHeight + 3;
      const more = overflow && body.scrollTop + body.clientHeight < body.scrollHeight - 5;
      body.tabIndex = overflow ? 0 : -1;
      if (overflow) { body.setAttribute('role', 'region'); body.setAttribute('aria-label', `Read more: ${room.querySelector('h3').textContent}`); }
      else { body.removeAttribute('role'); body.removeAttribute('aria-label'); }
      room.querySelector('.room-scroll-cue').hidden = !more;
    });
  }

  function render(id) {
    dialog.dataset.sectionTheme = id;
    const section = rooms.find(room => room.id === id);
    const content = floorContent[id];
    const layout = planLayouts[id];
    sheet.classList.add('has-shared-plan');
    document.querySelector('#room-location').textContent = `LEVEL ${section.number} / INTERIOR PLAN`;
    document.querySelector('#room-title').textContent = section.name;
    document.querySelector('#floor-description').textContent = content.note || '';
    document.querySelector('#floor-description').hidden = !content.note;
    const index = rooms.indexOf(section);
    const previous = rooms[(index + rooms.length - 1) % rooms.length];
    const next = rooms[(index + 1) % rooms.length];
    document.querySelector('#floor-navigation').innerHTML = `<a href="#${previous.id}" data-room="${previous.id}" aria-label="Previous floor: ${escape(previous.name)}">← <span>${escape(previous.name)}</span></a><a href="#${next.id}" data-room="${next.id}" aria-label="Next floor: ${escape(next.name)}"><span>${escape(next.name)}</span> →</a>`;
    sheet.innerHTML = `<div class="plan-map"><div class="floor-plan-art">${createFloorPlan(id)}</div><div class="plan-hotspots">${content.rooms.map((room, i) => {
      const position = layout.rooms[i];
      const x = position.anchorX / 12;
      const y = position.anchorY / 8;
      return `<button type="button" data-plan-room="plan-${id}-${room.id}" aria-controls="plan-${id}-${room.id}" style="left:${x}%;top:${y}%" aria-label="Go to room ${room.number}: ${escape(room.title)}"><span>${escape(room.number)}</span><span class="hotspot-label" aria-hidden="true">${escape(room.title)}</span></button>`;
    }).join('')}</div></div><div class="floor-rooms">${content.rooms.map((room, index) => renderRoom(id, room, layout.rooms[index])).join('')}</div>`;
    document.querySelector('.floor-scroll').scrollTop = 0;
  }

  function show(id, roomIndex = null) {
    if (!floorContent[id]) return;
    const changed = currentId !== id;
    const opening = !dialog.open;
    const roomChanged = currentRoomIndex !== roomIndex;
    if (changed) render(id);
    currentId = id;
    currentRoomIndex = roomIndex;
    if (opening) dialog.showModal();
    dialog.classList.add('is-visible');
    measureRooms();
    if (!opening && !changed && !roomChanged) return;
    const room = floorContent[id].rooms[roomIndex];
    const target = room ? document.getElementById(`plan-${id}-${room.id}`) : null;
    if (target) {
      target.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      target.querySelector('h3').focus({ preventScroll: true });
    } else closeButton.focus({ preventScroll: true });
  }

  function close({ focus = true } = {}) {
    if (!dialog.open) return;
    dialog.classList.remove('is-visible');
    dialog.close();
    if (focus) onClose();
  }

  closeButton.addEventListener('click', () => close());
  document.querySelector('#reading-tower').addEventListener('click', () => { close({ focus: false }); onTower(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  // Handle Escape here as well so it never reaches the 3D section's route handler.
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault(); event.stopPropagation(); close();
  });
  dialog.addEventListener('click', event => {
    const floor = event.target.closest('[data-room]');
    if (floor && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault(); onNavigate(floor.dataset.room); return;
    }
    const jump = event.target.closest('[data-plan-room]');
    if (!jump) return;
    const target = document.getElementById(jump.dataset.planRoom);
    target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    target.querySelector('h3').focus({ preventScroll: true });
  });
  dialog.addEventListener('scroll', event => {
    if (event.target.classList?.contains('floor-room-scroll')) measureRooms();
  }, { capture: true, passive: true });
  new ResizeObserver(measureRooms).observe(sheet);
  // Images can change the scrollable content after the initial measurement.
  sheet.addEventListener('load', measureRooms, true);

  return { show, close, get active() { return dialog.open; } };
}
