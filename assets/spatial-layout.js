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

/** Reserve real controls before fitting the outdoor model or its section labels. */
export function outdoorViewLayout(width, height, mode = 'tower') {
  const docked = width <= 480;
  const compact = !docked && (height <= 520 || width <= 760);
  const labelLayout = docked ? 'dock' : compact ? 'compact' : 'projected';
  const top = height <= 520 ? 88 : 80;
  const bottom = height - (mode === 'explore' && docked ? 242 : width <= 760 ? 124 : 100);
  const inset = mode === 'explore' && !docked ? Math.min(width * .19, compact ? 148 : 240) : 24;
  const rect = { left: inset, right: width - inset, top, bottom: Math.max(top + 40, bottom) };
  return { width, height, labelLayout, rect, centerX: width / 2, centerY: (rect.top + rect.bottom) / 2 };
}

/** All five section controls remain available, including when zoomed off screen. */
export function towerLabelLayout(points, width, height) {
  const { labelLayout } = outdoorViewLayout(width, height, 'explore');
  if (labelLayout === 'dock') return { layout: labelLayout, points: points.map(point => ({ ...point, shown: true, leader: false })) };
  const top = height <= 520 ? 100 : 104, bottom = height - (width <= 760 ? 118 : 106);
  const result = points.map((point, index) => {
    const labelWidth = point.labelWidth || (labelLayout === 'compact' ? 124 : width <= 1000 ? 160 : 210);
    const labelHeight = point.labelHeight || (labelLayout === 'compact' ? 44 : 72);
    const sourceVisible = point.visible && point.x >= 0 && point.x <= width && point.y >= top && point.y <= bottom;
    const desiredX = point.x + point.side * 26;
    const minX = point.side < 0 ? labelWidth + 18 : 18;
    const maxX = width - (point.side > 0 ? labelWidth + 18 : 18);
    return { ...point, shown: true, sourceX: point.x, sourceY: point.y, labelWidth, labelHeight, sourceVisible,
      x: Math.max(minX, Math.min(maxX, desiredX)),
      y: sourceVisible ? point.y : top + (index + .5) / points.length * (bottom - top) };
  });
  for (const side of [-1, 1]) {
    const column = result.filter(point => point.side === side).sort((a, b) => a.y - b.y);
    for (let i = 0; i < column.length; i++) {
      const item = column[i], previous = column[i - 1];
      item.y = Math.max(top + item.labelHeight / 2, item.y,
        previous ? previous.y + (previous.labelHeight + item.labelHeight) / 2 + 8 : 0);
    }
    for (let i = column.length - 1; i >= 0; i--) {
      const item = column[i], next = column[i + 1];
      item.y = Math.min(item.y, bottom - item.labelHeight / 2,
        next ? next.y - (next.labelHeight + item.labelHeight) / 2 - 8 : Infinity);
    }
  }
  for (const item of result) item.leader = item.sourceVisible && Math.hypot(item.x - item.sourceX, item.y - item.sourceY) <= 105;
  return { layout: labelLayout, points: result };
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
