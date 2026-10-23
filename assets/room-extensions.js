/** Fill the spare axis of each real bay without stretching its original furniture. */
export function furnishRoomExtensions(section, index, parent, bounds, region, scale, opening, api) {
  const { box, cylinder, paper, feature } = api;
  const center = bounds.getCenter(bounds.min.clone());
  const inset = Math.min(region.width, region.depth) * .055;
  const halfX = (region.width / 2 - inset) / scale;
  const halfZ = (region.depth / 2 - inset) / scale;
  const minX = center.x - halfX, maxX = center.x + halfX;
  const minZ = center.z - halfZ, maxZ = center.z + halfZ;
  const additions = [];
  const part = (x, y, z, w, h, d, material = 'structure') => box(parent, x, y, z, w, h, d, material);
  const record = (name, build) => {
    const first = parent.children.length;
    feature(parent, name, build);
    additions.push(...parent.children.slice(first));
  };
  function seat(x, z, width = 1.2, back = 1) {
    part(x, .7, z, width, .16, .8, 'equipment');
    part(x, 1.12, z + back * .36, width, .68, .12, 'glass');
    for (const dx of [-width * .37, width * .37]) for (const dz of [-.27, .27]) part(x + dx, .33, z + dz, .07, .66, .07, 'ink');
  }
  function cabinet(x, z, width, depth = .75, tall = false) {
    const height = tall ? 2.8 : 1.35;
    part(x, height / 2, z, width, height, depth, 'equipment');
    part(x, height + .055, z, width + .06, .1, depth + .04);
    const bays = Math.max(1, Math.floor(width / 1.15));
    for (let i = 0; i < bays; i++) {
      const cx = x + (i - (bays - 1) / 2) * width / bays;
      part(cx, height * .45, z + depth / 2 + .025, width / bays - .08, height * .83, .045);
      part(cx + width / bays * .28, height * .47, z + depth / 2 + .06, .045, .24, .05, 'ink');
      if (tall) {
        part(cx, height + .35, z, width / bays - .14, .05, depth * .8, 'glass');
        for (let j = 0; j < 3; j++) part(cx - .2 + j * .19, height + .22, z, .11, .24, .34, j % 2 ? 'equipment' : 'structure');
      }
    }
  }
  function workArea(x, z, width, depth) {
    const tableW = Math.min(2.9, width * .62), tableD = Math.min(1.5, depth * .25);
    part(x, 1.4, z, tableW, .14, tableD);
    for (const dx of [-tableW * .4, tableW * .4]) for (const dz of [-tableD * .32, tableD * .32]) part(x + dx, .68, z + dz, .08, 1.36, .08, 'ink');
    seat(x, z - tableD / 2 - .7, Math.min(1.1, tableW * .5), -1);
    seat(x, z + tableD / 2 + .7, Math.min(1.1, tableW * .5), 1);
    paper(parent, x - .35, 1.5, z, .65, .8, -.15);
    if (section === 'projects' || section === 'experience') {
      part(x + .55, 1.55, z, .68, .14, .48, 'equipment');
      part(x + .55, 1.64, z, .42, .05, .3, 'glass');
      for (const dx of [-.14, 0, .14]) part(x + .55 + dx, 1.68, z, .025, .025, .23, 'ink');
    } else {
      cylinder(parent, x + .55, 1.6, z, .12, .2, 'equipment');
      paper(parent, x + .15, 1.53, z + .13, .6, .6, .15);
    }
  }
  const purpose = { about: 'Reading and study', projects: 'Prototype preparation', experience: 'Component preparation', resume: 'Document review', contact: 'Visitor conversation' }[section];

  // Wide rear wings get full secondary activity zones on both sides of the
  // original focal object. Their central entrance remains unobstructed.
  const sideBands = [[minX, bounds.min.x - .4], [bounds.max.x + .4, maxX]];
  sideBands.forEach(([a, b], side) => {
    const width = b - a;
    if (width < 2.5) return;
    const depth = maxZ - minZ, x = (a + b) / 2, z = center.z;
    record(`${purpose} extension ${side + 1}: table, seating and perimeter storage`, () => {
      if (width > 3.1 && depth > 4.7) workArea(x, z - .2, width, depth);
      else seat(x, z, Math.min(width - .25, 2));
      cabinet(x, maxZ - .5, Math.min(width - .2, 3.2), .7, section === 'resume');
      if (depth > 6.2) cabinet(x, minZ + .5, Math.min(width - .2, 2.7), .7);
    });
  });

  // Deep main rooms use the front and rear bands, with an explicit clear aisle
  // aligned to their architectural doorway rather than an arbitrary center.
  const doorX = center.x + ((opening?.x ?? region.x) - region.x) / scale;
  const entrySide = opening?.entrySide ?? 1;
  const endBands = [[minZ, bounds.min.z - .4, -1], [bounds.max.z + .4, maxZ, 1]];
  endBands.forEach(([a, b, side]) => {
    const depth = b - a;
    if (depth < .65) return;
    const cabinetDepth = Math.min(.75, depth - .16);
    const z = side < 0 ? a + cabinetDepth / 2 + .08 : b - cabinetDepth / 2 - .08;
    const doorway = side === entrySide;
    const aisle = Math.max(1.4, (opening?.width ?? 1.1) / scale + .45);
    const spans = doorway ? [[minX + .12, doorX - aisle / 2], [doorX + aisle / 2, maxX - .12]] : [[minX + .12, maxX - .12]];
    spans.forEach(([left, right], slot) => {
      if (right - left < 1.05) return;
      const width = Math.min(right - left, 6.8), x = (left + right) / 2;
      record(`${purpose} ${side < 0 ? 'rear' : 'entry'} fit-out ${slot + 1}`, () => {
        if (doorway && depth >= 1 && ['about', 'contact'].includes(section)) seat(x, side < 0 ? a + .46 : b - .46, Math.min(width - .12, 2.5), side);
        else cabinet(x, z, width - .1, cabinetDepth, !doorway && ['about', 'resume'].includes(section));
        if (!doorway && depth > 3.5 && width > 3.6) {
          const tableZ = side < 0 ? b - 1.1 : a + 1.1;
          part(x, 1.35, tableZ, Math.min(3.1, width * .7), .13, 1.15);
          for (const dx of [-1, 1]) part(x + dx, .65, tableZ, .08, 1.3, .75, 'equipment');
          paper(parent, x, 1.45, tableZ, .8, .8);
        }
      });
    });
  });
  return { count: additions.length, objects: additions };
}
