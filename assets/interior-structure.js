import * as T from './vendor/three.module.min.js';
import { insetFootprint } from './tower-geometry.js';
import { palette, sectionColors } from './color-theme.js';
import { buildBoxSurfaces, mergeSurfaceLines } from './surface-geometry.js';

/** Shared plan coordinates for the physical floor, cap drawing and reading SVG. */
export function planInteriorStructure(layout, unit) {
  const core = layout.core, coreMin = core.x - core.width / 2, coreMax = core.x + core.width / 2;
  const wing = layout.regions.at(-1), wingMinZ = wing.z - wing.depth / 2;
  const mainEdge = layout.regions[0].z + layout.regions[0].depth / 2;
  const coreBack = core.z + core.depth / 2;
  const junctionZ = (coreBack + wingMinZ) / 2;
  const width = Math.min(1, (wingMinZ - coreBack) * .72);
  const bypassWest = coreMin - width / 2 - .3, bypassEast = coreMax + width / 2 + .3;
  const eastLaneZ = (mainEdge + Math.min(layout.bounds.maxZ, wingMinZ - 1.2)) / 2;
  const entranceX = (region, openingWidth, isWing) => {
    if (isWing) return Math.min(region.x + region.width / 2 - openingWidth, Math.max(region.x - region.width / 2 + openingWidth, core.x));
    const left = region.x - region.width / 2 + openingWidth / 2 + .15;
    const right = region.x + region.width / 2 - openingWidth / 2 - .15;
    const clearance = openingWidth / 2 + width / 2 + .12;
    if (region.x < coreMin - clearance || region.x > coreMax + clearance) return region.x;
    const west = Math.min(right, coreMin - clearance), east = Math.max(left, coreMax + clearance), candidates = [];
    if (west >= left) candidates.push(west);
    if (east <= right) candidates.push(east);
    return candidates.sort((a, b) => Math.abs(a - region.x) - Math.abs(b - region.x))[0] ?? region.x;
  };
  const rooms = layout.regions.map((region, index) => {
    const isWing = index === layout.regions.length - 1, entrySide = isWing ? -1 : 1;
    const openingWidth = Math.min(1.5 * unit, region.width * .26);
    const opening = { x: entranceX(region, openingWidth, isWing), z: region.z + entrySide * (region.depth / 2 + .16),
      width: openingWidth, height: 2.65 * unit, side: isWing ? 'south' : 'north', entrySide };
    return { index, region: { ...region }, floor: { ...region, y: .04 }, opening };
  });
  const paths = rooms.map(room => {
    const { opening } = room; let points;
    if (opening.entrySide < 0 || opening.x < coreMin)
      points = [[opening.x, opening.z], [opening.x, junctionZ], [layout.service.elevator.x, junctionZ]];
    else points = [[opening.x, opening.z], [opening.x, eastLaneZ], [bypassEast, eastLaneZ], [bypassEast, junctionZ], [layout.service.elevator.x, junctionZ]];
    points = points.filter((point, i) => !i || Math.hypot(point[0] - points[i - 1][0], point[1] - points[i - 1][1]) > .0001);
    return { roomIndex: room.index, points };
  });
  // Keep finishes inside the chamfer as well as the nominal bounding rectangle.
  const joinZ = wingMinZ - .78, hallLeft = layout.bounds.minX + .85, hallRight = layout.bounds.maxX - .85;
  const wingLeft = wing.x - wing.width / 2 - .2, wingRight = wing.x + wing.width / 2 + .2;
  const liftRight = layout.service.elevator.x + layout.service.elevator.width / 2;
  const stairStart = layout.service.stair.x - layout.service.stair.run / 2;
  const stairApproachX = (liftRight + stairStart) / 2;
  const circulation = { width, core: { ...core }, junctionZ, bypassWest, bypassEast, paths,
    serviceApproaches: [{ service: 'elevator', points: [[layout.service.elevator.x, junctionZ],
      [layout.service.elevator.x, layout.service.elevator.z + layout.service.elevator.depth / 2]] },
    { service: 'stair', width: Math.min(width, (stairStart - liftRight) * .72),
      points: [[stairApproachX, junctionZ], [stairApproachX, layout.service.stair.z], [stairStart, layout.service.stair.z]] }],
    floor: [{ minX: hallLeft, maxX: hallRight, minZ: mainEdge, maxZ: joinZ },
      { minX: wingLeft, maxX: wingRight, minZ: joinZ, maxZ: wingMinZ }] };
  return { rooms, circulation };
}

