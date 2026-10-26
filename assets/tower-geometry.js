/** Shared world-space geometry. Y is up; heights use illustrative model units. */
export const towerHeight = 148.5;
// Keep the visible finish several depth-buffer steps above the recessed slab,
// including distant floor-overview cameras. Furniture and core share its level.
export const interiorFloorHeight = .12;
// Lengthen the bundled shafts without changing their footprints or room scale.
// Keep common elevations exact so wall, terrace and cap seams share one level.
const elevation = height => Math.round(height * towerHeight / 110 * 1e4) / 1e4;
export const towerRoofHeight = elevation(99.5);
export const sections = [
  { id: 'penthouse', name: 'Penthouse', number: '06', low: 87.5, high: 110, theme: 'The after-hours apartment', subtitle: 'MAKE YOURSELF AT HOME' },
  { id: 'about', name: 'About', number: '01', low: 78.5, high: 87.5, theme: 'The personal study', subtitle: 'THE PERSON BEHIND THE PLANS' },
  { id: 'projects', name: 'Projects', number: '02', low: 52.5, high: 78.5, theme: 'The makers’ workshop', subtitle: 'IDEAS / EXPERIMENTS / BUILDS' },
  { id: 'experience', name: 'Experience', number: '03', low: 31.5, high: 52.5, theme: 'The electronics laboratory', subtitle: 'CIRCUITS / SYSTEMS / THE TRACK' },
  { id: 'resume', name: 'Résumé', number: '04', low: 14.5, high: 31.5, theme: 'The reference archive', subtitle: 'EDUCATION / SKILLS / THE PDF' },
  { id: 'contact', name: 'Contact', number: '05', low: 0, high: 14.5, theme: 'The conversation lounge', subtitle: 'LET’S BUILD SOMETHING' },
].map(section => ({ ...section, low: elevation(section.low), high: elevation(section.high) }));

export function expandedSectionOffset(index) {
  return [(index%2?1:-1)*(index===sections.length-1?10:8),(sections.length-1-index)*10,0];
}

