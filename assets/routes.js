import { floorContent } from './floor-content.js';

export function parseRoute(hash = '') {
  const decodeSegment = segment => {
    try { return decodeURIComponent(segment ?? ''); } catch { return ''; }
  };
  const [section, room, ...extra] = hash.replace(/^#/, '').split('/');
  const sectionId = decodeSegment(section), roomId = decodeSegment(room);
  if (Object.hasOwn(floorContent, sectionId)) {
    const index = floorContent[sectionId].rooms.findIndex(room => room.id === roomId);
    return { mode: 'section', sectionId, roomIndex: extra.length || index < 0 ? null : index };
  }
  return { mode: sectionId === 'explore' && room === undefined ? 'explore' : 'tower', sectionId: null, roomIndex: null };
}

export function routeHash({ mode = 'section', sectionId, roomIndex = null }) {
  if (mode === 'section' && Object.hasOwn(floorContent, sectionId)) {
    const room = Number.isInteger(roomIndex) ? floorContent[sectionId].rooms[roomIndex] : null;
    return `#${sectionId}${room ? `/${room.id}` : ''}`;
  }
  return mode === 'explore' ? '#explore' : '#tower';
}
