import * as T from './vendor/three.module.min.js';
import { oceanY } from './city-geography.js';

// Independent landforms, with open channels between them. Peak coordinates are
// local fractions of each landmass, not instances of a shared mountain mesh.
export const mountainRegions = [
  {id:'northwest',name:'Broken granite highlands',x:-2450,z:-1700,rx:1080,rz:650,yaw:-.38,seed:37,rough:30,snow:470,
    peaks:[[-.44,-.18,.30,.35,355,.4],[.12,.02,.45,.22,460,-.5],[.55,.24,.24,.38,240,.7]]},
  {id:'north',name:'Northern serrated ridge',x:600,z:-3500,rx:1250,rz:700,yaw:.18,seed:113,rough:44,snow:390,
    peaks:[[-.57,.07,.27,.20,310,-.3],[-.12,-.18,.24,.42,590,.1],[.28,.05,.31,.19,430,-.7],[.64,.19,.20,.27,235,.2]]},
  {id:'east',name:'Eastern coastal spires',x:2300,z:-1000,rx:600,rz:1100,yaw:.60,seed:229,rough:39,snow:650,
    peaks:[[-.20,-.52,.31,.20,220,.5],[.13,-.05,.20,.29,490,-.2],[-.18,.36,.29,.22,330,.8],[.32,.67,.19,.17,150,-.6]]},
  {id:'southeast',name:'Old forested slopes',x:3400,z:1350,rx:650,rz:450,yaw:-.2,seed:397,rough:12,snow:700,
    peaks:[[-.39,-.12,.52,.42,205,.1],[.30,.18,.38,.51,280,-.4],[.62,-.30,.26,.23,120,.9]]},
  {id:'south',name:'Southern folded escarpment',x:-1200,z:2400,rx:1250,rz:600,yaw:-.6,seed:541,rough:22,snow:700,
    peaks:[[-.57,-.17,.28,.45,295,.8],[-.06,.12,.53,.22,335,.15],[.48,-.22,.34,.31,180,-.7]]},
  {id:'west',name:'Western sea cliffs',x:-3500,z:300,rx:550,rz:1200,yaw:.25,seed:683,rough:28,snow:650,
    peaks:[[-.14,-.53,.38,.27,255,-.1],[-.32,.05,.29,.39,405,.6],[.16,.47,.39,.33,235,-.4]]},
];