// A podium and three bundled shafts end at unequal heights. Almost aligned
// west/north faces carry a continuous spine instead of a repeating pyramid.
const plate = (height, minX, maxX, minZ, join, wingRight, maxZ, chamfer) => ({
  height: elevation(height), minX, maxX, minZ, join, wingRight, maxZ, chamfer,
  polygon: [[minX+chamfer,minZ],[maxX-chamfer,minZ],[maxX,minZ+chamfer],
    [maxX,join-chamfer],[maxX-chamfer,join],[wingRight+chamfer,join],
    [wingRight,join+chamfer],[wingRight,maxZ-chamfer],[wingRight-chamfer,maxZ],
    [minX+chamfer,maxZ],[minX,maxZ-chamfer],[minX,minZ+chamfer]],
});
export const floorProfiles = [
  plate(0,-21,21,-13,6,2,17,.65),
  plate(8,-18,18,-11.5,5.7,1.7,13.5,.45),
  plate(44,-17.7,10.5,-11.2,5.4,1.4,13.2,.4),
  plate(70,-17.4,7,-10.9,5.1,1.1,12.9,.35),
  plate(96,-17.1,-3.6,-10.6,4.8,-7.3,12.6,.3),
  plate(99.5,-12.24,-11.76,-4.24,-3.9,-12,-3.76,.035),
];
export const towerAntennas=[
  {x:-12,z:-4,base:towerRoofHeight,top:towerHeight,radius:.24,integrated:true},
  {x:-7,z:-4,base:towerRoofHeight,top:elevation(107.6),radius:.16,integrated:false},
];
export const setbacks = floorProfiles.slice(1).map(profile => profile.height);
export function profileAt(height) {
  return floorProfiles.findLast(profile => height >= profile.height) || floorProfiles[0];
}
export function footprint(height, count = 96) {
  const profile = profileAt(height);
  // The primary antenna is part of the watertight shell; the second mounts on
  // its neighboring roof and travels with the Penthouse section.
  const scale=height>=towerRoofHeight?1-.3*Math.min(1,(height-towerRoofHeight)/(towerHeight-towerRoofHeight)):1;
  const corners=profile.polygon.map(([x,z])=>height>=towerRoofHeight?[-12+(x+12)*scale,-4+(z+4)*scale]:[x,z]);
  const samples = Math.max(1,Math.round(count/corners.length));
  return corners.flatMap((point,index) => Array.from({length:samples},(_,i) => {
    const next = corners[(index+1)%corners.length], t=i/samples;
    return [point[0]+(next[0]-point[0])*t,point[1]+(next[1]-point[1])*t];
  }));
}
/** Legacy radial measurement, now an intersection with the actual polygon. */
export function radius(angle,height) {
  const direction=[Math.cos(angle),Math.sin(angle)], polygon=footprint(height,12);
  let distance=Infinity;
  for(let i=0;i<polygon.length;i++) {
    const a=polygon[i],b=polygon[(i+1)%polygon.length],edge=[b[0]-a[0],b[1]-a[1]];
    const cross=direction[0]*edge[1]-direction[1]*edge[0];
    if(Math.abs(cross)<1e-10) continue;
    const t=(a[0]*edge[1]-a[1]*edge[0])/cross, u=(a[0]*direction[1]-a[1]*direction[0])/cross;
    if(t>=0 && u>=0 && u<=1) distance=Math.min(distance,t);
  }
  return Number.isFinite(distance)?distance:Math.max(...polygon.map(p=>Math.hypot(...p)));
}
/** One source for occupied rectangles, service core, drawings and room anchors. */
export function floorLayout(height,count=4) {
  const p=profileAt(height), outline=footprint(height);
  const inset=.75, corridor=1.8, mainCount=count-1;
  const mainTop=Math.min(p.join-corridor,2);
  const bay=(p.maxX-p.minX-inset*2)/mainCount;
  const regions=Array.from({length:mainCount},(_,i)=>({
    x:p.minX+inset+bay*(i+.5), z:(p.minZ+inset+mainTop)/2,
    width:bay-.6,depth:mainTop-p.minZ-inset,
  }));
  regions.push({x:(p.minX+p.wingRight)/2,z:(p.join+p.maxZ)/2,
    width:p.wingRight-p.minX-inset*2,depth:p.maxZ-p.join-inset*2});
  // One aligned lift/stair spine through all occupied cuts, in their shared
  // junction corridor. Setbacks must not shift the elevator between floors.
  const core={x:-9,z:3.45,width:7.6,depth:2.4};
  const stations=regions.map(region=>{
    const scale=Math.min(region.width/9,region.depth/7.5);
    return {...region,angle:0,scale,reach:scale*18,region};
  });
  const unit=Math.max(...stations.map(station=>station.scale));
  const service={
    elevator:{x:core.x-core.width*.335,z:core.z,width:1.45*unit,depth:1.4*unit,height:2.75*unit,baseY:interiorFloorHeight},
    stair:{x:core.x+core.width*.19,z:core.z,width:1.2*unit,count:8,going:.35*unit,rise:.19*unit,run:2.8*unit,baseY:interiorFloorHeight},
  };
  return {outline,regions,core,stations,service,bounds:{minX:p.minX,maxX:p.maxX,minZ:p.minZ,maxZ:p.maxZ}};
}
export function stationPositions(section,count) { return floorLayout(section.low+.02,count).stations; }
/** Offset along inward edge normals, including the L's reentrant corner. */
export function insetFootprint(polygon,distance) {
  return polygon.map((point,index)=>{
    const previous=polygon[(index+polygon.length-1)%polygon.length],next=polygon[(index+1)%polygon.length];
    const normal=(a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);return [-dz/length,dx/length];};
    const a=normal(previous,point),b=normal(point,next),factor=distance/(1+a[0]*b[0]+a[1]*b[1]);
    return [point[0]+(a[0]+b[0])*factor,point[1]+(a[1]+b[1])*factor];
  });
}
