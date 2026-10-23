import * as T from './vendor/three.module.min.js';
import { parkPlan } from './city-layout.js';
import { applyDistrictDepth } from './district-style.js';
import { applyGroundTexture } from './ground-materials.js';

/** Finished public spaces and a planted edge, all static in three shared batches. */
export function createCityLandscape() {
  const root=new T.Group();root.name='city-landscape';
  const layers=Object.fromEntries(['paving','green','fixtures'].map(name=>[name,{positions:[],colors:[],glow:[]}]));
  const features=[],cube=new T.BoxGeometry(1,1,1).toNonIndexed(),crown=new T.SphereGeometry(1,7,4).toNonIndexed();
  const cylinder=new T.CylinderGeometry(1,1,1,20).toNonIndexed();
  let active=null;
  const add=(layer,p,color,glow=0)=>{layers[layer].positions.push(...p);layers[layer].colors.push(...new T.Color(color).toArray());layers[layer].glow.push(glow);active?.bounds.expandByPoint(new T.Vector3(...p));};
  const feature=(kind,build,data={})=>{const previous=active;active={kind,...data,bounds:new T.Box3()};features.push(active);build();active=previous;};
  const rect=(layer,x0,z0,x1,z1,y,color)=>{for(const p of [[x0,y,z0],[x0,y,z1],[x1,y,z1],[x0,y,z0],[x1,y,z1],[x1,y,z0]])add(layer,p,color);};
  function solid(layer,geometry,x,y,z,w,h,d,color,glow=0) {
    const p=geometry.attributes.position,n=geometry.attributes.normal,base=new T.Color(color);
    const top=base.clone().multiplyScalar(1.06).getHexString(),side=base.clone().multiplyScalar(.84).getHexString();
    for(let i=0;i<p.count;i++)add(layer,[x+p.getX(i)*w,y+p.getY(i)*h,z+p.getZ(i)*d],`#${n.getY(i)>.35?top:side}`,glow);
  }
  const box=(layer,x,y,z,w,h,d,color,glow=0)=>solid(layer,cube,x,y,z,w,h,d,color,glow);
  const tree=(x,z,r=2.8)=>{
    box('fixtures',x,1.0,z,.3,3.0,.3,'#685d4b');
    solid('green',crown,x,3.5,z,r,2.5,r,'#577154');
    rect('green',x-2,z-2,x+2,z+2,-.44,'#687457');
  };
  const bench=(x,z)=>{
    box('fixtures',x,.35,z,3,.18,.9,'#a28b6b');
    box('fixtures',x,.77,z+.36,3,.72,.13,'#9b8565');
    for(const dx of [-1.1,1.1])box('fixtures',x+dx,.02,z,.16,.65,.65,'#586974');
  };
  const lamp=(x,z)=>{
    box('fixtures',x,1.9,z,.12,4.7,.12,'#698092');
    box('fixtures',x,4.32,z,.8,.18,.6,'#c9bf9e',1);
  };
  for(const park of parkPlan)feature('city-park',()=>{
    const [x0,z0,x1,z1]=park.bounds,x=(x0+x1)/2,z=(z0+z1)/2;
    rect('paving',x0,z0,x1,z1,-.50,'#95998d');
    rect('green',x0+3,z0+3,x1-3,z1-3,-.47,'#779067');
    rect('paving',x-1.6,z0,x+1.6,z1,-.45,'#b2b0a0');
    rect('paving',x0,z-1.6,x1,z+1.6,-.45,'#b2b0a0');
    for(const px of [x0+7,x1-7])for(const pz of [z0+7,z1-7])tree(px,pz);
    for(const side of [-1,1]){bench(x+side*8,z+5);lamp(x+side*3.8,z-6);}
    if(park.form==='fountain') {
      solid('fixtures',cylinder,x,-.25,z,6.5,.5,6.5,'#b3b2a1');
      solid('fixtures',cylinder,x,.02,z,5.6,.06,5.6,'#3e7b91');
      solid('fixtures',cylinder,x,.6,z,.65,1.2,.65,'#a8b3af');
      solid('fixtures',cylinder,x,1.3,z,1.5,.13,1.5,'#5b93a2');
    } else if(park.form==='garden') {
      for(const dx of [-12,12])for(const dz of [-9,9]) {
        box('paving',x+dx,-.18,z+dz,7,.55,4,'#9c9c87');
        box('green',x+dx,.12,z+dz,6.4,.12,3.4,'#5c7954');
        for(const flower of [-2,0,2])box('fixtures',x+dx+flower,.35,z+dz,.55,.4,.55,'#bc9c82');
      }
    } else {
      for(const dx of [-5,5])for(const dz of [-4,4])box('fixtures',x+dx,1.1,z+15+dz,.22,3.0,.22,'#9d8b6b');
      for(const dz of [-4,-2,0,2,4])box('fixtures',x,2.65,z+15+dz,11,.18,.25,'#a4906f');
    }
  },{id:park.id});
  // The city fades into a planted edge instead of an unfinished gray tabletop.
  for(const side of [-1,1])for(const [i,z]of [-255,-204,-154,-104,-54,0,54,84,254].entries())feature('edge-planting',()=>{
    tree(side*(285+(i%2)*14),z,3.0);
    tree(side*(309+(i%2)*10),z+10,2.5);
  });
  cube.dispose();crown.dispose();cylinder.dispose();
  for(const [name,layer]of Object.entries(layers)){
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(layer.positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(layer.colors,3));
    geometry.setAttribute('cityGlow',new T.Float32BufferAttribute(layer.glow,1));
    const material=applyDistrictDepth(new T.MeshBasicMaterial({vertexColors:true}),.6);
    if(name==='fixtures')material.userData.cityGlowMode='vertex';
    else applyGroundTexture(material,name==='green'?'terrain':'stone');
    const mesh=new T.Mesh(geometry,material);mesh.name=`landscape-${name}`;root.add(mesh);
  }
  return {root,features};
}
