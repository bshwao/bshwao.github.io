import { palette, sectionColors } from './color-theme.js';
/** Decorative concept plans. The readable, interactive portfolio content remains HTML. */
const canvas = { x: 100, y: 120, width: 1000, height: 540 };
const room = (column, row, number) => {
  const [firstColumn, lastColumn] = column.split(' / ').map(Number);
  const [firstRow, lastRow] = row.split(' / ').map(Number);
  return {
    number, column, row,
    x: canvas.x + (firstColumn - 1) * canvas.width / 12,
    y: canvas.y + (firstRow - 1) * canvas.height / 6,
    width: (lastColumn - firstColumn) * canvas.width / 12,
    height: (lastRow - firstRow) * canvas.height / 6,
  };
};
const fourRooms = () => [room('1 / 7', '1 / 4', '01'), room('7 / 13', '1 / 4', '02'), room('1 / 7', '4 / 7', '03'), room('7 / 13', '4 / 7', '04')];

export const planLayouts = {
  about: { columns: 12, rows: 6, canvas, rooms: fourRooms() },
  projects: { columns: 12, rows: 6, canvas, rooms: [room('1 / 7', '1 / 7', '01'), room('7 / 13', '1 / 4', '02'), room('7 / 13', '4 / 7', '03')] },
  experience: { columns: 12, rows: 6, canvas, rooms: fourRooms() },
  resume: { columns: 12, rows: 6, canvas, rooms: fourRooms() },
  contact: { columns: 12, rows: 6, canvas, rooms: fourRooms() },
};

const plans = {
  about: {
    title: 'About', core: 'top', leftDoor: 280, rightDoor: 865,
    outline: 'M154 84H430Q450 84 463 68Q469 60 484 60H716Q731 60 737 68Q750 84 770 84H1046Q1136 84 1136 174V606Q1136 696 1046 696H772L747 718H453L428 696H154Q64 696 64 606V174Q64 84 154 84Z',
    furnishings: 'library',
  },
  projects: {
    title: 'Projects', core: 'bottom', leftDoor: 0, rightDoor: 868,
    outline: 'M154 84H414V64H786V84H1046Q1136 84 1136 174V300L1150 324V456L1136 480V606Q1136 696 1046 696H786V718H414V696H154Q64 696 64 606V480L50 456V324L64 300V174Q64 84 154 84Z',
    furnishings: 'workshop',
  },
  experience: {
    title: 'Experience', core: 'top', leftDoor: 350, rightDoor: 805,
    outline: 'M180 76H438Q470 76 494 60Q600 30 706 60Q730 76 762 76H1020Q1140 76 1140 196V584Q1140 704 1020 704H180Q60 704 60 584V196Q60 76 180 76Z',
    furnishings: 'laboratory',
  },
  resume: {
    title: 'Résumé', core: 'top', leftDoor: 220, rightDoor: 945,
    outline: 'M154 84H400V62H800V84H1046Q1136 84 1136 174V254L1150 274V506L1136 526V606Q1136 696 1046 696H800V718H400V696H154Q64 696 64 606V526L50 506V274L64 254V174Q64 84 154 84Z',
    furnishings: 'archive',
  },
  contact: {
    title: 'Contact', core: 'bottom', leftDoor: 350, rightDoor: 820,
    outline: 'M150 90H416Q450 90 476 68Q600 28 724 68Q750 90 784 90H1050Q1140 90 1140 210V590Q1140 710 1050 710H782Q748 710 724 723Q600 752 476 723Q452 710 418 710H150Q60 710 60 590V210Q60 90 150 90Z',
    furnishings: 'reception',
  },
};