const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));
const smooth = (a,b,x) => {const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const hash = (x,z,seed=0) => {const n=Math.sin(x*127.1+z*311.7+seed*17.31)*43758.5453;return n-Math.floor(n);};
function noise(x,z,seed) {
  const a=Math.floor(x),b=Math.floor(z),u=smooth(0,1,x-a),v=smooth(0,1,z-b);
  return T.MathUtils.lerp(T.MathUtils.lerp(hash(a,b,seed),hash(a+1,b,seed),u),T.MathUtils.lerp(hash(a,b+1,seed),hash(a+1,b+1,seed),u),v);
}
function boundary(region,angle) {
  const u=Math.cos(angle),v=Math.sin(angle);
  const bay=(direction,width)=>Math.exp(-((Math.atan2(Math.sin(angle-direction),Math.cos(angle-direction))/width)**2));
  const cut=region.id==='east'?.23*bay(1.4,.28)+.18*bay(-1.3,.22)
    :region.id==='northwest'?.19*bay(.4,.45)+.16*bay(2.2,.3)
    :region.id==='south'?.26*bay(1.1,.35)+.13*bay(-2.1,.25)
    :region.id==='southeast'?.17*bay(-.7,.5):region.id==='west'?.12*bay(2.7,.28):.16*bay(3.1,.25);
  return .90+.18*noise(u*2.3+4,v*2.3-6,region.seed)+.07*Math.sin(angle*3+region.seed)-cut;
}
function local(region,x,z) {
  const dx=x-region.x,dz=z-region.z,c=Math.cos(region.yaw),s=Math.sin(region.yaw);
  return [(dx*c+dz*s)/region.rx,(-dx*s+dz*c)/region.rz];
}
function world(region,u,v,y) {
  const c=Math.cos(region.yaw),s=Math.sin(region.yaw),x=u*region.rx,z=v*region.rz;
  return [region.x+x*c-z*s,y,region.z+x*s+z*c];
}
function elevation(region,u,v) {
  const radius=Math.hypot(u,v),edge=1-radius/boundary(region,Math.atan2(v,u));
  if(edge<=0)return oceanY;
  let high=0,shoulder=0;
  for(const [x,z,wx,wz,height,turn]of region.peaks) {
    const c=Math.cos(turn),s=Math.sin(turn),dx=u-x,dz=v-z;
    const a=(dx*c+dz*s)/wx,b=(-dx*s+dz*c)/wz;
    const peak=height*Math.exp(-(a*a+b*b)*1.45);
    high=Math.max(high,peak);shoulder+=peak*.17;
  }
  const folds=(noise(u*8+13,v*8-9,region.seed)-.5)*region.rough;
  const gully=Math.pow(1-Math.abs(noise(u*4-5,v*5+11,region.seed+4)*2-1),5)*region.rough*.65;
  const ridge=region.id==='south'?28*smooth(-.55,.1,u)*(1-smooth(.23,.62,v)):0;
  return oceanY+smooth(0,.14,edge)*Math.max(2,8+high+shoulder+folds-gully+ridge);
}

let cached;
const segments=64,rings=12;
const colorCache=new Map();
const rgb = value => {if(!colorCache.has(value))colorCache.set(value,new T.Color(value));return colorCache.get(value);};
const sun=new T.Vector3(-.45,.82,-.34).normalize(),normal=new T.Vector3(),aVec=new T.Vector3(),bVec=new T.Vector3();
function paint(height,slope,region,x,z) {
  const mottling=noise(x*.006,z*.006,region.seed);
  const green=rgb('#587459').clone().lerp(rgb('#808462'),mottling);
  if(height<9)green.lerp(rgb(region.id==='west'?'#8b897b':'#b0a98b'),1-smooth(0,9,height));
  const cover=smooth(.35,.67,noise(x*.009,z*.009,region.seed+5))*(1-smooth(170,310,height))*(1-smooth(.25,.45,slope))*smooth(4,16,height);
  green.lerp(rgb(region.id==='south'||region.id==='southeast'?'#486547':'#355947'),cover*.82);
  const rock=smooth(.20,.67,slope)*.9+smooth(180,420,height)*.22;
  green.lerp(rgb(region.id==='south'?'#8b8576':'#7b8382'),clamp(rock));
  green.lerp(rgb('#d4d8d2'),smooth(region.snow,region.snow+90,height)*.88);
  return green;
}
function triangle(out,a,b,c,tint) {
  normal.crossVectors(aVec.fromArray(b).sub(bVec.fromArray(a)),bVec.fromArray(c).sub(new T.Vector3(...a))).normalize();
  const shade=.73+Math.max(0,normal.dot(sun))*.34;
  for(const [i,p]of [a,b,c].entries()){out.positions.push(...p);out.colors.push(...(Array.isArray(tint)?tint[i]:tint).clone().multiplyScalar(shade).toArray());}
}
function terrainTriangle(out,region,a,b,c,triangles) {
  const dx=b[0]-a[0],dz=b[2]-a[2],ex=c[0]-a[0],ez=c[2]-a[2];
  const ny=dz*ex-dx*ez;
  const nx=(b[1]-a[1])*ez-dz*(c[1]-a[1]),nz=dx*(c[1]-a[1])-(b[1]-a[1])*ex;
  const length=Math.hypot(nx,ny,nz),slope=1-ny/length;
  triangle(out,a,b,c,[a,b,c].map(p=>paint(p[1],slope,region,p[0],p[2])));
  triangles.push({a,b,c,area:Math.abs(ny)/2,slope});
}
function sampleTriangle(triangle,x,z) {
  const {a,b,c}=triangle,den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
  const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den;
  const v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den;
  return u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7 ? a[1]*u+b[1]*v+c[1]*(1-u-v) : null;
}
export function mountainTerrainHeight(x,z) {
  const data=createMountainLandscape();
  for(const region of data.regions) {
    const [u,v]=local(region,x,z);
    if(Math.hypot(u,v)>1.2)continue;
    for(const triangle of region.triangles) {
      const value=sampleTriangle(triangle,x,z);if(value!==null)return value;
    }
  }
  return oceanY;
}

export function createMountainLandscape() {
  if(cached)return cached;
  const out={positions:[],colors:[],regions:[],trees:[],features:[],terrainVertexCount:0};
  for(const region of mountainRegions) {
    const triangles=[],start=out.positions.length/3;
    const point=(i,j)=>{const angle=(i%segments)*Math.PI*2/segments,r=j/rings*boundary(region,angle);const u=Math.cos(angle)*r,v=Math.sin(angle)*r;return world(region,u,v,j===rings?oceanY:elevation(region,u,v));};
    const center=world(region,0,0,elevation(region,0,0));
    for(let i=0;i<segments;i++) {
      terrainTriangle(out,region,center,point(i+1,1),point(i,1),triangles);
      for(let j=1;j<rings;j++) {
        const a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);
        terrainTriangle(out,region,a,b,c,triangles);terrainTriangle(out,region,a,c,d,triangles);
      }
    }
    out.regions.push({...region,triangles,vertexStart:start,vertexCount:out.positions.length/3-start});
  }
  out.terrainVertexCount=out.positions.length/3;
  for(const region of out.regions) {
    let area=0;const areas=region.triangles.map(triangle=>(area+=triangle.area));
    const treeTarget={northwest:135,north:80,east:120,southeast:245,south:225,west:155}[region.id];
    for(let i=0,accepted=0;i<treeTarget*12&&accepted<treeTarget;i++) {
      const pick=hash(i,3,region.seed)*area;let lo=0,hi=areas.length-1;
      while(lo<hi){const m=(lo+hi)>>1;if(areas[m]<pick)lo=m+1;else hi=m;}
      const tri=region.triangles[lo],r=Math.sqrt(hash(i,7,region.seed)),s=hash(i,11,region.seed),u=1-r,v=r*(1-s),w=r*s;
      const x=tri.a[0]*u+tri.b[0]*v+tri.c[0]*w,z=tri.a[2]*u+tri.b[2]*v+tri.c[2]*w,base=tri.a[1]*u+tri.b[1]*v+tri.c[1]*w;
      const density=noise(x*.009,z*.009,region.seed+5);
      if(base<6||base>Math.min(region.snow-45,340)||tri.slope>.42||density<(.30+hash(i,17,region.seed)*.27))continue;
      const [lx,lz]=local(region,x,z);
      if(Math.hypot(lx,lz)>.9||out.trees.some(tree=>tree.region===region.id&&Math.hypot(tree.x-x,tree.z-z)<13))continue;
      const h=11+hash(i,21,region.seed)*21,wide=3.2+hash(i,29,region.seed)*5,angle=hash(i,31,region.seed)*Math.PI*2;
      const type=(region.id==='south'||region.id==='southeast')&&hash(i,37,region.seed)>.33?'broadleaf':'conifer';
      const vertexStart=out.positions.length/3;
      const tint=rgb(type==='conifer'?'#345746':'#4e7150').clone().lerp(rgb('#71815a'),hash(i,39,region.seed)*.45);
      const sides=type==='conifer'?5:6,ring=[];
      for(let k=0;k<sides;k++){const a=angle+k*Math.PI*2/sides,rad=wide*(.75+hash(k+i,43,region.seed)*.5);ring.push([x+Math.cos(a)*rad,base+h*(type==='conifer'?.14:.48),z+Math.sin(a)*rad]);}
      const tip=[x+(hash(i,47,region.seed)-.5)*wide,base+h,z+(hash(i,51,region.seed)-.5)*wide];
      for(let k=0;k<sides;k++)triangle(out,ring[(k+1)%sides],ring[k],tip,tint);
      if(type==='broadleaf')for(let k=0;k<sides;k++)triangle(out,ring[k],ring[(k+1)%sides],[x,base+h*.27,z],tint.clone().multiplyScalar(.82));
      for(let k=0;k<4;k++){
        const a=angle+k*Math.PI/2,b=angle+(k+1)*Math.PI/2,r=.23+wide*.035;
        triangle(out,[x+Math.cos(b)*r,base,z+Math.sin(b)*r],[x+Math.cos(a)*r,base,z+Math.sin(a)*r],[x,base+h*.62,z],rgb('#655f4c'));
      }
      out.trees.push({x,z,base,height:h,type,region:region.id,width:wide,lean:tip[0]-x,vertexStart,vertexCount:out.positions.length/3-vertexStart});accepted++;
    }
    out.features.push({kind:'mountain-region',id:region.id,name:region.name,treeCount:out.trees.filter(tree=>tree.region===region.id).length});
  }
  out.vegetationVertexStart=out.terrainVertexCount;out.vegetationVertexCount=out.positions.length/3-out.terrainVertexCount;
  cached=out;return out;
}
