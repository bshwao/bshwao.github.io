import { palette, sectionColors } from './color-theme.js';
import { sections, floorLayout } from './tower-geometry.js';
import { floorContent } from './floor-content.js';
import { planInteriorStructure } from './interior-structure.js';

// Text retains a readable grid. The drawing and its interactive anchors use the
// same occupied floor plate as the 3D rooms, including the shorter side wing.
const canvas = { x: 100, y: 120, width: 1000, height: 540 };
const textGrid = count => count === 3 ? [
  ['1 / 7', '1 / 7'], ['7 / 13', '1 / 4'], ['7 / 13', '4 / 7'],
] : [
  ['1 / 7', '1 / 4'], ['7 / 13', '1 / 4'], ['1 / 7', '4 / 7'], ['7 / 13', '4 / 7'],
];

export const planLayouts = Object.fromEntries(sections.map(section => {
  const content = floorContent[section.id];
  const height = section.low + .02;
  const floor = floorLayout(height, content.rooms.length);
  const b = floor.bounds;
  const scale = Math.min(canvas.width / (b.maxX - b.minX), canvas.height / (b.maxZ - b.minZ));
  const mapPoint = ([x, z]) => [600 + (x - (b.minX + b.maxX) / 2) * scale, 390 + (z - (b.minZ + b.maxZ) / 2) * scale];
  const mapRect = region => {
    const [cx, cy] = mapPoint([region.x, region.z]);
    return { x: cx - region.width * scale / 2, y: cy - region.depth * scale / 2,
      width: region.width * scale, height: region.depth * scale };
  };
  const service=floor.service;
  const architecture=planInteriorStructure(floor,Math.max(...floor.stations.map(station=>station.scale)));
  return [section.id, {
    columns: 12, rows: 6, canvas, height, scale, mapPoint,
    outline: floor.outline.map(mapPoint), core: mapRect(floor.core),
    circulation: architecture.circulation.paths.map(route=>({...route,points:route.points.map(mapPoint)})),
    hall: architecture.circulation.floor.map(r=>mapRect({x:(r.minX+r.maxX)/2,z:(r.minZ+r.maxZ)/2,width:r.maxX-r.minX,depth:r.maxZ-r.minZ})),
    service:{elevator:mapRect(service.elevator),stair:mapRect({x:service.stair.x,z:service.stair.z,width:service.stair.run,depth:service.stair.width}),steps:service.stair.count},
    rooms: floor.stations.map((station, index) => {
      const [column, row] = textGrid(content.rooms.length)[index];
      const [anchorX, anchorY] = mapPoint([station.x, station.z]);
      const entry=architecture.rooms[index].opening,[entryX,entryY]=mapPoint([entry.x,entry.z]);
      return { ...mapRect(station.region), column, row, number: content.rooms[index].number,
        anchorX, anchorY, worldRegion: station.region,
        opening:{x:entryX,y:entryY,width:entry.width*scale,entrySide:entry.entrySide} };
    }),
  }];
}));

