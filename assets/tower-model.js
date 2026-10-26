import * as T from './vendor/three.module.min.js';
import { sections, setbacks, footprint, insetFootprint, radius, towerAntennas, towerRoofHeight } from './tower-geometry.js';
import { createInterior } from './interiors.js';
import { floorContent } from './floor-content.js';
import { createDistrictGround } from './district-ground.js';
import { createCapPlans } from './cap-plans.js';
import { createDistrictBuildings } from './district-buildings.js';
import { createDistrictDetails } from './district-details.js';
import { createDistrictShadows } from './district-style.js';
import { palette, sectionColors } from './color-theme.js';
import { facadeColor } from './facade-materials.js';
import { applyTowerGlazing, cityPalette } from './city-environment.js';
import { createCityWaterfront } from './city-waterfront.js';
import { createCityLandscape } from './city-landscape.js';
import { createCityOutskirts } from './city-outskirts.js';

// Triangulate deliberate corners, then subdivide the triangle boundaries at
// every facade bay. Earcut on many nearly collinear bay samples can produce
// zero-area slivers; this keeps both clean faces and matching watertight edges.
function planarGeometry(height, holes=[], y=0) {
  const rings=[footprint(height),...holes.map(h=>footprint(h))];
  const corners=[footprint(height,12),...holes.map(h=>footprint(h,12))];
  const points=corners.flat(), samples=rings.flat();
  const triangles=T.ShapeUtils.triangulateShape(corners[0].map(p=>new T.Vector2(...p)),corners.slice(1).map(r=>r.map(p=>new T.Vector2(...p))));
  const positions=[];
  for(const triangle of triangles) {
    const vertices=triangle.map(i=>points[i]);
    const center=vertices.reduce((sum,p)=>[sum[0]+p[0]/3,sum[1]+p[1]/3],[0,0]);
    for(let edge=0;edge<3;edge++) {
      const a=vertices[edge],b=vertices[(edge+1)%3],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;
      const stops=new Map();
      for(const p of [a,b,...samples]) {
        const t=((p[0]-a[0])*dx+(p[1]-a[1])*dz)/length;
        if(t>=-1e-9&&t<=1+1e-9&&Math.abs((p[0]-a[0])*dz-(p[1]-a[1])*dx)<1e-8) stops.set(Math.round(t*1e9),p);
      }
      const ordered=[...stops.entries()].sort((a,b)=>a[0]-b[0]).map(entry=>entry[1]);
      for(let i=1;i<ordered.length;i++) {
        let p=ordered[i-1],q=ordered[i];
        if((p[0]-center[0])*(q[1]-center[1])-(p[1]-center[1])*(q[0]-center[0])>0) [p,q]=[q,p];
        positions.push(center[0],y,center[1],p[0],y,p[1],q[0],y,q[1]);
      }
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3)); geometry.computeVertexNormals();
  return geometry;
}
function capGeometry(height) { return planarGeometry(height); }

