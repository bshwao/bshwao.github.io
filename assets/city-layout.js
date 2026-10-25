import { riverOceanMouth } from './city-geography.js';

// North is -Z. One plan supplies lots, generated volumes, collision bounds and
// camera composition. Heights are illustrative model units, not surveyed metres.
const blocks = [
  ['01',[-96,-96,-51,-51]],['02',[-33,-96,-4,-51]],['03',[4,-96,33,-51]],['04',[51,-96,96,-51]],
  ['05',[-96,-33,-51,-4]],['06',[51,-33,96,-4]],['07',[-96,4,-51,33]],['08',[51,4,96,33]],
  ['09',[-96,51,-51,96]],['10',[-33,51,-4,96]],['11',[4,51,33,96]],['12',[51,51,96,96]],
].map(([id,bounds])=>({id,bounds,layer:'urban'}));
const inner = [];
for(const side of [-1,1]) for(const along of [-1,1]) {
  const band=along<0?[-18,-5]:[5,18];
  inner.push({id:`I${inner.length+1}`,bounds:side<0?[-36,band[0],-26,band[1]]:[26,band[0],36,band[1]],layer:'foreground'});
  inner.push({id:`I${inner.length+1}`,bounds:side<0?[band[0],-36,band[1],-26]:[band[0],26,band[1],36],layer:'foreground'});
}
const distant = [
  [-146,-154,-108,-116,42],[-94,-156,-54,-116,48],[-30,-158,0,-116,60],
  [8,-152,32,-112,36],[56,-156,94,-116,46],[108,-150,148,-110,52],
  [-158,-86,-120,-52,38],[-142,110,-100,132,28],[100,110,142,132,32],
].map((row,index)=>({id:`D${index+1}`,bounds:row.slice(0,4),height:row[4],layer:'distant'}));
const outer=[];
const outerLot=(bounds,height,family,form='terraced',layer='distant')=>outer.push({id:`E${outer.length+1}`,bounds,height,family,form,layer,extension:true});
for(const [i,x]of [-225,-150,-75,0,75,150,225].entries()) outerLot([x-24,-232,x+24,-190],24+(i%4)*7,['brick','limestone','glass'][i%3],i%3===2?'slender':'terraced');
for(const side of [-1,1]) for(const [i,z]of [-122,-68,0,68].entries()) outerLot([side*215-22,z-16,side*215+22,z+16],18+(i%3)*9,i%2?'brick':'limestone');
for(const [i,bounds]of [[-94,109,-58,127],[-30,109,-6,127],[6,109,30,127],[58,109,94,127]].entries()) outerLot(bounds,12+i*3,i%2?'limestone':'brick','slab','foreground');
for(const [i,x]of [-215,-157,188,234].entries()) outerLot([x-18,220,x+18,258],12+(i%3)*4,i%2?'limestone':'brick');
export const riverCenter=x=>168+16*Math.sin((x+80)/90)-x*.08;
const mouthX = riverOceanMouth(riverCenter);
export const riverPlan={minX:-850,maxX:mouthX+70,mouthX,halfWidth:20,promenadeWidth:7,waterY:-.58,bridges:[-42,42]};
export const riverEdges=x=>({north:riverCenter(x)-riverPlan.halfWidth,south:riverCenter(x)+riverPlan.halfWidth});
export const parkPlan=[
  {id:'west-garden',bounds:[-166,-24,-112,24],form:'garden'},
  {id:'east-square',bounds:[112,-24,166,24],form:'fountain'},
  {id:'south-park',bounds:[-30,234,30,292],form:'lawn'},
];
// Peripheral streets join the existing avenues, bridge landings and riverwalk.
// Rectangles are shared with placement checks and the rendered street network.
export const outskirtsRoads=[];
function street(id,axis,center,start,end,width=8) {
  outskirtsRoads.push({id,axis,center,start,end,width,walk:2.5,
    bounds:axis==='x'?[start,center-width/2,end,center+width/2]:[center-width/2,start,center+width/2,end]});
}
for(const z of [-482,-382,-282,-176]) street(`north-${z}`,'x',z,-482,482,z===-176?10:8);
for(const z of [-42,42])for(const side of [-1,1])street(`avenue-${side}-${z}`,'x',z,side<0?-482:170,side<0?-170:482,10);
for(const side of [-1,1])street(`cross-${side}`,'x',-94,side<0?-482:181,side<0?-181:482);
for(const x of [-482,-382,-282,-181,181,282,382,482])
  street(`north-spine-${x}`,'z',x,-482,riverEdges(x).north-riverPlan.promenadeWidth-4);
