/** Screen regions shared by camera framing and projected HTML controls. */
export function viewportLayout(width, height) {
  const compactLandscape = width >= 520 && width <= 760 && height <= 520;
  const stacked = width <= 760 && !compactLandscape;
  const panelWidth = stacked ? 0 : Math.min(compactLandscape ? 300 : 390, width * (compactLandscape ? .44 : .34));
  const top = stacked ? 140 : height <= 600 ? 82 : 110;
  const bottom = stacked ? height * .56 - 30 : height - 88;
  const rect = { left: 24, right: width - panelWidth - 24, top, bottom: Math.max(top + 80, bottom) };
  return { width, height, stacked, compactLandscape, panelWidth, rect,
    centerX: (rect.left + rect.right) / 2, centerY: (rect.top + rect.bottom) / 2 };
}

export function roomMarkerLayout(points, layout, activeIndex, hoveredIndex = null) {
  const { rect } = layout;
  const radius = 22;
  const gap = radius * 2 + 10;
  const placed = [];
  const result = points.map(item => ({ ...item, shown: false, captionShown: false, sourceX: item.x, sourceY: item.y }));
  // Keep the selected room first; nearby secondary rooms remain available in the panel.
  const order = [...result].sort((a, b) => Number(Number(b.id) === activeIndex) - Number(Number(a.id) === activeIndex) || Number(a.id) - Number(b.id));
  for (const item of order) {
    if (!item.visible || item.x < rect.left || item.x > rect.right || item.y < rect.top || item.y > rect.bottom) continue;
    for (const [dx, dy] of [[0, 0], [0, -gap], [0, gap], [-gap, 0], [gap, 0]]) {
      const x = item.sourceX + dx, y = item.sourceY + dy;
      if (x - radius < rect.left || x + radius > rect.right || y - radius < rect.top || y + radius > rect.bottom) continue;
      if (placed.some(other => Math.hypot(x - other.x, y - other.y) < gap)) continue;
      Object.assign(item, { x, y, shown: true }); placed.push(item); break;
    }
  }
  // Captions must fit as complete labels. Keep the numbered control available
  // when its label would cross the panel, viewport edge, or another room.
  const captions = [];
  for (const item of order) {
    if (!item.shown || ![activeIndex, hoveredIndex].includes(Number(item.id))) continue;
    const width = item.captionWidth || 150;
    const height = item.captionHeight || (Number(item.id) === hoveredIndex ? 34 : 18);
    const bounds = { left: item.x - width / 2, right: item.x + width / 2, top: item.y + radius + 7, bottom: item.y + radius + 7 + height };
    if (bounds.left < rect.left || bounds.right > rect.right || bounds.bottom > rect.bottom) continue;
    if (placed.some(other => other !== item && bounds.left < other.x + radius + 4 && bounds.right > other.x - radius - 4 && bounds.top < other.y + radius + 4 && bounds.bottom > other.y - radius - 4)) continue;
    if (captions.some(other => bounds.left < other.right + 4 && bounds.right > other.left - 4 && bounds.top < other.bottom + 4 && bounds.bottom > other.top - 4)) continue;
    item.captionShown = true; captions.push(bounds);
  }
  return result;
}
