import { islandContains } from './city-geography.js';
import { islandTerrainHeight } from './island-topography.js';
import { outskirtsRoads, riverCenter, riverEdges, riverPlan } from './city-layout.js';

const expand=(b,d)=>[b[0]-d,b[1]-d,b[2]+d,b[3]+d];
export const settlementOverlap=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
const hash=(a,b)=>{const n=Math.sin(a*127.1+b*311.7+91.8)*43758.5453;return n-Math.floor(n);};
const roadBounds=(axis,center,start,end,width)=>axis==='x'?[start,center-width/2,end,center+width/2]:[center-width/2,start,center+width/2,end];
const point=(axis,center,along,across=0)=>axis==='x'?[along,center+across]:[center+across,along];
export function settlementDry(bounds,margin=5) {
  for(const x of [bounds[0],(bounds[0]+bounds[2])/2,bounds[2]])for(const z of [bounds[1],(bounds[1]+bounds[3])/2,bounds[3]]){
    if(!islandContains(x,z,.925))return false;
    if(x>=riverPlan.minX-55&&x<=riverPlan.mouthX+30){const banks=riverEdges(x);if(z>banks.north-margin&&z<banks.south+margin)return false;}
    if(((x-riverPlan.minX)/70)**2+((z-riverCenter(riverPlan.minX))/50)**2<1)return false;
  }
  return true;
}
const planned=[];
function road(id,axis,center,start,end,width=7) {
  const lo=Math.min(start,end),hi=Math.max(start,end),samples=[];
  for(let at=lo;at<hi;at+=12)samples.push(at);samples.push(hi);
  const good=at=>{
    const p=point(axis,center,at),b=[p[0]-width/2-2,p[1]-width/2-2,p[0]+width/2+2,p[1]+width/2+2];
    if(!settlementDry(b,8))return false;
    const h=islandTerrainHeight(...p);
    return Math.abs(islandTerrainHeight(...point(axis,center,at-6))-h)<1.1&&Math.abs(islandTerrainHeight(...point(axis,center,at+6))-h)<1.1;
  };
  let first=null,serial=0;
  const add=last=>{
    if(first===null||last-first<24)return;
    const profile=[];for(let at=first;at<last;at+=24)profile.push([at,islandTerrainHeight(...point(axis,center,at))+.32]);
    profile.push([last,islandTerrainHeight(...point(axis,center,last))+.32]);
    const simple=[];for(const p of profile){simple.push(p);while(simple.length>=3){const[a,b,c]=simple.slice(-3),y=a[1]+(c[1]-a[1])*(b[0]-a[0])/(c[0]-a[0]);if(Math.abs(y-b[1])>.025)break;simple.splice(simple.length-2,1);}}
    planned.push({id:`settlement-${id}-${serial++}`,axis,center,start:first,end:last,width,walk:2,profile:simple,bounds:roadBounds(axis,center,first,last,width)});
  };
  for(let i=0;i<samples.length;i++){
    if(good(samples[i])){if(first===null)first=samples[i];}
    else if(first!==null){add(samples[Math.max(0,i-1)]);first=null;}
  }
  if(first!==null)add(hi);
}
for(const x of [-482,-282,-42,282,482])road(`north-link-${x}`,'z',x,-482,x===482?-720:x===-42?-795:-825,8);
for(const [z,start,end]of [[-605,-780,790],[-735,-700,655],[-825,-530,420]])road(`north-row-${z}`,'x',z,start,end);
for(const side of [-1,1]){
  for(const z of [-382,-176,-42,42])road(`side-link-${side}-${z}`,'x',z,side*482,side*792,8);
  for(const x of [side*620,side*780])road(`side-spine-${x}`,'z',x,-735,riverEdges(x).north-18);
  for(const z of [270,422,502])road(`south-link-${side}-${z}`,'x',z,side*482,side*780,8);
  road(`south-edge-${side}`,'z',side*760,270,690);
}
for(const x of [-620,-382,-42,282,620])road(`south-spine-${x}`,'z',x,502,x===-42?840:755);
for(const [z,start,end]of [[625,-760,760],[755,-640,570],[835,-340,360]])road(`south-row-${z}`,'x',z,start,end);
road('harbor-link','x',42,780,1040);

