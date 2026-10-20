import { createSkyscraper } from './skyscraper.js';
import { rooms } from './content.js';
import { createFloorExperience } from './floor-view.js';

const $ = selector => document.querySelector(selector);
$('#tower-art').innerHTML = createSkyscraper();
const towerSvg = $('#tower-art > svg');
towerSvg.setAttribute('viewBox', '0 -40 1100 1220');
document.body.classList.add('js-enabled');

const dialog = $('#room-dialog');
const page = $('#main');
const scene = $('#tower-scene');
const trigger = $('#tower-trigger');
const collapse = $('#collapse-tower');
const floors = rooms.map(room => document.querySelector(`.tower-floor[data-room="${room.id}"]`));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const geometryBounds = [...document.querySelectorAll('.tower-floor-visual')].map(floor => floor.getBBox());
const towerBounds = {
  left: Math.min(...geometryBounds.map(box => box.x)),
  right: Math.max(...geometryBounds.map(box => box.x + box.width)),
  top: Math.min(...geometryBounds.map(box => box.y)),
  bottom: Math.max(...geometryBounds.map(box => box.y + box.height)),
};
// Frame the actual geometry, keeping the spire and broad base visible on phones.
function fitOpeningStructure() {
  const { width, height } = page.getBoundingClientRect();
  const viewBox = towerSvg.viewBox.baseVal;
  const drawingScale = Math.min(width / viewBox.width, height / viewBox.height);
  const availableHeight = Math.max(240, height - (width <= 700 ? 130 : 85));
  const availableWidth = Math.max(230, width - 38);
  const scale = Math.min(availableHeight / (drawingScale * (towerBounds.bottom - towerBounds.top)), availableWidth / (drawingScale * (towerBounds.right - towerBounds.left)));
  const centerX = (towerBounds.left + towerBounds.right) / 2;
  const centerY = (towerBounds.top + towerBounds.bottom) / 2;
  page.style.setProperty('--closed-scale', String(scale));
  page.style.setProperty('--closed-x', `${-(centerX - viewBox.x - viewBox.width / 2) * drawingScale * scale}px`);
  page.style.setProperty('--closed-y', `${-25 - (centerY - viewBox.y - viewBox.height / 2) * drawingScale * scale}px`);
  page.style.setProperty('--tower-hit-width', `${Math.min(width - 16, (towerBounds.right - towerBounds.left) * drawingScale * scale + 30)}px`);
  const visibleHeight = (towerBounds.bottom - towerBounds.top) * drawingScale * scale;
  page.style.setProperty('--tower-hit-top', `${Math.max(0, height / 2 - 25 - visibleHeight / 2 - 12)}px`);
  page.style.setProperty('--tower-hit-bottom', `${Math.max(0, height / 2 + 25 - visibleHeight / 2 - 12)}px`);
}
fitOpeningStructure();
new ResizeObserver(fitOpeningStructure).observe(page);
let currentRoom = null;
let expanded = false;
let expansionTimer;

function setExpanded(value, { animate = true, focus = true } = {}) {
  if (expanded === value) return;
  clearTimeout(expansionTimer);
  expanded = value;
  if (!animate) page.classList.add('skip-transition');
  page.classList.toggle('is-expanded', value);
  scene.classList.toggle('is-expanded', value);
  trigger.hidden = value;
  trigger.setAttribute('aria-expanded', String(value));
  collapse.hidden = !value;
  floors.forEach(floor => {
    floor.setAttribute('aria-hidden', String(!value));
    floor.setAttribute('tabindex', value ? '0' : '-1');
  });
  $('#hint-text').textContent = value ? 'CHOOSE A LEVEL TO EXPLORE' : 'CLICK THE STRUCTURE TO UNFOLD';
  if (!animate) requestAnimationFrame(() => requestAnimationFrame(() => page.classList.remove('skip-transition')));
  if (focus && !value) trigger.focus({ preventScroll: true });
  if (focus && value) {
    expansionTimer = setTimeout(() => {
      if (expanded && !floorExperience.active && !dialog.open && (document.activeElement === document.body || document.activeElement === trigger)) {
        floors[0]?.focus({ preventScroll: true });
      }
    }, reducedMotion.matches || !animate ? 0 : 1500);
  }
}

function highlightRoom(id) {
  floors.forEach(element => {
    element.classList.toggle('is-highlighted', element.dataset.room === id);
  });
}

const floorExperience = createFloorExperience({ page, scene, towerSvg, floors, reducedMotion, onCloseRequest: closeRoom });

function renderRoom(id, { animate = true } = {}) {
  const room = rooms.find(item => item.id === id);
  currentRoom = room?.id || null;
  highlightRoom(currentRoom);
  if (room) void floorExperience.enter(id, { animate });
  else void floorExperience.leave({ expanded, animate });
}

function closeRoom() {
  history.replaceState(null, '', `${location.pathname}${location.search}#explore`);
  currentRoom = null;
  highlightRoom(null);
  void floorExperience.leave({ expanded: true });
}

function navigateToRoom(id) {
  if (!expanded || !rooms.some(room => room.id === id)) return;
  if (location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
  renderRoom(id);
}

document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-room]');
  if (!trigger) return;
  // Preserve normal modified-link behavior (e.g. opening a deep link in a new tab).
  if (trigger.tagName.toLowerCase() === 'a' && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
  event.preventDefault();
  navigateToRoom(trigger.dataset.room);
});

$('#tower-art').addEventListener('keydown', event => {
  const trigger = event.target.closest('[data-room]');
  if (!trigger || !expanded) return;
  const index = floors.indexOf(trigger);
  const direction = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 0;
  if (direction || event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? floors.length - 1 : (index + direction + floors.length) % floors.length;
    floors[next].focus({ preventScroll: true });
    return;
  }
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  navigateToRoom(trigger.dataset.room);
});

scene.addEventListener('pointerover', event => {
  const target = event.target.closest('[data-room]');
  if (target) highlightRoom(target.dataset.room);
});
scene.addEventListener('pointerleave', () => highlightRoom(currentRoom));
scene.addEventListener('focusin', event => {
  const target = event.target.closest('[data-room]');
  if (target) highlightRoom(target.dataset.room);
});
scene.addEventListener('focusout', event => {
  if (!event.relatedTarget?.closest('#tower-art [data-room]')) highlightRoom(currentRoom);
});

trigger.addEventListener('click', () => {
  history.pushState(null, '', '#explore');
  setExpanded(true);
});
collapse.addEventListener('click', () => {
  history.pushState(null, '', `${location.pathname}${location.search}#tower`);
  setExpanded(false);
  highlightRoom(null);
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (currentRoom) {
    event.preventDefault();
    closeRoom();
  } else if (expanded) {
    event.preventDefault();
    collapse.click();
  }
});

function syncRoute({ animate = true, focus = true } = {}) {
  const id = location.hash.slice(1);
  const isRoom = rooms.some(room => room.id === id);
  setExpanded(id === 'explore' || isRoom, { animate, focus });
  renderRoom(isRoom ? id : null, { animate });
}
window.addEventListener('popstate', () => syncRoute());
window.addEventListener('hashchange', () => syncRoute());
syncRoute({ animate: false, focus: false });