/** Architectural sketch of the actual lower occupied cut, with matching rooms. */
export function createFloorPlan(sectionId) {
  const id = Object.hasOwn(planLayouts, sectionId) ? sectionId : 'about';
  const section = sections.find(item => item.id === id);
  const layout = planLayouts[id];
  const ink = sectionColors[id].ink;
  const n = value => Number(value.toFixed(2));
  const path = points => `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z`;
  const outline = path(layout.outline);
  const line = (a, b, extra = '') => `<path d="M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}" ${extra}/>`;
  const rect = (x, y, width, height, extra = '') => `<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" ${extra}/>`;
  const label = (x, y, value, extra = '') => `<text x="${n(x)}" y="${n(y)}" fill="${ink}" stroke="none" font-family="Consolas, 'Liberation Mono', monospace" ${extra}>${value}</text>`;
  const wall = d => `<path d="${d}" stroke-width="5"/><path d="${d}" stroke="${palette.raised}" stroke-width="2.8"/>`;

  let glazing = '';
  for (let i = 0; i < layout.outline.length; i++) {
    const a = layout.outline[i], b = layout.outline[(i + 1) % layout.outline.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    if (length < 1) continue;
    const inward = [-dy / length, dx / length];
    const at = (t, inset) => [a[0] + dx * t + inward[0] * inset, a[1] + dy * t + inward[1] * inset];
    glazing += line(at(0, 5), at(1, 5), 'stroke-width=".6"');
    for (let distance = 9; distance < length - 3; distance += 18) glazing += line(at(distance / length, 2), at(distance / length, 7), 'stroke-width=".5"');
  }

  const core = layout.core;
  const cx = core.x, cy = core.y, cw = core.width, ch = core.height;
  let service = rect(cx, cy, cw, ch, `fill="${palette.raised}" stroke-width="2"`);
  const lift=layout.service.elevator,stair=layout.service.stair;
  service+=rect(lift.x,lift.y,lift.width,lift.height,'class="plan-elevator" stroke-width=".8"');
  service+=line([lift.x,lift.y],[lift.x+lift.width,lift.y+lift.height],'stroke-width=".5"');
  service+=line([lift.x+lift.width,lift.y],[lift.x,lift.y+lift.height],'stroke-width=".5"');
  service+=rect(stair.x,stair.y,stair.width,stair.height,'class="plan-stair" stroke-width=".8"');
  for(let i=1;i<layout.service.steps;i++) {
    const x=stair.x+stair.width*i/layout.service.steps;
    service+=line([x,stair.y],[x,stair.y+stair.height],'stroke-width=".5"');
  }
  const stairMid=stair.y+stair.height/2;
  service+=line([stair.x+stair.width*.12,stairMid],[stair.x+stair.width*.88,stairMid],'stroke-width=".5"');
  service+=line([stair.x+stair.width*.88,stairMid],[stair.x+stair.width*.73,stairMid-stair.height*.22],'stroke-width=".5"');

  let partitions = '', furnishings = '', roomNumbers = '', finishes = '';
  for (const [index, room] of layout.rooms.entries()) {
    const { x, y, width, height } = room;
    finishes += rect(x,y,width,height,`class="plan-room-finish" data-plan-room="${index}" fill="${sectionColors[id].tint}" fill-opacity=".35" stroke="none"`);
    const left = x - .16*layout.scale, right = x + width + .16*layout.scale;
    const top = y - .16*layout.scale, bottom = y + height + .16*layout.scale;
    const center = room.opening.x, door = room.opening.width;
    const entryTop = room.opening.entrySide < 0;
    const entryY = room.opening.y, oppositeY = entryTop ? bottom : top;
    const direction = entryTop ? 1 : -1;
    partitions += wall(`M${n(center - door / 2)} ${n(entryY)}H${n(left)}V${n(oppositeY)}H${n(right)}V${n(entryY)}H${n(center + door / 2)}`);
    partitions += `<path class="plan-door" data-plan-door="${index}" d="M${n(center - door / 2)} ${n(entryY)}v${n(door * direction)}M${n(center + door / 2)} ${n(entryY)}A${n(door)} ${n(door)} 0 0 ${entryTop ? 1 : 0} ${n(center - door / 2)} ${n(entryY + door * direction)}" stroke-width=".7"/>`;

    const unit = Math.min(width / 8.4, height / 7.6);
    const localRect = (lx, ly, w, h) => rect(room.anchorX + (lx - w / 2) * unit, room.anchorY + (ly - h / 2) * unit, w * unit, h * unit, `fill="${palette.raised}" stroke-width=".7"`);
    const localLine = (a, b) => line([room.anchorX + a[0] * unit, room.anchorY + a[1] * unit], [room.anchorX + b[0] * unit, room.anchorY + b[1] * unit], 'stroke-width=".55"');
    const table = () => localRect(0, 0, 3.8, 1.8) + localRect(0, -1.7, .85, .8) + localRect(0, 1.7, .85, .8);
    const desk = () => localRect(0, 0, 3.8, 1.7) + localRect(0, .2, 1.3, .25) + localLine([0, .2], [0, -.15]) + localRect(0, -.5, 1.2, .3) + localRect(0, -1.7, .85, .8);
    const shelves = () => {
      let result = '';
      for (const lx of [-1.65, 1.65]) {
        result += localRect(lx, 0, 1, 4.3);
        for (let ly = -1.7; ly <= 1.7; ly += .55) result += localLine([lx - .4, ly], [lx + .4, ly]);
      }
      return result;
    };
    if (id === 'about' && index === 2) {
      const points = [[-1.5, -1], [1.5, -1], [1.5, -.2], [.8, 1.4], [-.3, 1.8], [-1.5, .8], [-1.5, -1]];
      furnishings += `<path d="${path(points.map(([lx, ly]) => [room.anchorX + lx * unit, room.anchorY + ly * unit]))}" fill="${palette.raised}"/>`;
      furnishings += localRect(0, -1.25, 3, .4) + localRect(0, -2.2, 1.4, .6);
      for (let key = -1.2; key < 1.3; key += .3) furnishings += localLine([key, -1.4], [key, -1.05]);
    } else if (id === 'experience' && index === 3) {
      furnishings += `<path d="${path([[0, -2.4], [-.7, -.5], [-1.2, 1.5], [1.2, 1.5], [.7, -.5]].map(([lx, ly]) => [room.anchorX + lx * unit, room.anchorY + ly * unit]))}"/>`;
      for (const lx of [-1.25, 1.25]) for (const ly of [-1.2, 1]) furnishings += localRect(lx, ly, .55, .85);
    } else if ((id === 'resume' && index === 1) || (id === 'experience' && index === 1) || (id === 'projects' && index === 1)) {
      furnishings += shelves();
    } else if ((id === 'about' && index === 3) || (id === 'contact' && index === 3)) {
      furnishings += localRect(-2, 0, 1.1, 3.4) + localRect(2, 0, 1.1, 3.4) + localRect(0, 0, 1.5, 1.5);
      for (const ly of [-.55, .55]) furnishings += localLine([-2.5, ly], [-1.5, ly]) + localLine([1.5, ly], [2.5, ly]);
    } else if (index === 0 && (id === 'about' || id === 'contact')) furnishings += table();
    else furnishings += desk();
    // Secondary work/seating areas occupy the long axis, matching the inhabited
    // wings and perimeter storage instead of a single isolated furniture icon.
    if (width > height * 1.6) {
      for (const side of [-1,1]) {
        const tx=room.anchorX+side*width*.32,ty=room.anchorY;
        furnishings+=rect(tx-width*.09,ty-height*.1,width*.18,height*.2,`fill="${palette.raised}"`);
        for(const dy of [-height*.19,height*.19])furnishings+=rect(tx-7,ty+dy-6,14,12,`fill="${palette.raised}"`);
        furnishings+=rect(tx-width*.1,y+height*.85,width*.2,height*.09,`fill="${palette.raised}"`);
      }
    } else if (height > width * .85) {
      furnishings+=rect(x+width*.12,y+height*.05,width*.76,height*.075,`fill="${palette.raised}"`);
      for(const [a,b]of [[x+width*.12,center-door*.7],[center+door*.7,x+width*.88]])if(b-a>8)
        furnishings+=rect(a,y+height*.88,b-a,height*.075,`fill="${palette.raised}"`);
    }
    roomNumbers += `<g data-plan-number="${room.number}"><circle cx="${n(x + 17)}" cy="${n(y + 17)}" r="9" fill="${palette.raised}"/>${label(x + 17, y + 20, room.number, 'font-size="8" text-anchor="middle"')}</g>`;
  }

  const minX = Math.min(...layout.outline.map(p => p[0])), maxX = Math.max(...layout.outline.map(p => p[0]));
  const minY = Math.min(...layout.outline.map(p => p[1])), maxY = Math.max(...layout.outline.map(p => p[1]));
  let dimensions = line([minX, minY - 28], [maxX, minY - 28], 'stroke-width=".45"');
  for (const x of [minX, maxX]) dimensions += line([x - 3, minY - 24], [x + 3, minY - 32], 'stroke-width=".6"');
  dimensions += line([minX - 28, minY], [minX - 28, maxY], 'stroke-width=".45"');
  for (const y of [minY, maxY]) dimensions += line([minX - 32, y + 3], [minX - 24, y - 3], 'stroke-width=".6"');
  dimensions += label((minX + maxX) / 2, minY - 38, 'MAIN VOLUME / SHARED FLOOR PLATE', 'font-size="7" text-anchor="middle" letter-spacing="1"');

  return `<svg class="floor-plan-drawing" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" fill="none" stroke="${ink}" stroke-width=".75" stroke-linejoin="round" stroke-linecap="round">
    <defs><clipPath id="plan-cut-${id}"><path d="${outline}"/></clipPath></defs>
    <path class="plan-outline" d="${outline}" fill="${palette.raised}" stroke-width="6.2"/>
    <path d="${outline}" stroke="${palette.raised}" stroke-width="3.7"/>
    <g clip-path="url(#plan-cut-${id})">
      <g class="plan-finishes">${layout.hall.map(r=>rect(r.x,r.y,r.width,r.height,`fill="${palette.glass}" fill-opacity=".5" stroke="none"`)).join('')}${finishes}</g>
      <g class="plan-glazing">${glazing}</g>
      <g class="plan-partitions">${partitions}</g>
      <g class="plan-circulation" stroke-dasharray="3 3" opacity=".55">${layout.circulation.map(route=>`<path data-plan-route="${route.roomIndex}" d="M${route.points.map(([x,y])=>`${n(x)} ${n(y)}`).join('L')}"/>`).join('')}</g>
      <g class="plan-core">${service}</g>
      <g class="plan-furnishings" opacity=".8">${furnishings}</g>
      <g class="plan-room-numbers">${roomNumbers}</g>
    </g>
    <g class="plan-dimensions" opacity=".7">${dimensions}</g>
    <g class="plan-north-arrow"><path d="M1152 105V58m-5 13 5-13 5 13-5-4Z"/><circle cx="1152" cy="81" r="18" stroke-width=".4"/>${label(1152, 45, 'N', 'text-anchor="middle" font-size="8"')}</g>
    <g class="plan-title-block" opacity=".8"><path d="M84 728H1116M84 723v10M1116 723v10" stroke-width=".45"/>${label(84, 750, `E.H. / ${section.name.toUpperCase()}`, 'font-size="8" letter-spacing="1.3"')}${label(600, 750, 'OCCUPIED LOWER CUT / NOT TO SCALE', 'font-size="7" text-anchor="middle" letter-spacing="1"')}${label(1116, 750, `${section.number} / INTERIOR STUDY`, 'text-anchor="end" font-size="7" letter-spacing="1"')}</g>
  </svg>`;
}