export function createFloorPlan(sectionId) {
  const id = Object.hasOwn(plans, sectionId) ? sectionId : 'about';
  const plan = plans[id];
  const layout = planLayouts[id];
  const ink = sectionColors[id].ink;
  const n = (value) => Number(value.toFixed(2));
  const line = (x1, y1, x2, y2, extra = '') => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" ${extra}/>`;
  const rect = (x, y, width, height, extra = '') => `<rect x="${x}" y="${y}" width="${width}" height="${height}" ${extra}/>`;
  const text = (x, y, label, extra = '') => `<text x="${x}" y="${y}" fill="${ink}" stroke="none" font-family="Consolas, 'Liberation Mono', monospace" ${extra}>${label}</text>`;
  const wall = (d, width = 4.2) => `<path d="${d}" stroke="${ink}" stroke-width="${width}"/><path d="${d}" stroke="#fff" stroke-width="${width - 1.8}"/>`;
  const doubleRect = (x, y, width, height) => rect(x, y, width, height, `fill="#fff" stroke="${ink}" stroke-width=".85"`) + rect(x + 3, y + 3, width - 6, height - 6, 'stroke-width=".65"');

  function glazing() {
    let result = '';
    for (const x of [80, 1120]) {
      result += line(x - 4, 185, x - 4, 595, 'stroke-width=".6"') + line(x + 4, 185, x + 4, 595, 'stroke-width=".6"');
      for (let y = 188; y <= 594; y += 14) result += line(x - 5, y, x + 5, y, 'stroke-width=".55"');
    }
    for (const y of [99, 681]) {
      for (const [start, end] of [[184, 405], [795, 1016]]) {
        result += line(start, y - 4, end, y - 4, 'stroke-width=".6"') + line(start, y + 4, end, y + 4, 'stroke-width=".6"');
        for (let x = start; x <= end; x += 14) result += line(x, y - 5, x, y + 5, 'stroke-width=".55"');
      }
    }
    for (const [cx, cy, start] of [[154, 174, 180], [1046, 174, 270], [1046, 606, 0], [154, 606, 90]]) {
      for (const radius of [73, 81]) {
        const points = [];
        for (let angle = start; angle <= start + 90; angle += 5) {
          const a = angle * Math.PI / 180;
          points.push(`${n(cx + Math.cos(a) * radius)},${n(cy + Math.sin(a) * radius)}`);
        }
        result += `<polyline points="${points.join(' ')}" stroke-width=".6"/>`;
      }
      for (let angle = start; angle <= start + 90; angle += 10) {
        const a = angle * Math.PI / 180;
        result += line(cx + Math.cos(a) * 72, cy + Math.sin(a) * 72, cx + Math.cos(a) * 82, cy + Math.sin(a) * 82, 'stroke-width=".55"');
      }
    }
    return result;
  }

  function core(x, y) {
    let result = doubleRect(x, y, 210, 46);
    result += doubleRect(x + 7, y + 6, 72, 34);
    // Two flights and an intermediate landing, with a small direction arrow.
    for (let i = 0; i <= 8; i += 1) result += line(x + 12 + i * 7.4, y + 9, x + 12 + i * 7.4, y + 22, 'stroke-width=".5"');
    for (let i = 0; i <= 8; i += 1) result += line(x + 12 + i * 7.4, y + 25, x + 12 + i * 7.4, y + 37, 'stroke-width=".5"');
    result += `<path d="M${x + 18} ${y + 15}H${x + 67}V${y + 31}H${x + 27}m5-3-5 3 5 3" stroke-width=".65"/>`;
    for (const liftX of [x + 88, x + 126]) {
      result += doubleRect(liftX, y + 6, 32, 34);
      result += `<path d="M${liftX + 5} ${y + 11}l22 24m0-24-22 24" stroke-width=".4" opacity=".55"/>`;
      result += line(liftX + 10, y + 40, liftX + 22, y + 40, 'stroke="#fff" stroke-width="3"');
      result += line(liftX + 16, y + 35, liftX + 16, y + 43, 'stroke-width=".5"');
    }
    result += doubleRect(x + 166, y + 6, 36, 34);
    result += rect(x + 172, y + 12, 9, 10, 'rx="2" stroke-width=".6"');
    result += `<circle cx="${x + 191}" cy="${y + 17}" r="4.3" stroke-width=".6"/>`;
    return result;
  }

  // Keep door swings inside the room padding at every desktop plan scale.
  const doorSize = 22;
  function doorVertical(y, left = false) {
    const direction = left ? -1 : 1;
    const hingeY = left ? y + doorSize : y;
    const endY = left ? y : y + doorSize;
    return `<path class="plan-door" d="M600 ${hingeY}h${direction * doorSize}M600 ${endY}A${doorSize} ${doorSize} 0 0 0 ${600 + direction * doorSize} ${hingeY}" stroke-width=".7"/><circle cx="600" cy="${hingeY}" r="1.1" fill="${ink}" stroke="none"/>`;
  }
  function doorHorizontal(x, up = false) {
    const endY = 390 + (up ? -doorSize : doorSize);
    return `<path class="plan-door" d="M${x} 390V${endY}M${x + doorSize} 390A${doorSize} ${doorSize} 0 0 ${up ? 0 : 1} ${x} ${endY}" stroke-width=".7"/><circle cx="${x}" cy="390" r="1.1" fill="${ink}" stroke="none"/>`;
  }
  function partitions() {
    let result = wall(`M600 115V251M600 ${251 + doorSize}V521M600 ${521 + doorSize}V667`);
    result += doorVertical(251) + doorVertical(521, true);
    if (id !== 'projects') {
      result += wall(`M84 390H${plan.leftDoor}M${plan.leftDoor + doorSize} 390H598`);
      result += doorHorizontal(plan.leftDoor);
    }
    result += wall(`M602 390H${plan.rightDoor}M${plan.rightDoor + doorSize} 390H1116`);
    result += doorHorizontal(plan.rightDoor, true);
    return result;
  }

  function bookshelf(x, y, width) {
    let result = doubleRect(x, y, width, 20);
    result += line(x + 4, y + 10, x + width - 4, y + 10, 'stroke-width=".45"');
    for (let bookX = x + 8; bookX < x + width - 4; bookX += 8) result += line(bookX, y + 4, bookX, y + 16, 'stroke-width=".5"');
    return result;
  }
  function bench(x, y, width, screens = false) {
    let result = rect(x, y, width, 20, 'rx="1" fill="#fff" stroke-width=".7"');
    result += line(x + 3, y + 16, x + width - 3, y + 16, 'stroke-width=".45"');
    for (let itemX = x + 20; itemX < x + width - 15; itemX += 47) {
      result += screens ? rect(itemX - 9, y + 3, 18, 9, 'stroke-width=".55"') + line(itemX, y + 12, itemX, y + 15, 'stroke-width=".55"') : rect(itemX - 7, y + 4, 14, 10, 'stroke-width=".45"');
    }
    return result;
  }
  function furniture() {
    if (plan.furnishings === 'library') return bookshelf(205, 85, 166) + bench(825, 668, 168) + `<path d="M828 672h162M883 672v12M938 672v12" stroke-width=".6"/>`;
    if (plan.furnishings === 'workshop') return bench(205, 85, 178, true) + bench(818, 85, 175, true) + bookshelf(208, 670, 166);
    if (plan.furnishings === 'laboratory') return bench(216, 85, 174, true) + bench(810, 670, 170, true) + `<path d="M827 674h18v9h-18zM922 674h36v10h-36z" stroke-width=".45"/>`;
    if (plan.furnishings === 'archive') return bookshelf(208, 85, 170) + bookshelf(822, 85, 170) + bench(812, 670, 170);
    return `<path d="M440 101Q600 49 760 101L754 112Q600 66 446 112Z" fill="#fff" stroke-width=".75"/><path d="M459 102Q600 62 741 102" stroke-width=".4"/>` + bench(209, 672, 170) + bench(822, 672, 170);
  }

  function entrance() {
    if (id === 'contact') return `<rect x="1104" y="348" width="43" height="72" fill="#fff" stroke="none"/><path d="M1140 350h-34M1140 384A34 34 0 0 1 1106 350M1140 418h-34M1140 384A34 34 0 0 0 1106 418" stroke-width=".75"/>`;
    const top = id === 'projects';
    const y = top ? 64 : id === 'experience' ? 704 : 718;
    const inside = top ? y + 38 : y - 38;
    return `<rect x="558" y="${y - 6}" width="84" height="12" fill="#fff" stroke="none"/><path d="M560 ${y}V${inside}M598 ${y}A38 38 0 0 ${top ? 1 : 0} 560 ${inside}M640 ${y}V${inside}M602 ${y}A38 38 0 0 ${top ? 0 : 1} 640 ${inside}" stroke-width=".75"/>`;
  }

  let dimensions = line(100, 44, 1100, 44, 'stroke-width=".45"');
  for (let i = 0; i <= 12; i += 1) {
    const x = 100 + i * 1000 / 12;
    dimensions += line(x - 3, 48, x + 3, 40, 'stroke-width=".55"');
    dimensions += text(n(x), 32, String.fromCharCode(65 + i), 'text-anchor="middle" font-size="6.5"');
  }
  dimensions += line(38, 120, 38, 660, 'stroke-width=".45"');
  for (let i = 0; i <= 6; i += 1) {
    const y = 120 + i * 90;
    dimensions += line(34, y + 3, 42, y - 3, 'stroke-width=".55"') + text(25, y + 2, String(i + 1), 'text-anchor="middle" font-size="6.5"');
  }
  dimensions += text(600, 16, '12 DESIGN BAYS', 'text-anchor="middle" letter-spacing="1.2" font-size="6"');
  dimensions += text(12, 390, '6 DESIGN BAYS', 'text-anchor="middle" transform="rotate(-90 12 390)" letter-spacing="1.2" font-size="6"');

  const roomNumbers = layout.rooms.map((r) => `<g><circle cx="${r.x + 13}" cy="${r.y + 14}" r="7" fill="#fff" stroke-width=".5"/>${text(r.x + 13, r.y + 16.4, r.number, 'text-anchor="middle" font-size="6.2"')}</g>`).join('');
  const coreY = plan.core === 'top' ? 65 : 670;
  const coreX = 495;
  const coreEntry = plan.core === 'top' ? '<path d="M584 113h32" stroke="#fff" stroke-width="6"/><path d="M584 113v-27M616 113A32 32 0 0 0 584 81" stroke-width=".65"/>' : '<path d="M584 670h32" stroke="#fff" stroke-width="6"/><path d="M584 670v27M616 670A32 32 0 0 1 584 702" stroke-width=".65"/>';
  const drawing = `<svg class="floor-plan-drawing" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" fill="none" stroke="${ink}" stroke-width=".75" stroke-linejoin="round" stroke-linecap="round" font-size="7">
    <defs><pattern id="plan-hatch-${id}" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M-2 2L2-2M0 7L7 0M5 9L9 5" stroke="${ink}" stroke-width=".4" opacity=".25"/></pattern></defs>
    <path d="${plan.outline}" fill="#fff" stroke="none"/>
    <path d="${plan.outline}" stroke="url(#plan-hatch-${id})" stroke-width="15" opacity=".45"/>
    ${wall(plan.outline, 6.2)}
    <g class="plan-glazing">${glazing()}</g>
    <g class="plan-core">${core(coreX, coreY)}${coreEntry}</g>
    <g class="plan-partitions">${partitions()}</g>
    <g class="plan-furnishings" opacity=".85">${furniture()}</g>
    <g class="plan-entrance">${entrance()}</g>
    <g class="plan-room-numbers">${roomNumbers}</g>
    <g class="plan-dimensions" opacity=".7">${dimensions}</g>
    <g class="plan-north-arrow"><path d="M1167 102V55m-5 13 5-13 5 13-5-4Z" fill="none" stroke-width=".75"/><circle cx="1167" cy="78" r="18" stroke-width=".4"/>${text(1167, 42, 'N', 'text-anchor="middle" letter-spacing="1" font-size="8"')}</g>
    <g class="plan-title-block" opacity=".8"><path d="M84 743H1116M84 738v10M1116 738v10" stroke-width=".45"/>${text(84, 763, `E.H. / ${plan.title.toUpperCase()}`, 'letter-spacing="1.3"')}${text(600, 763, 'CONCEPT PLAN / NOT TO SCALE', 'text-anchor="middle" letter-spacing="1.15" font-size="6.5"')}${text(1116, 763, `0${Object.keys(plans).indexOf(id) + 1} / INTERIOR STUDY`, 'text-anchor="end" letter-spacing="1" font-size="6.5"')}</g>
  </svg>`;
  return drawing.replaceAll('#fff', palette.raised);
}
