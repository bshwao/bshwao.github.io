import * as T from './vendor/three.module.min.js';
import { palette, sectionColors } from './color-theme.js';
import { floorLayout, insetFootprint, towerRoofHeight } from './tower-geometry.js';
import { floorContent } from './floor-content.js';
import { planInteriorStructure } from './interior-structure.js';
import { interiorRoomDesign } from './interior-design.js';

// Small architectural sketches for the closed tower's exposed cut faces.
// These are independent of the detailed, selectable interiors below the caps.
export function createCapPlans(section, undersideY) {
  const group = new T.Group(); group.name = `cap-plans-${section.id}`;
  const walls = [], furniture = [];
  const furnitureColors=[];
  const faces = [], features = new Set(['perimeter-walls', 'elevator', 'stairs', 'room-partitions']);

  const inside = (point, polygon) => {
    let result = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
    }
    return result;
  };

  function face(height, y, side) {
    let furnitureInk=new T.Color(sectionColors[section.id].ink);
    // Crown and spire levels are not occupied floors.
    if (height >= towerRoofHeight) return;
    const roomCount = floorContent[section.id].rooms.length;
    const layout=floorLayout(height,roomCount),{ outline, stations, core,service } = layout;
    const architecture=planInteriorStructure(layout,Math.max(...stations.map(station=>station.scale)));
    const boundary = insetFootprint(outline, .04);
    const drawing = { height, y, side, boundary, roomCount, rooms: [] };
    faces.push(drawing);

    // Clip every stroke to the inset shared polygon, including the L-shaped recess.
    function line(target, a, b) {
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const stops = [0, 1];
      for (let i = 0; i < boundary.length; i++) {
        const p = boundary[i], q = boundary[(i + 1) % boundary.length];
        const ex = q[0] - p[0], ez = q[1] - p[1];
        const cross = dx * ez - dz * ex;
        if (Math.abs(cross) < 1e-10) continue;
        const px = p[0] - a[0], pz = p[1] - a[1];
        const t = (px * ez - pz * ex) / cross, u = (px * dz - pz * dx) / cross;
        if (t > 0 && t < 1 && u >= 0 && u <= 1) stops.push(t);
      }
      stops.sort((a, b) => a - b);
      for (let i = 1; i < stops.length; i++) {
        const start = stops[i - 1], end = stops[i], middle = (start + end) / 2;
        if (end - start < 1e-8 || !inside([a[0] + dx * middle, a[1] + dz * middle], boundary)) continue;
        target.push(a[0] + dx * start, y, a[1] + dz * start, a[0] + dx * end, y, a[1] + dz * end);
        if(target===furniture)furnitureColors.push(...furnitureInk.toArray(),...furnitureInk.toArray());
      }
    }
    const path = (target, points, transform = p => p) => {
      for (let i = 1; i < points.length; i++) line(target, transform(points[i - 1]), transform(points[i]));
    };
    function box(target, x, z, width, depth, transform) {
      path(target, [[x - width / 2, z - depth / 2], [x + width / 2, z - depth / 2],
        [x + width / 2, z + depth / 2], [x - width / 2, z + depth / 2], [x - width / 2, z - depth / 2]], transform);
    }
    function arc(target, x, z, r, start = 0, end = Math.PI * 2, transform) {
      path(target, Array.from({ length: 17 }, (_, i) => {
        const angle = start + (end - start) * i / 16;
        return [x + Math.cos(angle) * r, z + Math.sin(angle) * r];
      }), transform);
    }

    // Two fine perimeter strokes read as wall thickness rather than a roof rim.
    for (const distance of [.04, .11]) {
      const contour = insetFootprint(boundary, distance);
      path(walls, [...contour, contour[0]]);
    }
    const {elevator:lift,stair}=service;
    box(walls, core.x, core.z, core.width * .96, core.depth * .96);
    box(walls,lift.x,lift.z,lift.width,lift.depth);
    path(walls,[[lift.x-lift.width/2,lift.z-lift.depth/2],[lift.x+lift.width/2,lift.z+lift.depth/2]]);
    path(walls,[[lift.x-lift.width/2,lift.z+lift.depth/2],[lift.x+lift.width/2,lift.z-lift.depth/2]]);
    box(walls,stair.x,stair.z,stair.run,stair.width);
    for(let i=1;i<stair.count;i++) {
      const x=stair.x-stair.run/2+i*stair.going;
      path(walls,[[x,stair.z-stair.width/2],[x,stair.z+stair.width/2]]);
    }
    path(walls,[[stair.x-stair.run*.38,stair.z],[stair.x+stair.run*.38,stair.z],
      [stair.x+stair.run*.23,stair.z-stair.width*.22]]);
    for(const route of architecture.circulation.paths)path(walls,route.points);

    for (const [index, station] of stations.entries()) {
      furnitureInk=new T.Color(interiorRoomDesign(section.id,index).colors.equipment);
      const firstFurnitureVertex = furniture.length;
      const region = station.region;
      // The cap uses the same room centres and orthogonal regions as the interior.
      const unit = Math.min(region.width / 8.4, region.depth / 7.6);
      const room = ([x, z]) => [station.x + x * unit, station.z + z * unit];
      const halfWidth = region.width / 2 + .16, halfDepth = region.depth / 2 + .16;
      const opening=architecture.rooms[index].opening,{entrySide}=opening,entryZ=opening.z;
      const gap=opening.width/2,entryX=opening.x;
      path(walls, [[entryX - gap, entryZ], [station.x - halfWidth, entryZ],
        [station.x - halfWidth, station.z - entrySide * halfDepth],
        [station.x + halfWidth, station.z - entrySide * halfDepth],
        [station.x + halfWidth, entryZ], [entryX + gap, entryZ]]);
      path(walls, [[entryX - gap, entryZ], [entryX - gap, entryZ - entrySide * gap * 2]]);
      arc(walls, entryX - gap, entryZ, gap * 2,
        entrySide > 0 ? -Math.PI / 2 : 0, entrySide > 0 ? 0 : Math.PI / 2);

      const rect = (x, z, w, d) => box(furniture, x, z, w, d, room);
      const stroke = points => path(furniture, points, room);
      const circle = (x, z, r) => arc(furniture, x, z, r, 0, Math.PI * 2, room);
      function chair(x, z) {
        rect(x, z, .8, .8); stroke([[x - .5, z + .5], [x + .5, z + .5]]);
      }
      function desk(x = 0, z = 0, count = 1) {
        rect(x, z, 3.8, 1.7);
        for (let i = 0; i < count; i++) {
          const mx = x + (i - (count - 1) / 2) * 1.5;
          rect(mx, z + .25, 1.15, .22); stroke([[mx, z + .15], [mx, z - .08]]);
        }
        rect(x, z - .4, 1.15, .35); chair(x, z - 1.65);
      }
      function sofa(x, z, facing) {
        rect(x, z, 1.15, 3.4);
        stroke([[x + facing * .35, z - 1.55], [x + facing * .35, z + 1.55]]);
        for (const dz of [-.55, .55]) stroke([[x - .5, z + dz], [x + .5, z + dz]]);
      }

      if (section.id === 'penthouse') {
        if (index === 0) {
          rect(-.35,-.1,2.9,4.6);rect(-.35,-2.55,3.15,.22);
          rect(-1.08,-1.65,1.15,.72);rect(.38,-1.65,1.15,.72);
          stroke([[-1.8,-.8],[1.1,-.8]]);rect(2.15,-1.8,.95,.95);circle(2.15,-1.8,.24);
          features.add('penthouse-bed-and-pillows');
        } else if (index === 1) {
          rect(0,1.45,4.4,1.3);rect(0,2.05,4.4,.2);stroke([[0,.8],[0,2.1]]);
          rect(0,-2,3.8,.65);rect(0,-.25,1.8,1);rect(0,-.25,.8,.4);
          circle(-.23,-.25,.06);circle(.23,-.25,.06);rect(-2.85,-.7,1.05,1.6);
          features.add('penthouse-game-lounge');
        } else if (index === 2) {
          rect(0,-1.3,4.2,1.65);circle(-1.05,-1.3,.62);circle(-1.05,-1.3,.16);
          stroke([[.05,-1.85],[-.45,-1.25]]);rect(-2.8,-1.3,.7,1);rect(2.8,-1.3,.7,1);
          rect(0,1.3,3.8,1);
          for(let key=-1.55;key<1.6;key+=.45)stroke([[key,.85],[key,1.75]]);
          features.add('penthouse-turntable-and-synth');
        } else {
          circle(-1.6,-1.3,.75);stroke([[-2.35,-1.3],[-.85,-1.3]]);stroke([[-1.6,-2.05],[-1.6,-.55]]);
          stroke([[.5,.7],[1.3,-.8],[2.2,.7]]);stroke([[1.3,-.8],[1.3,1]]);
          stroke([[.55,-1.8],[1.95,-2.5],[2.35,-1.75],[.95,-1.05],[.55,-1.8]]);
          rect(-1.85,1.9,1.25,1.25);rect(.2,1.9,1.25,1.25);
          features.add('penthouse-telescope-and-globe');
        }
      } else if (section.id === 'about') {
        if (index === 0) { rect(0, 0, 3.4, 1.8); chair(-1, -1.7); chair(1, 1.7); features.add('orientation-table'); }
        if (index === 1) { desk(); rect(2.9, .3, .8, 3.2); features.add('study-desk'); }
        if (index === 2) {
          stroke([[-1.5, -1], [1.5, -1], [1.5, -.4], [1.2, .5], [.7, 1.4], [-.3, 1.9], [-1.2, 1.4], [-1.5, .5], [-1.5, -1]]);
          rect(0, -1.2, 3, .4); rect(0, -2.4, 1.6, .65);
          for (let i = 0; i < 9; i++) stroke([[-1.2 + i * .3, -1.4], [-1.2 + i * .3, -1]]);
          features.add('piano');
        }
        if (index === 3) { sofa(-2.1, 0, 1); sofa(2.1, 0, -1); circle(0, 0, .8); features.add('study-lounge'); }
      } else if (section.id === 'projects') {
        if (index === 0) { desk(0, 0, 2); features.add('development-workstation'); }
        if (index === 1) {
          for (const x of [-1.6, 0, 1.6]) {
            rect(x, .2, 1.25, 2.6);
            for (const z of [-.5, .2, .9]) stroke([[x - .5, z], [x + .5, z]]);
          }
          features.add('server-racks');
        }
        if (index === 2) { desk(); rect(2.8, .5, .7, 3.6); features.add('simulation-desk'); }
      } else if (section.id === 'experience') {
        if (index === 0 || index === 2) {
          rect(0, 0, 4.8, 2); rect(-1.25, .2, 1.4, .8); rect(1, -.15, 1.1, .85); chair(0, -1.8);
          stroke([[-1.8, .2], [-1.55, .2], [-1.4, .45], [-1.2, -.05], [-1, .3], [-.8, .2]]);
          for (const x of [.7, 1, 1.3]) stroke([[x, -.7], [x, -.3]]);
          features.add('electronics-benches');
          if (index === 2) { rect(2.8, 0, .65, 3); features.add('diagnostic-equipment'); }
        } else if (index === 1) {
          for (const x of [-1.5, 1.5]) {
            rect(x, 0, 1.4, 3.5);
            for (let z = -1.3; z <= 1.3; z += .5) stroke([[x - .6, z], [x + .6, z]]);
          }
          stroke([[-1.5, 2], [0, 2], [0, -2], [1.5, -2]]); features.add('network-racks');
        } else {
          stroke([[0, -2.4], [-.5, -1.6], [-.7, .2], [-1.2, 1.5], [1.2, 1.5], [.7, .2], [.5, -1.6], [0, -2.4]]);
          for (const x of [-1.2, 1.2]) for (const z of [-1.3, .9]) rect(x, z, .55, .85);
          rect(0, 1.9, 3, .35); circle(0, 0, .38); features.add('formula-car');
        }
      } else if (section.id === 'resume') {
        if (index === 0) { desk(); features.add('reference-desk'); }
        else if (index === 1) {
          for (const x of [-1.7, 1.7]) {
            rect(x, 0, .95, 4.5);
            for (let z = -1.8; z <= 1.8; z += .6) stroke([[x - .4, z], [x + .4, z]]);
          }
          features.add('archive-shelving');
        } else if (index === 2) {
          rect(0, 0, 4.8, 2.2); chair(0, -1.8);
          rect(-1.2, 0, 1.4, 1.25); rect(1.1, 0, 1.6, 1.25); features.add('technical-reference');
        } else {
          desk(); rect(2.7, .4, 1, 3.8);
          for (const z of [-1, -.3, .4, 1.1]) stroke([[2.3, z], [3.1, z]]);
          features.add('document-cabinet');
        }
      } else if (section.id === 'contact') {
        if (index === 0) {
          stroke([[-2.5, 1], [2.5, 1], [2.5, -.2], [.5, -.2], [.5, -1.4], [-2.5, -1.4], [-2.5, 1]]);
          rect(-1, .2, 1.1, .25); chair(-1, -2.2); features.add('reception-counter');
        }
        if (index === 1) { desk(0, 0, 2); features.add('code-exchange'); }
        if (index === 2) {
          circle(0, 0, 1.45);
          for (const x of [-2.1, 2.1]) chair(x, 0);
          chair(0, -2.1); chair(0, 2.1); features.add('meeting-table');
        }
        if (index === 3) { sofa(-2.1, 0, 1); sofa(2.1, 0, -1); circle(0, 0, .8); features.add('lounge-seating'); }
      }
      drawing.rooms.push({ index, region, segments: (furniture.length - firstFurnitureVertex) / 6 });
    }
  }

  face(section.high - .002, section.high - section.low + .12, 'top');
  face(section.low + .005, undersideY - .12, 'underside');
  const materials = [
    new T.LineBasicMaterial({ color: palette.muted, transparent: true, opacity: .75, depthWrite: false }),
    new T.LineBasicMaterial({ color: '#ffffff', vertexColors: true, transparent: true, opacity: .8, depthWrite: false }),
  ];
  for (const [index, positions] of [walls, furniture].entries()) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    if (index === 1) {
      geometry.setAttribute('color', new T.Float32BufferAttribute(furnitureColors, 3));
    }
    const lines = new T.LineSegments(geometry, materials[index]);
    lines.name = index === 0 ? 'plan-walls-and-core' : 'plan-furniture'; group.add(lines);
  }
  group.visible = false;
  return {
    group, faces, features: [...features],
    setPresentation(expansion, cut, context) {
      const amount = T.MathUtils.smoothstep(expansion, .15, .85) * (1 - T.MathUtils.smoothstep(cut, 0, .12)) * context;
      group.visible = amount > .001;
      materials[0].opacity = .75 * amount; materials[1].opacity = .8 * amount;
    },
  };
}