export function createTowerModel() {
  const root = new T.Group();
  const modules = sections.map((section, index) => {
    // A cut belongs to the volume below it. Sampling the next setback at the
    // top pinches the roof inward and leaves a stray contour across the cut.
    const profileHeight = y => y === section.high ? y - .002 : y;
    const group = new T.Group(); root.add(group);
    const shell = new T.Group(); group.add(shell);
    const clip = new T.Plane(new T.Vector3(0, -1, 0), 200);
    const colors = sectionColors[section.id];
    const cutTint = new T.Color(colors.tint), cutInk = new T.Color(colors.ink);
    const surface = new T.MeshLambertMaterial({ color: '#ffffff', vertexColors: true, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, clippingPlanes: [clip] });
    applyTowerGlazing(surface,section.low);
    const line = new T.LineBasicMaterial({ color: '#171f2b', transparent: true, opacity: .42, clippingPlanes: [clip] });
    const slabMaterial = new T.MeshLambertMaterial({ color: cityPalette.roof, side: T.DoubleSide, clippingPlanes: [clip] });
    let heights = [section.low, section.high];
    for (const y of setbacks) if (y > section.low && y < section.high) heights.push(y);
    for (let y = Math.ceil(section.low / 3.4) * 3.4; y < section.high; y += 3.4) if (y > section.low) heights.push(y);
    heights = [...new Set(heights.map(y => Math.round(y * 1e4) / 1e4))].sort((a, b) => a - b);
    // Each setback has two profiles at exactly the same Y. Their connecting
    // surfaces are real horizontal terraces, with no pinched/sloping roof rim.
    const levels = heights.flatMap(y => setbacks.includes(y) && y > section.low && y < section.high
      ? [{y,sample:y-.002},{y,sample:y}] : [{y,sample:profileHeight(y)}]);
    const positions = [], indices = [], lines = [], coarseLines = [];
    const count = 96;
    for (const {y,sample} of levels) for (const [x, z] of footprint(sample, count)) positions.push(x, y - section.low, z);
    for (let level = 0; level < levels.length - 1; level++) for (let i = 0; i < count; i++) {
      if (levels[level].y === levels[level+1].y) continue;
      const a = level * count + i, b = level * count + (i + 1) % count;
      indices.push(a, a + count, b, b, a + count, b + count);
      lines.push(...positions.slice(a * 3, a * 3 + 3), ...positions.slice((a + count) * 3, (a + count) * 3 + 3));
      if (i % 2 === 0) coarseLines.push(...positions.slice(a * 3, a * 3 + 3), ...positions.slice((a + count) * 3, (a + count) * 3 + 3));
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    // Material zones follow the whole elevation instead of restarting on each
    // wing or floor section. The solid topology and single surface draw remain.
    const facadeColors = [], nightFacadeColors = [], facade = new T.Color();
    for (const {y,sample} of levels) for (const [x,z] of footprint(sample,count)) {
      facadeColors.push(...facadeColor(Math.atan2(z,x),y,facade,{x,z}).toArray());
      nightFacadeColors.push(...facadeColor(Math.atan2(z,x),y,facade,{x,z},0).toArray());
    }
    geometry.setAttribute('color', new T.Float32BufferAttribute(facadeColors, 3));
    geometry.setAttribute('towerNightColor', new T.Float32BufferAttribute(nightFacadeColors, 3));
    geometry.setIndex(indices);
    // Walls, chamfers and horizontal ledges have different face normals.
    // Sharing their normals creates diagonal shading across an otherwise flat
    // terrace, especially obvious in the neutral massing study.
    const walls = geometry.toNonIndexed(); geometry.dispose();
    const facePositions=[...walls.attributes.position.array], faceColors=[...walls.attributes.color.array], faceNightColors=[...walls.attributes.towerNightColor.array];
    const roofColor=new T.Color(cityPalette.roof).toArray();
    // Triangulate the polygon difference. Connecting matching L-shaped corners
    // can cross into the next volume when the recessed corner changes position.
    for(const y of setbacks.filter(y=>y>section.low&&y<section.high)) {
      const terrace=planarGeometry(y-.002,[y],y-section.low);
      const p=terrace.attributes.position;
      facePositions.push(...p.array);
      for(let i=0;i<p.count;i++) { faceColors.push(...roofColor); faceNightColors.push(...roofColor); }
      terrace.dispose();
    }
    walls.dispose();
    const faceted=new T.BufferGeometry();
    faceted.setAttribute('position',new T.Float32BufferAttribute(facePositions,3));
    faceted.setAttribute('color',new T.Float32BufferAttribute(faceColors,3));
    faceted.setAttribute('towerNightColor',new T.Float32BufferAttribute(faceNightColors,3));
    faceted.computeVertexNormals();
    const mesh = new T.Mesh(faceted, surface);
    mesh.userData.sectionId = section.id;
    shell.add(mesh);
    const ring = (y, target = lines, sample=profileHeight(y)) => {
      const points = footprint(sample, count);
      for (let i = 0; i < count; i++) {
        const a = points[i], b = points[(i + 1) % count];
        target.push(a[0], y - section.low, a[1], b[0], y - section.low, b[1]);
      }
    };
    for (let y = Math.ceil(section.low / 1.7) * 1.7; y < Math.min(section.high, towerRoofHeight); y += 1.7) {
      ring(y); if (y + .12 < Math.min(section.high,towerRoofHeight)) ring(y + .12);
    }
    for (const y of heights) if (setbacks.includes(y)) { ring(y); ring(y,lines,y-.002); }
    ring(section.low); ring(section.high);
    for (let y = Math.ceil(section.low / 3.4) * 3.4; y < Math.min(section.high, towerRoofHeight); y += 3.4) ring(y, coarseLines);
    for (const y of heights) if (setbacks.includes(y)) { ring(y,coarseLines); ring(y,coarseLines,y-.002); }
    ring(section.low, coarseLines); ring(section.high, coarseLines);
    const lineGeometry = new T.BufferGeometry();
    lineGeometry.setAttribute('position', new T.Float32BufferAttribute(lines, 3));
    const coarseLineGeometry = new T.BufferGeometry();
    coarseLineGeometry.setAttribute('position', new T.Float32BufferAttribute(coarseLines, 3));
    shell.add(new T.LineSegments(lineGeometry, line));
    const caps = [];
    for (const y of [section.low, section.high]) {
      const cap = new T.Mesh(capGeometry(profileHeight(y)), slabMaterial);
      cap.name = y === section.low ? 'tower-bottom-cap' : 'tower-top-cap';
      cap.position.y = y - section.low;
      cap.userData.sectionId = section.id;
      shell.add(cap);
      caps.push(cap);
    }
    // Structural plates occupy the full volume, including every exposed cut.
    const platePositions = [], plateNormals = [];
    let structuralPlates=null;
    for (let y = section.low + 3.4; y < Math.min(section.high, towerRoofHeight); y += 3.4) {
      const source = capGeometry(y), plate = source.clone();
      plate.translate(0, y - section.low, 0);
      platePositions.push(...plate.attributes.position.array); plateNormals.push(...plate.attributes.normal.array);
      source.dispose(); plate.dispose();
    }
    if (platePositions.length) {
      const plates = new T.BufferGeometry();
      plates.setAttribute('position', new T.Float32BufferAttribute(platePositions, 3));
      plates.setAttribute('normal', new T.Float32BufferAttribute(plateNormals, 3));
      structuralPlates=new T.Mesh(plates,slabMaterial);structuralPlates.name='tower-structural-plates';shell.add(structuralPlates);
    }
    const antennas=[];
    if(index===0) {
      const mounts=new T.Group();mounts.name='tower-antennas';shell.add(mounts);
      for(const antenna of towerAntennas.filter(a=>!a.integrated)) {
        const geometry=new T.CylinderGeometry(antenna.radius*.7,antenna.radius,antenna.top-antenna.base,12);
        const material=new T.MeshLambertMaterial({color:palette.muted,clippingPlanes:[clip]});
        const pole=new T.Mesh(geometry,material);pole.position.set(antenna.x,(antenna.base+antenna.top)/2-section.low,antenna.z);
        pole.name='secondary-antenna';pole.userData.sectionId=section.id;mounts.add(pole);antennas.push(pole);
      }
    }
    const baseMaterial = new T.MeshLambertMaterial({ color: palette.structure, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1 });
    // These plates extend into the section below when the tower is assembled.
    // Recess their edges behind the glazing rather than sharing its wall plane.
    const floorShape = new T.Shape(insetFootprint(footprint(section.low + .005,12),.08).map(([x, z]) => new T.Vector2(x, z)));
    const floorGeometry = new T.ExtrudeGeometry(floorShape, { depth: radius(0, section.low) * .065, bevelEnabled: false });
    floorGeometry.rotateX(Math.PI / 2);
    const base = new T.Mesh(floorGeometry, baseMaterial);
    base.position.y = .035;
    base.add(new T.LineSegments(new T.EdgesGeometry(floorGeometry, 30), new T.LineBasicMaterial({ color: palette.muted, transparent: true, opacity: .28 })));
    group.add(base);
    const interior = createInterior(section, floorContent[section.id]);
    group.add(interior.group);
    const capPlans = createCapPlans(section, base.position.y - floorGeometry.parameters.options.depth);
    group.add(capPlans.group);
    const maxRadius = Math.max(...footprint(section.low).map(p => Math.hypot(...p)));
    group.position.y = section.low;
    return { ...section, colors, cutTint, cutInk, index, group, shell, clip, surface, line, lineGeometry, coarseLineGeometry, slabMaterial, caps, structuralPlates, interior, capPlans, maxRadius, base, mesh, antennas };
  });
  const ground = new T.Group(); root.add(ground);
  const groundLine = new T.LineBasicMaterial({ color: palette.draft, transparent: true, opacity: .45 });
  const marks = [];
  for(const side of [-1,1]) for(const offset of [-3,3]) marks.push(offset,-.1,side*19,offset,-.1,side*24);
  const markGeometry = new T.BufferGeometry(); markGeometry.setAttribute('position', new T.Float32BufferAttribute(marks, 3));
  ground.add(new T.LineSegments(markGeometry, groundLine));
  const district = createDistrictGround(); root.add(district.root);
  const districtBuildings = createDistrictBuildings(); root.add(districtBuildings.root);
  const districtDetails = createDistrictDetails(districtBuildings.buildings); root.add(districtDetails.root);
  const districtShadows = createDistrictShadows(districtBuildings.buildings, districtDetails.features); root.add(districtShadows.root);
  const waterfront = createCityWaterfront(); root.add(waterfront.root);
  const landscape=createCityLandscape();root.add(landscape.root);
  const outskirts=createCityOutskirts();root.add(outskirts.root);
  return { root, modules, ground, groundLine, district, districtBuildings, districtDetails, districtShadows, waterfront, landscape, outskirts,
    setCompact(compact) {
      for (const module of modules) module.shell.children[1].geometry = compact ? module.coarseLineGeometry : module.lineGeometry;
      district.root.getObjectByName('draft-grid-minor').visible = false;
      districtBuildings.root.getObjectByName('building-facades').visible = !compact;
      districtDetails.root.getObjectByName('district-detail-fine').visible = !compact;
    },
  };
}