/**
 * Floor-scale architecture, independent of the furniture's local room scale.
 * The open northern faces are a deliberate architectural cut: the door frames,
 * rear windows and stepped partitions describe rooms without hiding their use.
 * All solids share three batches; outlines and floor joints share one more.
 */
export function createInteriorStructure(section, content, layout, unit) {
  const group = new T.Group(); group.name = 'interior-floor-architecture';
  const colors = { structure: palette.structure, accent: sectionColors[section.id].accent, glass: palette.glass };
  const materials = Object.fromEntries(Object.entries(colors).map(([name, color]) =>
    [name, new T.MeshLambertMaterial({ color, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })]));
  const line = new T.LineBasicMaterial({ color: palette.muted, transparent: true, opacity: .58, depthWrite: false });
  const parts = new Map(Object.keys(colors).map(name => [name, []]));
  const lineParts = [], plainLines = [], rooms = [], features = [], solidBoxes = [];
  const plan = planInteriorStructure(layout, unit), { circulation } = plan;
  const cube = new T.BoxGeometry(1, 1, 1);
  const round = new T.CylinderGeometry(1, 1, 1, 12), leaf = new T.SphereGeometry(1, 6, 4);
  const matrix = new T.Matrix4(), position = new T.Vector3(), scale = new T.Vector3(), rotation = new T.Quaternion();
  const yAxis = new T.Vector3(0, 1, 0);
  let primitiveCount = 0;
  const wallThickness = .13 * unit, floorY = .04, height = 4 * unit;

  function primitive(source, x, y, z, w, h, d, surface = 'structure', turn = 0, outline = true) {
    position.set(x, y, z); scale.set(w, h, d); rotation.setFromAxisAngle(yAxis, turn);
    matrix.compose(position, rotation, scale);
    if (source === cube) solidBoxes.push({ matrix: matrix.clone(), surface, outline });
    else parts.get(surface).push((source.index ? source.toNonIndexed() : source.clone()).applyMatrix4(matrix));
    primitiveCount++;
  }
  const box = (x, y, z, w, h, d, surface = 'structure', turn = 0, outline = true) => {
    if (w > .0001 && h > .0001 && d > .0001) primitive(cube, x, y, z, w, h, d, surface, turn, outline);
  };
  const stroke = (a, b) => plainLines.push(...a, ...b);
  function wall(room, x, z, w, d, h, kind = 'partition', surface = 'structure', bottom = floorY) {
    box(x, bottom + h / 2, z, w, h, d, surface);
    room.walls.push({ x, y: bottom + h / 2, z, width: w, depth: d, height: h, bottom, kind });
  }
  function plankFloor(region, index) {
    const { x, z, width: w, depth: d } = region;
    box(x, floorY - .018, z, w, .036, d, 'structure', 0, false);
    // Joints belong to the full usable room, rather than to a tiny furniture mat.
    const pitch = section.id === 'about' || section.id === 'resume' ? .8 * unit : 1.65 * unit;
    const wood = section.id === 'about' || section.id === 'resume';
    for (let offset = pitch; offset < w - .12; offset += pitch)
      stroke([x - w / 2 + offset, floorY + .006, z - d / 2], [x - w / 2 + offset, floorY + .006, z + d / 2]);
    if (!wood) for (let offset = pitch; offset < d - .12; offset += pitch)
      stroke([x - w / 2, floorY + .006, z - d / 2 + offset], [x + w / 2, floorY + .006, z - d / 2 + offset]);
    if (wood) for (let offset = pitch * 1.7, row = 0; offset < d; offset += pitch * 1.7, row++) {
      const start = x - w / 2 + (row % 2 ? pitch : 0);
      for (let dx = 0; dx < w - pitch; dx += pitch * 2)
        stroke([start + dx, floorY + .006, z - d / 2 + offset], [Math.min(start + dx + pitch, x + w / 2), floorY + .006, z - d / 2 + offset]);
    }
    // A small inset at the entrance gives every room a recognizable section finish.
    const stripeZ = z + (index === layout.regions.length - 1 ? -1 : 1) * (d / 2 - .24 * unit);
    box(x, floorY + .004, stripeZ, w - .28 * unit, .006, .065 * unit, 'accent', 0, false);
  }

  plan.rooms.forEach((roomPlan, index) => {
    const { region, opening } = roomPlan;
    const isWing = index === layout.regions.length - 1, entrySide = isWing ? -1 : 1;
    const minX = region.x - region.width / 2, maxX = region.x + region.width / 2;
    const minZ = region.z - region.depth / 2, maxZ = region.z + region.depth / 2;
    const front = region.z + entrySide * (region.depth / 2 + .16);
    const rear = region.z - entrySide * (region.depth / 2 + .16);
    const room = { ...roomPlan, name: content.rooms[index]?.title || content.rooms[index]?.name || '', walls: [] };
    plankFloor(region, index);

    // Rear sill and framed, inset panes make this an inhabited tower facade.
    // The glass is deliberately opaque pastel: no transparent sorting artefacts.
    // The near facade of the side wing is cut below eye level as well. Its
    // windows still describe the shell without concealing the occupied wing.
    const sill = isWing ? .26 : .82, glassBottom = isWing ? .36 : .94;
    const glassHeight = isWing ? .46 : 2.65, windowTop = isWing ? .88 : 3.65;
    wall(room, region.x, rear, region.width + .18, wallThickness, sill * unit, 'window-sill');
    const panes = Math.max(2, Math.ceil(region.width / (2.4 * unit))), bay = region.width / panes;
    for (let pane = 0; pane < panes; pane++) {
      const x = minX + bay * (pane + .5);
      wall(room, x, rear, bay - .12 * unit, wallThickness * .55, glassHeight * unit, 'window-pane', 'glass', floorY + glassBottom * unit);
      wall(room, minX + bay * pane, rear, .11 * unit, wallThickness * 1.4, windowTop * unit, 'window-mullion', 'accent');
    }
    wall(room, maxX, rear, .11 * unit, wallThickness * 1.4, windowTop * unit, 'window-mullion', 'accent');
    wall(room, region.x, rear, region.width + .18, wallThickness * 1.4, .16 * unit, 'window-header', 'accent', floorY + windowTop * unit);
    wall(room, region.x, rear, region.width + .12, wallThickness * 1.45, .09 * unit, 'window-transom', 'accent', floorY + (isWing ? .55 : 2.24) * unit);

    // Side partitions step down toward the cut face so furniture remains legible.
    const rearDepth = region.depth / 2 + .16, lowDepth = rearDepth;
    for (const x of [minX - .16, maxX + .16]) {
      const tallCenter = rear + entrySide * rearDepth / 2;
      const lowCenter = region.z + entrySide * lowDepth / 2;
      wall(room, x, tallCenter, wallThickness, rearDepth, 2.8 * unit, 'partition');
      wall(room, x, lowCenter, wallThickness, lowDepth, .75 * unit, 'cutaway-partition');
      wall(room, x, tallCenter, wallThickness * 1.45, rearDepth, .08 * unit, 'partition-cap', 'accent', floorY + 2.8 * unit);
      wall(room, x, lowCenter, wallThickness * 1.45, lowDepth, .08 * unit, 'cutaway-cap', 'accent', floorY + .75 * unit);
    }
    const doorLeft = opening.x - opening.width / 2, doorRight = opening.x + opening.width / 2;
    const leftWidth = doorLeft - minX, rightWidth = maxX - doorRight;
    wall(room, minX + leftWidth / 2, front, leftWidth, wallThickness, .75 * unit, 'cutaway-front');
    wall(room, doorRight + rightWidth / 2, front, rightWidth, wallThickness, .75 * unit, 'cutaway-front');
    for (const x of [doorLeft - wallThickness / 2, doorRight + wallThickness / 2])
      wall(room, x, front, wallThickness, wallThickness * 1.5, opening.height, 'door-jamb', 'accent');
    wall(room, opening.x, front, opening.width + wallThickness * 2, wallThickness * 1.5, .14 * unit, 'door-lintel', 'accent', floorY + opening.height);
    box(opening.x, .041, front, opening.width, .008, .6 * unit, 'accent', 0, false);
    room.floor.bounds = { minX, maxX, minZ, maxZ };
    room.bounds = new T.Box3(new T.Vector3(minX, floorY - .036, minZ), new T.Vector3(maxX, floorY, maxZ));
    for (const wall of room.walls) room.bounds.union(new T.Box3().setFromCenterAndSize(
      new T.Vector3(wall.x, wall.y, wall.z), new T.Vector3(wall.width, wall.height, wall.depth)));
    rooms.push(room);
  });
  features.push('Full-size finished rooms with framed rear windows', 'Cutaway partitions with open corridor doorways');

  // A continuous finish over the actual L-shaped circulation space connects
  // all four room entrances to the aligned elevator and stair, rather than
  // leaving the core stranded in a featureless expanse of slab.
  for (const hall of circulation.floor) box((hall.minX + hall.maxX) / 2, floorY - .018, (hall.minZ + hall.maxZ) / 2,
    hall.maxX - hall.minX, .036, hall.maxZ - hall.minZ, 'glass', 0, false);
  const { paths } = circulation;
  // Fine paired guide strips make the shared passage visible without adding
  // obstacles, false raised tracks or a line running through the service core.
  for (const route of paths) for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i];
    stroke([a[0], floorY + .006, a[1]], [b[0], floorY + .006, b[1]]);
  }
  features.push('Connected circulation around the shared service core');

  // Columns and spandrels follow every straight edge of the real chamfered slab.
  // They stand in the facade strip outside the furnished room rectangles.
  const mainEdge = layout.regions[0].z + layout.regions[0].depth / 2;
  const perimeter = insetFootprint(layout.outline, .38);
  const corners = perimeter.filter((point, i, all) => {
    const a = all[(i + all.length - 1) % all.length], b = all[(i + 1) % all.length];
    return Math.abs((point[0] - a[0]) * (b[1] - point[1]) - (point[1] - a[1]) * (b[0] - point[0])) > 1e-6;
  });
  const columns = [], proposedColumns = [];
  const edgeHeights = corners.map((a, edge) => {
    const b = corners[(edge + 1) % corners.length];
    const tall = (a[1] + b[1]) / 2 < mainEdge || Math.abs((a[0] + b[0]) / 2 - layout.bounds.minX) < .5;
    return tall ? height : 1.05 * unit;
  });
  for (let edge = 0; edge < corners.length; edge++) {
    const a = corners[edge], b = corners[(edge + 1) % corners.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const count = Math.max(1, Math.ceil(length / (5.5 * unit)));
    const columnHeight = edgeHeights[edge];
    for (let i = 0; i < count; i++) {
      const x = a[0] + dx * i / count, z = a[1] + dz * i / count;
      const supportHeight = i === 0 ? Math.max(columnHeight, edgeHeights[(edge + corners.length - 1) % corners.length]) : columnHeight;
      proposedColumns.push({ x, z, width: .22 * unit, height: supportHeight });
    }
    const turn = -Math.atan2(dz, dx);
    box((a[0] + b[0]) / 2, floorY + columnHeight - .10 * unit, (a[1] + b[1]) / 2,
      length, .20 * unit, .15 * unit, 'accent', turn);
    box((a[0] + b[0]) / 2, floorY + .16 * unit, (a[1] + b[1]) / 2,
      length, .32 * unit, .12 * unit, 'structure', turn);
  }
  // A short chamfer used to get two intersecting posts. One centered corner
  // support joins its two rails cleanly, on every stepped floor profile.
  for (const post of proposedColumns) {
    const near = columns.find(other => Math.abs(other.x - post.x) < (other.width + post.width) / 2
      && Math.abs(other.z - post.z) < (other.width + post.width) / 2);
    if (near) { near.x = (near.x + post.x) / 2; near.z = (near.z + post.z) / 2; near.height = Math.max(near.height, post.height); }
    else columns.push({ ...post });
  }
  for (const post of columns) box(post.x, floorY + post.height / 2, post.z, post.width, post.height, post.width);
  features.push('Supported perimeter columns, low parapets and spandrels');

  // Waiting benches and planting occupy end pockets of the corridor, outside
  // both the doorway routes and the lift/stair reservation.
  const amenities = [];
  function bench(x, z, width) {
    const depth = .55 * unit;
    box(x, .5 * unit, z, width, .13 * unit, depth, 'accent');
    // Keep the back against the rooms so the seat faces the open shared hall.
    box(x, .83 * unit, z - .25 * unit, width, .62 * unit, .10 * unit, 'structure');
    for (const dx of [-width * .38, width * .38]) box(x + dx, .23 * unit, z, .12 * unit, .46 * unit, depth * .78, 'structure');
    for (let dx = -width * .4; dx <= width * .4; dx += .26 * unit)
      stroke([x + dx, .568 * unit, z - depth * .42], [x + dx, .568 * unit, z + depth * .42]);
    amenities.push({ kind: 'bench', x, z, width, depth });
  }
  function planter(x, z) {
    primitive(round, x, .3 * unit, z, .28 * unit, .55 * unit, .28 * unit, 'accent', 0, false);
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * .76;
      primitive(leaf, x + Math.cos(angle) * .11 * unit, (.78 + i * .07) * unit,
        z + Math.sin(angle) * .11 * unit, .22 * unit, .52 * unit, .22 * unit, 'glass', angle, false);
    }
    amenities.push({ kind: 'planter', x, z, width: .65 * unit, depth: .65 * unit });
  }
  const { minX: hallLeft, maxX: hallRight, maxZ: joinZ } = circulation.floor[0];
  const amenityZ = Math.min(joinZ - .45 * unit, mainEdge + .85 * unit);
  const westX = (hallLeft + Math.min(...rooms.slice(0, -1).map(room => room.opening.x - room.opening.width / 2))) / 2;
  const eastX = (hallRight + Math.max(...rooms.slice(0, -1).map(room => room.opening.x + room.opening.width / 2))) / 2;
  const westSpace = Math.min(...rooms.slice(0, -1).map(room => room.opening.x - room.opening.width / 2)) - hallLeft;
  const eastSpace = hallRight - Math.max(...rooms.slice(0, -1).map(room => room.opening.x + room.opening.width / 2));
  const hasWaitingBenches = section.id === 'about' || section.id === 'contact';
  if (hasWaitingBenches && westSpace > 1.4 * unit) bench(westX, amenityZ, Math.min(1.3 * unit, westSpace * .65));
  if (hasWaitingBenches && eastSpace > 1.4 * unit) bench(eastX, amenityZ, Math.min(1.7 * unit, eastSpace * .65));
  if (eastSpace > 2.2 * unit) planter(hallRight - .36 * unit, Math.min(joinZ - .4 * unit, amenityZ + .9 * unit));
  if (westSpace > 2.2 * unit) planter(hallLeft + .36 * unit, Math.min(joinZ - .4 * unit, amenityZ + .9 * unit));
  features.push('Furnished shared corridor waiting pockets');

  function merge(geometries, attributes) {
    const geometry = new T.BufferGeometry();
    for (const name of attributes) {
      const size = geometries.reduce((sum, item) => sum + item.attributes[name].array.length, 0);
      const data = new Float32Array(size); let offset = 0;
      for (const item of geometries) { data.set(item.attributes[name].array, offset); offset += item.attributes[name].array.length; }
      geometry.setAttribute(name, new T.BufferAttribute(data, 3));
    }
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    for (const item of geometries) item.dispose();
    return geometry;
  }
  const skin = buildBoxSurfaces(solidBoxes);
  for (const [surface, geometry] of skin.surfaces) parts.get(surface).push(geometry);
  lineParts.push(skin.outline);
  const surfaces = [];
  for (const [name, geometries] of parts) {
    if (!geometries.length) { materials[name].dispose(); continue; }
    const mesh = new T.Mesh(merge(geometries, ['position', 'normal']), materials[name]);
    mesh.name = `floor-architecture-${name}`; mesh.userData.surface = name;
    group.add(mesh); surfaces.push({ material: materials[name], color: new T.Color(colors[name]) });
  }
  if (plainLines.length) {
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(plainLines, 3));
    lineParts.push(geometry);
  }
  const mergedLines = merge(lineParts, ['position']);
  const outlines = new T.LineSegments(mergeSurfaceLines(mergedLines.attributes.position.array), line);
  mergedLines.dispose(); outlines.name = 'floor-architecture-outline'; group.add(outlines);
  for (const source of [cube, round, leaf]) source.dispose();
  group.userData.features = [...features];
  group.updateMatrixWorld(true);
  return { group, surfaces, line, features, rooms, circulation, columns, amenities,
    bounds: new T.Box3().setFromObject(group), primitiveCount };
}