for(const x of [-42,42])street(`downtown-north-${x}`,'z',x,-482,-170,10);
street('south-bank','x',214,-260,290,10);
for(const side of [-1,1])street(`south-garden-${side}`,'x',270,side<0?-482:37,side<0?-37:482);
for(const z of [322,422,502])street(`south-${z}`,'x',z,-482,482);
for(const x of [-482,-382,-282,-181,-42,42,181,282,382,482])
  street(`south-spine-${x}`,'z',x,Math.abs(x)===42?214:270,502,Math.abs(x)===42?10:8);

export const neighborhoodParcels=[];
export const outskirtsPublicSpaces=[{id:'neighborhood-court',bounds:[-27,342,27,400]},{id:'service-yard',bounds:[-274,228,-244,252]}];
const overlaps=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
function homes(bounds,district,index) {
  const [x0,z0,x1,z1]=bounds,mid=(x0+x1)/2;
  for(const [i,b]of [[x0,z0,mid-3,z1],[mid+3,z0,x1,z1]].entries()) {
    if([...blocks,...inner,...distant,...outer,...parkPlan,...outskirtsPublicSpaces].some(p=>overlaps(b,p.bounds)))continue;
    if(outskirtsRoads.some(r=>overlaps(b,[r.bounds[0]-r.walk,r.bounds[1]-r.walk,r.bounds[2]+r.walk,r.bounds[3]+r.walk])))continue;
    let dry=true;
    for(let x=b[0];x<=b[2];x+=2){const water=riverEdges(x);if(b[3]>water.north-10&&b[1]<water.south+10)dry=false;}
    if(!dry)continue;
    const civic=district==='east'&&index===2&&i===0,workshop=district==='west'&&index===0;
    neighborhoodParcels.push({id:`O${neighborhoodParcels.length+1}`,bounds:b,district,extension:true,layer:'outskirts',
      height:civic?14:workshop?7:6+(index+i)%3*2,family:civic?'campus':workshop?'workshop':(index+i)%2?'brick':'limestone',
      form:civic?'court':workshop?'sawtooth':(index+i)%4===0?'terraced':'gable'});
  }
}
const columns=[-482,-382,-282,-181,-42,42,181,282,382,482];
for(const [row,[z0,z1]]of [[-466,-398],[-366,-298],[-264,-246]].entries())for(let i=0;i<columns.length-1;i++)
  homes([columns[i]+12,z0,columns[i+1]-12,z1],'north',i+row);
for(const side of [-1,1])for(const [row,[z0,z1]]of [[-158,-110],[-80,-58],[-26,26],[58,88]].entries())for(const a of [282,382])
  homes([side<0?-a-88:a+12,z0,side<0?-a-12:a+88,z1],side<0?'west':'east',row);
for(const [row,[z0,z1]]of [[286,306],[338,406],[438,486]].entries())for(let i=0;i<columns.length-1;i++)
  homes([columns[i]+12,z0,columns[i+1]-12,z1],'south',i+row);
export const districtPlan={extent:600,plazaHalf:24,roadCenters:[-42,42],roadWidth:10,sidewalkWidth:3,parcels:[...blocks,...inner,...distant,...outer,...neighborhoodParcels]};