// Remove any clipped spur that cannot reach the existing town through a road.
const connected=new Set();
for(const [i,r]of planned.entries())if(outskirtsRoads.some(old=>settlementOverlap(expand(r.bounds,.2),old.bounds)))connected.add(i);
let changed=true;while(changed){changed=false;for(const [i,r]of planned.entries())if(!connected.has(i)&&[...connected].some(j=>settlementOverlap(expand(r.bounds,.2),planned[j].bounds))){connected.add(i);changed=true;}}
export const settlementRoads=planned.filter((_,i)=>connected.has(i));
const allRoads=[...outskirtsRoads,...settlementRoads];
const urban=[-510,-515,510,525];
function site(bounds,maxRelief=1.8) {
  if(settlementOverlap(bounds,urban)||!settlementDry(expand(bounds,3)))return null;
  if(allRoads.some(r=>settlementOverlap(expand(r.bounds,r.walk+2),bounds)))return null;
  const heights=[];for(const x of [bounds[0],bounds[2]])for(const z of [bounds[1],bounds[3]])heights.push(islandTerrainHeight(x,z));
  const low=Math.min(...heights),high=Math.max(...heights);return high-low<=maxRelief?{base:high+.24,low}:null;
}
export function nearestSettlementRoad(x,z) {
  return settlementRoads.map(road=>{
    const along=Math.max(road.start,Math.min(road.end,road.axis==='x'?x:z)),[rx,rz]=point(road.axis,road.center,along);
    return {road,point:[rx,rz],distance:Math.hypot(x-rx,z-rz)};
  }).sort((a,b)=>a.distance-b.distance)[0];
}
export const settlementStructures=[];
for(const [type,x,z,w,d,height]of [
  ['school',-235,-565,60,32,8],['clinic',650,-285,34,24,7],['market',-650,-105,34,30,6],
  ['water-tower',-745,-550,17,17,20],['depot',657,570,44,26,7],['fire-station',330,658,42,30,7],
  ['solar-garden',-700,540,64,34,2],['community-hall',-430,700,30,22,8],['harbor-office',1010,18,28,20,6],
]){
  const bounds=[x-w/2,z-d/2,x+w/2,z+d/2],fit=site(bounds,type==='solar-garden'?5:2.2),access=nearestSettlementRoad(x,z);
  if(fit&&access?.distance<100)settlementStructures.push({id:`settlement-${type}`,type,x,z,w,d,height,bounds,...fit,access,accessBounds:[Math.min(x,access.point[0])-2,Math.min(z,access.point[1])-2,Math.max(x,access.point[0])+2,Math.max(z,access.point[1])+2]});
}
const candidates=[];
for(const [ri,r]of settlementRoads.entries()){
  for(let at=r.start+19;at<r.end-14;at+=35+hash(ri,3)*8)for(const side of [-1,1]){
    const seed=ri*131+Math.round(at*3)+side,w=15+hash(seed,7)*9,d=13+hash(seed,11)*8;
    const offset=r.width/2+r.walk+d/2+5+hash(seed,13)*3;
    const [x,z]=point(r.axis,r.center,at+(hash(seed,17)-.5)*6,side*offset);
    const sx=r.axis==='x'?w:d,sz=r.axis==='x'?d:w,bounds=[x-sx/2,z-sz/2,x+sx/2,z+sz/2],fit=site(bounds);
    if(!fit||settlementStructures.some(s=>settlementOverlap(expand(s.bounds,7),bounds)||settlementOverlap(s.accessBounds,bounds)))continue;
    candidates.push({id:`island-home-${r.id}-${Math.round(at*3)}-${side}`,x,z,w:sx,d:sz,roof:hash(seed,19)<.65?'gable':hash(seed,19)<.86?'hip':'flat',height:3.6+hash(seed,23)*4.8,seed,roadId:r.id,side,axis:r.axis,bounds,...fit,key:hash(seed,29)});
  }
}
candidates.sort((a,b)=>a.key-b.key);
export const settlementHouses=[];
for(const house of candidates)if(settlementHouses.length<320&&!settlementHouses.some(other=>settlementOverlap(expand(other.bounds,4),house.bounds)))settlementHouses.push(house);

/** Shared clearance keeps generated vegetation out of real streets and plots. */
export function settlementOccupied(x,z,radius=0) {
  const b=[x-radius,z-radius,x+radius,z+radius];
  return settlementRoads.some(road=>settlementOverlap(expand(road.bounds,road.walk+3),b))
    ||settlementHouses.some(house=>settlementOverlap(expand(house.bounds,4),b))
    ||settlementStructures.some(structure=>settlementOverlap(expand(structure.bounds,5),b)||settlementOverlap(structure.accessBounds,b));
}
