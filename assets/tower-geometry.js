/** Shared world-space geometry. Y is up; the complete tower is 110 units tall. */
export const sections = [
  { id: 'about', name: 'About', number: '01', low: 78.5, high: 110, theme: 'The personal study', subtitle: 'THE PERSON BEHIND THE PLANS' },
  { id: 'projects', name: 'Projects', number: '02', low: 52.5, high: 78.5, theme: 'The makers’ workshop', subtitle: 'IDEAS / EXPERIMENTS / BUILDS' },
  { id: 'experience', name: 'Experience', number: '03', low: 31.5, high: 52.5, theme: 'The electronics laboratory', subtitle: 'CIRCUITS / SYSTEMS / THE TRACK' },
  { id: 'resume', name: 'Résumé', number: '04', low: 14.5, high: 31.5, theme: 'The reference archive', subtitle: 'EDUCATION / SKILLS / THE PDF' },
  { id: 'contact', name: 'Contact', number: '05', low: 0, high: 14.5, theme: 'The conversation lounge', subtitle: 'LET’S BUILD SOMETHING' },
];

// Twelve corresponding corners keep the long main block and shorter west wing
// legible from every side. Profiles are nested; setbacks are horizontal terraces.
const plate = (height, minX, maxX, minZ, join, wingRight, maxZ, chamfer) => ({
  height, minX, maxX, minZ, join, wingRight, maxZ, chamfer,
  polygon: [[minX+chamfer,minZ],[maxX-chamfer,minZ],[maxX,minZ+chamfer],
    [maxX,join-chamfer],[maxX-chamfer,join],[wingRight+chamfer,join],
    [wingRight,join+chamfer],[wingRight,maxZ-chamfer],[wingRight-chamfer,maxZ],
    [minX+chamfer,maxZ],[minX,maxZ-chamfer],[minX,minZ+chamfer]],
});
export const floorProfiles = [
  plate(0,-18,18,-10,4,-3,15,1.2),
  plate(18,-17,17,-9,3.7,-3.5,13,1),
  plate(38,-16,15,-8,3,-4,11,.9),
  plate(59,-13,13,-7,2.7,-5,8,.8),
  plate(80,-10,10,-6,1.7,-5.3,5.5,.6),
  plate(94,-7,5,-5,1,-5.5,3,.4),
  plate(99.5,-4.7,-1.3,-2.7,.1,-3,.7,.2),
];
export const setbacks = floorProfiles.slice(1).map(profile => profile.height);
export function profileAt(height) {
  return floorProfiles.findLast(profile => height >= profile.height) || floorProfiles[0];
}
export function footprint(height, count = 96) {
  const profile = profileAt(height);
  // A slender, offset lantern tapers into the needle without recentering it.
  const scale = height >= 99.5 ? Math.max(.003, (110-height)/10.5) : 1;
  const corners = profile.polygon.map(([x,z]) => height >= 99.5 ? [-3+(x+3)*scale,-1+(z+1)*scale] : [x,z]);
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
  const bay=(p.maxX-p.minX-inset*2)/mainCount;
  const regions=Array.from({length:mainCount},(_,i)=>({
    x:p.minX+inset+bay*(i+.5), z:(p.minZ+inset+p.join-corridor)/2,
    width:bay-.6,depth:p.join-corridor-p.minZ-inset,
  }));
  regions.push({x:(p.minX+p.wingRight)/2,z:(p.join+p.maxZ)/2,
    width:p.wingRight-p.minX-inset*2,depth:p.maxZ-p.join-inset*2});
  // One aligned lift/stair spine through all occupied cuts, in their shared
  // junction corridor. Setbacks must not shift the elevator between floors.
  const core={x:-6.5,z:2.85,width:2.3,depth:1.1};
  const stations=regions.map(region=>{
    const scale=Math.min(region.width/9,region.depth/7.5);
    return {...region,angle:0,scale,reach:scale*18,region};
  });
  return {outline,regions,core,stations,bounds:{minX:p.minX,maxX:p.maxX,minZ:p.minZ,maxZ:p.maxZ}};
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
