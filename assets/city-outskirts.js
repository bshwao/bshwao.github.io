import * as T from './vendor/three.module.min.js';
import { outskirtsRoads, neighborhoodParcels, cityLots, buildingVolumes, riverEdges } from './city-layout.js';
import { applyDistrictDepth } from './district-style.js';
import { applyGroundTexture } from './ground-materials.js';
import { cityPalette } from './city-palette.js';

const overlap=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
const expand=(b,d)=>[b[0]-d,b[1]-d,b[2]+d,b[3]+d];
// Subtract crossings before uploading: asphalt and pavement never occupy the
// same face, and the street texture remains stable at every junction.
function subtract(rect,cuts) {
  let pieces=[rect];
  for(const cut of cuts)pieces=pieces.flatMap(([x0,z0,x1,z1])=>{
    const a=Math.max(x0,cut[0]),b=Math.max(z0,cut[1]),c=Math.min(x1,cut[2]),d=Math.min(z1,cut[3]);
    return a>=c||b>=d?[[x0,z0,x1,z1]]:[[x0,z0,a,z1],[c,z0,x1,z1],[a,z0,c,b],[a,d,c,z1]].filter(p=>p[2]-p[0]>.001&&p[3]-p[1]>.001);
  });
  return pieces;
}

/** Connected outer neighborhoods and a wooded horizon, in four static batches. */
export function createCityOutskirts() {
  const root=new T.Group();root.name='city-outskirts';
  const layers=Object.fromEntries(['paving','green','fixtures','marks'].map(name=>[name,{positions:[],colors:[],glow:[],surface:[]}]));
  const features=[],cube=new T.BoxGeometry(1,1,1).toNonIndexed(),crown=new T.SphereGeometry(1,6,3).toNonIndexed();
  const hill=new T.SphereGeometry(1,12,5,0,Math.PI*2,0,Math.PI/2).toNonIndexed();
  const evergreen=new T.ConeGeometry(1,1,5).toNonIndexed();
  const occupied=cityLots.flatMap(lot=>buildingVolumes(lot).map(p=>[p.x-p.width/2,p.z-p.depth/2,p.x+p.width/2,p.z+p.depth/2]));
  const roads=outskirtsRoads.map(r=>r.bounds),walks=outskirtsRoads.map(r=>expand(r.bounds,r.walk));
  let active=null;
  const colors=new Map(),color=tint=>{if(!colors.has(tint))colors.set(tint,new T.Color(tint).toArray());return colors.get(tint);};
  function vertex(layer,p,tint,glow=0,surface=0){
    const out=layers[layer];out.positions.push(...p);out.colors.push(...color(tint));out.glow.push(glow);out.surface.push(surface);
    active?.bounds.expandByPoint(new T.Vector3(...p));
  }
  function feature(kind,build,data={}){const old=active;active={kind,...data,bounds:new T.Box3()};features.push(active);build();active=old;}
  function rect(layer,b,y,tint,surface=0){const[x0,z0,x1,z1]=b;for(const p of [[x0,y,z0],[x0,y,z1],[x1,y,z1],[x0,y,z0],[x1,y,z1],[x1,y,z0]])vertex(layer,p,tint,0,surface);}
  function solid(layer,geometry,x,y,z,w,h,d,tint,glow=0){
    const p=geometry.attributes.position,n=geometry.attributes.normal,base=new T.Color(tint),top=base.clone().multiplyScalar(1.07).getHexString(),side=base.clone().multiplyScalar(.83).getHexString();
    for(let i=0;i<p.count;i++)vertex(layer,[x+p.getX(i)*w,y+p.getY(i)*h,z+p.getZ(i)*d],`#${n.getY(i)>.35?top:side}`,glow);
  }
  const box=(layer,x,y,z,w,h,d,tint,glow=0)=>solid(layer,cube,x,y,z,w,h,d,tint,glow);
  const dry=b=>{for(let x=b[0];x<=b[2];x+=3){const water=riverEdges(x);if(b[3]>water.north-1&&b[1]<water.south+1)return false;}return true;};
  const clear=(x,z,r=3)=>{const b=[x-r,z-r,x+r,z+r];return dry(b)&&!occupied.some(a=>overlap(b,a))&&!walks.some(a=>overlap(b,a));};
  const tree=(x,z,r=2.4)=>{
    box('fixtures',x,1,z,.28,2.8,.28,'#6e6851');
    solid('green',crown,x,3.25,z,r,2.5,r,'#58775a');
  };
  const lamp=(x,z)=>{box('fixtures',x,2,z,.12,4.8,.12,'#72858a');box('fixtures',x,4.45,z,.8,.18,.65,'#d9c79d',1);};

  const drawnRoads=[],drawnWalks=[];
  for(const road of outskirtsRoads)feature('street',()=>{
    for(const b of subtract(road.bounds,drawnRoads))rect('paving',b,-.50,cityPalette.road,1);
    drawnRoads.push(road.bounds);
    for(const b of subtract(expand(road.bounds,road.walk),[...roads,...drawnWalks]))rect('paving',b,-.39,'#a2a79b');
    drawnWalks.push(expand(road.bounds,road.walk));
  },{id:road.id,plan:road});
  for(const road of outskirtsRoads) {
    const crossings=outskirtsRoads.filter(other=>other.axis!==road.axis&&overlap(expand(road.bounds,.1),other.bounds));
    const project=(across,along)=>road.axis==='x'?[along,road.center+across]:[road.center+across,along];
    for(let at=road.start+10;at<road.end-8;at+=12) {
      const[x,z]=project(0,at);
      if(crossings.some(r=>overlap([x-5,z-5,x+5,z+5],r.bounds)))continue;
      const[a,b]=project(-.1,at),[c,d]=project(.1,at+3.5);
      rect('marks',[a,b,c,d],-.485,'#c9c1a6');
    }
    // A pair of pedestrian crossings belongs to each neighborhood junction.
    if(road.axis==='x')for(const cross of crossings)for(const sign of [-1,1])for(let stripe=-3;stripe<=3;stripe+=1.5){
      const x=cross.center+sign*(cross.width/2+2.5);
      rect('marks',[x-.35,road.center+stripe-.45,x+.35,road.center+stripe+.45],-.485,'#ded6bd');
    }
  }
  for(const road of outskirtsRoads.filter(r=>r.id.startsWith('north-spine-')))feature('river-approach',()=>{
    const x=road.center,z=road.end;
    rect('paving',[x-1.5,z,x+1.5,riverEdges(x).north-3.5],-.38,'#aab0a2');
    for(const dx of [-2.2,2.2])box('fixtures',x+dx,.10,z+.8,.28,1,.28,'#87948c');
  },{id:road.id});
  for(const [i,parcel]of neighborhoodParcels.entries())feature('home-garden',()=>{
    const b=parcel.bounds,[x0,z0,x1,z1]=b,x=(x0+x1)/2,z=(z0+z1)/2;
    rect('green',b,-.405,i%3?'#788b64':'#8b9671');
    const part=buildingVolumes(cityLots.find(lot=>lot.id===parcel.id))[0];
    // Front paths meet the nearest actual sidewalk, across the entire setback.
    const street=outskirtsRoads.filter(r=>r.axis==='x'&&x>r.start&&x<r.end).sort((a,b)=>Math.abs(a.center-z)-Math.abs(b.center-z))[0];
    const sign=street.center>z?1:-1,front=part.z+sign*part.depth/2,end=street.center-sign*(street.width/2+street.walk);
    rect('paving',[x-.8,Math.min(front,end),x+.8,Math.max(front,end)],-.395,'#b1b09c');
    active.streetId=street.id;active.path={x,start:front,end};
    if(clear(x0+3,z0+4,2.5))tree(x0+3,z0+4,2.0);
    if(i%4===0&&clear(x1-3,z1-4,2.5))tree(x1-3,z1-4,2.2);
    if(i%6===0)box('fixtures',x1-2,.15,z0+2,1.0,1.2,.7,'#7b887d');
  },{id:parcel.id,district:parcel.district});

  // Tree-lined avenues, with a small number of night-lit neighborhood stops.
  for(const side of [-1,1])for(const z of [-450,-350,-250,-130,-60,20,290,370,460]) {
    const x=side*493;
    if(clear(x,z))feature('avenue-tree',()=>solid('green',evergreen,x,2.5,z,2.8,5.8,2.8,'#58775a'));
  }
  for(const z of [-382,-282,322,422])for(const x of [-166,-54,54,166]) {
    if(clear(x,z+9,1))feature('neighborhood-lamp',()=>lamp(x,z+9));
  }
  for(const [x,z]of [[-260,-268],[260,-268],[-260,308],[260,308]])if(clear(x,z,6))feature('transit-stop',()=>{
    rect('paving',[x-5,z-2,x+5,z+2],-.38,'#b0afa0');
    for(const dx of [-4,4])box('fixtures',x+dx,1.3,z+1.5,.16,3.4,.16,'#7c8c8c');
    box('fixtures',x,3.05,z,9,.2,4,'#9baaa4');
    box('fixtures',x,.25,z+.5,5,.2,.9,'#ac9570');
    for(const dx of [-1.8,1.8])box('fixtures',x+dx,-.115,z+.5,.15,.53,.65,'#778782');
    box('fixtures',x+5,1.6,z,.15,4,.15,'#78898c');
    box('fixtures',x+5,3.2,z,.85,.8,.2,'#b8c9b9');
  });
  // Public recreation occupies space between the bridges, below the river park.
  feature('neighborhood-court',()=>{
    rect('paving',[-27,342,27,400],-.4,'#a2aa98');
    rect('green',[-21,348,21,394],-.38,'#6e8a79');
    for(const z of [348,371,394])rect('marks',[-21,z-.12,21,z+.12],-.365,'#d2cdb4');
    for(const x of [-21,0,21])rect('marks',[x-.12,348,x+.12,394],-.365,'#d2cdb4');
    for(const z of [352,390]){box('fixtures',0,1.25,z,.18,3.3,.18,'#8a9390');box('fixtures',0,2.8,z,2,1.2,.2,'#bdbca8');}
    for(const x of [-25,25])for(const z of [348,394])tree(x,z,2.2);
  });
  // A small service yard makes the western workshop block read as working land.
  feature('service-yard',()=>{
    rect('paving',[-274,228,-244,252],-.4,'#989e94');
    for(const z of [232,238,244,250])rect('marks',[-272,z,-260,z+.18],-.385,'#d0c8ae');
    for(const z of [233,245]){
      box('fixtures',-267,.4,z,5,1.5,2.2,'#8d9da0');
      box('fixtures',-267,1.3,z,2.8,.8,2.0,'#afbbb3');
      for(const dx of [-1.6,1.6])for(const dz of [-1.1,1.1])box('fixtures',-267+dx,-.125,z+dz,.7,.55,.3,'#45565b');
    }
    for(const x of [-251,-247])box('fixtures',x,.7,232,2.5,2.2,3.5,'#a58b6b');
  });

  // Irregular groves close the outer edge, then low ridges meet the haze.
  // Simple evergreen silhouettes make denser woods cheaper than park trees.
  function grove(x,z){
    const rx=35+Math.sin(x*.025+z*.05)*8,rz=27+Math.cos(x*.04-z*.02)*6,b=[x-rx,z-rz,x+rx,z+rz];
    if(!dry(b)||occupied.some(a=>overlap(b,a))||walks.some(a=>overlap(b,a)))return;
    feature('woodland',()=>{
      const points=Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,r=.92+.08*Math.sin(i*.6+x*.07);return[x+Math.cos(a)*rx*r,-.79,z+Math.sin(a)*rz*r];});
      for(let i=0;i<points.length;i++)for(const p of [[x,-.79,z],points[(i+1)%points.length],points[i]])vertex('green',p,'#58734f');
      const noise=i=>{const n=Math.sin(i*12.9898+x*.1+z*.3)*4375;return n-Math.floor(n);};
      for(let i=0;i<7;i++){
        const angle=noise(i)*Math.PI*2,r=Math.sqrt(noise(i+20))*.72,h=6.4+noise(i+40)*3;
        solid('green',evergreen,x+Math.cos(angle)*r*rx,-.79+h/2,z+Math.sin(angle)*r*rz,4.8+(i%2),h,4.8+(i%2),i%2?'#46684e':'#5c7953');
      }
    });
  }
  for(const side of [-1,1])for(let i=0;i<26;i++) {
    const x=side*(560+(i%3)*30),z=-520+i*44;
    grove(x,z);
  }
  for(const side of [-1,1])for(let i=0;i<16;i++){
    const x=-540+i*72,z=side<0?-535-(i%3)*20:542+(i%3)*20;
    grove(x,z);
  }
  for(const side of [-1,1])for(let i=0;i<7;i++)feature('outer-ridge',()=>{
    solid('green',hill,-900+i*300,-.83,side*(850+(i%2)*90),240,18+(i%3)*9,170,'#697f68');
  });
  cube.dispose();crown.dispose();hill.dispose();evergreen.dispose();
  for(const [name,out]of Object.entries(layers)){
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(out.positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(out.colors,3));
    geometry.setAttribute('cityGlow',new T.Float32BufferAttribute(out.glow,1));geometry.setAttribute('surfaceKind',new T.Float32BufferAttribute(out.surface,1));geometry.computeBoundingSphere();
    const material=applyDistrictDepth(new T.MeshBasicMaterial({vertexColors:true}),name==='green'?.88:.65);
    if(name==='fixtures')material.userData.cityGlowMode='vertex';
    else if(name==='paving')applyGroundTexture(material,'mixed');
    else if(name==='green')applyGroundTexture(material,'terrain');
    const mesh=new T.Mesh(geometry,material);mesh.name=`outskirts-${name}`;root.add(mesh);
  }
  return {root,features,roads:outskirtsRoads};
}