const lots=[];
function add(parent,bounds,height,family,form='stepped',suffix='',inset=2) {
  lots.push({id:parent.id+suffix,parcelId:parent.id,bounds,height,family,form,layer:parent.layer,inset,
    extension:Boolean(parent.extension),district:parent.district,type:family==='workshop'?'workshop':family==='campus'?'campus':family==='brick'?'apartments':'office'});
}
for(const block of blocks) {
  const [x0,z0,x1,z1]=block.bounds,mx=(x0+x1)/2,mz=(z0+z1)/2;
  if(block.id==='01') add(block,block.bounds,24,'campus','court','',6);
  else if(block.id==='05') add(block,block.bounds,8,'workshop','gable','',6);
  else if(block.id==='08') add(block,block.bounds,10,'workshop','sawtooth','',6);
  else if(block.id==='09') add(block,block.bounds,18,'brick','court','',6);
  else if(block.id==='10') add(block,block.bounds,7,'workshop','test-yard','',6);
  else if(block.id==='04'||block.id==='12') {
    add(block,[x0,z0,mx-1,z1],block.id==='04'?76:22,block.id==='04'?'landmark':'limestone','landmark');
    add(block,[mx+1,z0,x1,mz-1],block.id==='04'?38:16,'glass','slab','b');
    add(block,[mx+1,mz+1,x1,z1],block.id==='04'?30:12,'brick','terraced','c');
  } else {
    const north=Number(block.id)<7;
    add(block,[x0,z0,x1,mz-1],block.id==='02'?62:north?34:20,block.id==='02'?'glass':north?'limestone':'brick',block.id==='02'?'slender':'terraced');
    add(block,[x0,mz+1,x1,z1],north?28:14,north?'brick':'limestone','slab','b');
  }
}
for(const parcel of inner) add(parcel,parcel.bounds,Number(parcel.id.slice(1))%3===0?14:9,'limestone','shopfront','',1);
for(const [index,parcel] of distant.entries()) add(parcel,parcel.bounds,parcel.height,index%3===0?'glass':index%3===1?'brick':'limestone',index%3===0?'slender':'terraced','',3);
for(const parcel of outer) add(parcel,parcel.bounds,parcel.height,parcel.family,parcel.form,'',3);
for(const parcel of neighborhoodParcels) add(parcel,parcel.bounds,parcel.height,parcel.family,parcel.form,'',4);
export const cityLots=lots;

/** Deliberate solid envelopes, shared by blockout, architecture and cameras. */
export function buildingVolumes(lot) {
  const [x0,z0,x1,z1]=lot.bounds,cx=(x0+x1)/2,cz=(z0+z1)/2;
  const suburban=lot.layer==='outskirts'&&lot.family!=='workshop'&&lot.family!=='campus';
  const w=Math.min(x1-x0-lot.inset*2,suburban?26:Infinity),d=Math.min(z1-z0-lot.inset*2,suburban?24:Infinity),h=lot.height,base=-.4;
  const parts=[];
  const box=(x,z,width,depth,bottom,top,roof='flat')=>parts.push({x,z,width,depth,bottom,top,roof});
  if(lot.form==='court') {
    const bar=Math.min(w,d)*.28,sign=cz<0?-1:1;
    box(cx-(w-bar)/2,cz,bar,d,base,h);
    box(cx+(w-bar)/2,cz,bar,d,base,h);
    box(cx,cz+sign*(d-bar)/2,w-bar*2,bar,base,h-3);
  } else if(['gable','sawtooth','test-yard'].includes(lot.form)) {
    box(cx,lot.form==='test-yard'?cz+d*.36:cz,w,lot.form==='test-yard'?d*.28:d,base,h,lot.form==='sawtooth'?'sawtooth':'gable');
  } else if(lot.form==='slender') {
    box(cx,cz,w,d,base,7);
    box(cx-w*.08,cz-d*.03,w*.68,d*.7,7,h-3);
    box(cx-w*.08,cz-d*.03,w*.57,d*.6,h-3,h);
  } else if(lot.form==='landmark') {
    box(cx,cz,w,d,base,Math.min(10,h*.3));
    box(cx,cz,w*.84,d*.79,Math.min(10,h*.3),h-9);
    box(cx-w*.035,cz+d*.035,w*.63,d*.61,h-9,h-3);
    box(cx-w*.035,cz+d*.035,w*.42,d*.4,h-3,h);
  } else if(lot.form==='terraced') {
    box(cx,cz,w,d,base,h-4);
    box(cx-w*.04,cz-d*.03,w*.83,d*.8,h-4,h);
  } else {
    box(cx,cz,w,d,base,h);
  }
  return parts;
}
export function buildingEnvelope(lot) {
  const parts=buildingVolumes(lot);
  return {minX:Math.min(...parts.map(p=>p.x-p.width/2))-.35,maxX:Math.max(...parts.map(p=>p.x+p.width/2))+.35,
    minZ:Math.min(...parts.map(p=>p.z-p.depth/2))-.35,maxZ:Math.max(...parts.map(p=>p.z+p.depth/2))+(lot.form==='shopfront'?.6:.35),
    minY:-.4,maxY:Math.max(...parts.map(p=>p.top+(p.roof==='flat'?1.1:2.1)))};
}
export const cityEnvelopes=cityLots.map(lot=>({...buildingEnvelope(lot),lotId:lot.id,layer:lot.layer,family:lot.family,height:lot.height}));
