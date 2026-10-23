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
export const riverPlan={minX:-600,maxX:600,halfWidth:20,promenadeWidth:7,waterY:-.58,bridges:[-42,42]};
export const riverCenter=x=>168+16*Math.sin((x+80)/90)-x*.08;
export const riverEdges=x=>({north:riverCenter(x)-riverPlan.halfWidth,south:riverCenter(x)+riverPlan.halfWidth});
export const parkPlan=[
  {id:'west-garden',bounds:[-166,-24,-112,24],form:'garden'},
  {id:'east-square',bounds:[112,-24,166,24],form:'fountain'},
  {id:'south-park',bounds:[-30,234,30,292],form:'lawn'},
];
export const districtPlan={extent:360,plazaHalf:24,roadCenters:[-42,42],roadWidth:10,sidewalkWidth:3,parcels:[...blocks,...inner,...distant,...outer]};

const lots=[];
function add(parent,bounds,height,family,form='stepped',suffix='',inset=2) {
  lots.push({id:parent.id+suffix,parcelId:parent.id,bounds,height,family,form,layer:parent.layer,inset,
    extension:Boolean(parent.extension),type:family==='workshop'?'workshop':family==='campus'?'campus':family==='brick'?'apartments':'office'});
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
export const cityLots=lots;

/** Deliberate solid envelopes, shared by blockout, architecture and cameras. */
export function buildingVolumes(lot) {
  const [x0,z0,x1,z1]=lot.bounds,cx=(x0+x1)/2,cz=(z0+z1)/2;
  const w=x1-x0-lot.inset*2,d=z1-z0-lot.inset*2,h=lot.height,base=-.4;
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
