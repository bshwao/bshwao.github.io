// Software projection of actual production geometry; not a WebGL/browser screenshot.
import * as T from '../../assets/vendor/three.module.min.js';
import {createTowerModel} from '../../assets/tower-model.js';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
// Resolve Sharp from the caller's NODE_PATH or local installation.
const require=createRequire(import.meta.url);
const sharp=require('sharp'),model=createTowerModel(),module=model.modules.find(m=>m.id==='penthouse');
module.interior.group.visible=true;
model.root.updateMatrixWorld(true);
const width=1400,height=1000,light=new T.Vector3(-.4,1,.6).normalize();
async function render(name,roomIndex=null){
  for(const [i,room]of module.interior.rooms.entries())room.group.visible=roomIndex===null||i===roomIndex;
  const subject=roomIndex===null?module.interior.group:module.interior.rooms[roomIndex].group;
  const bounds=new T.Box3().setFromObject(subject),center=bounds.getCenter(new T.Vector3());
  const camera=new T.OrthographicCamera(-1,1,1,-1,.1,500);
  camera.position.copy(center).add(new T.Vector3(32,42,55));camera.lookAt(center);camera.updateMatrixWorld();
  const corners=[];
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  const half=Math.max(...corners.map(p=>Math.abs(p.y)),...corners.map(p=>Math.abs(p.x)*height/width))*1.1;
  camera.left=-half*width/height;camera.right=-camera.left;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
  const shapes=[],normalMatrix=new T.Matrix3();
  const roots=roomIndex===null?[module.interior.group]:[subject];
  for(const root of roots)root.traverseVisible(node=>{
    if(!node.isMesh)return;
    const p=node.geometry.attributes.position,idx=node.geometry.index,material=Array.isArray(node.material)?node.material[0]:node.material;
    if(!material?.color)return;
    const count=idx?idx.count:p.count;
    normalMatrix.getNormalMatrix(node.matrixWorld);
    for(let i=0;i<count;i+=3){
      const vertices=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,idx?idx.getX(i+j):i+j).applyMatrix4(node.matrixWorld));
      const n=new T.Triangle(...vertices).getNormal(new T.Vector3()),toward=camera.position.clone().sub(vertices[0]);
      if(n.dot(toward)<0&&material.side!==T.DoubleSide)continue;
      const shade=.61+.39*Math.max(0,n.dot(light));
      const color=material.color.clone().multiplyScalar(shade).getHexString();
      const depth=vertices.reduce((s,v)=>s+v.clone().applyMatrix4(camera.matrixWorldInverse).z,0)/3;
      const screen=vertices.map(v=>v.project(camera)).map(v=>({x:(v.x+1)*width/2,y:(1-v.y)*height/2,z:v.z}));
      const points=screen.map(v=>`${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ');
      shapes.push({depth,screen,color,svg:`<polygon points="${points}" fill="#${color}" stroke="#${color}" stroke-width=".45"/>`});
    }
  });
  shapes.sort((a,b)=>a.depth-b.depth);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f4f1e8"/>${shapes.map(s=>s.svg).join('')}</svg>`;
  await writeFile(new URL(`${name}.svg`,import.meta.url),svg);
  const pixels=Buffer.alloc(width*height*3),depths=new Float32Array(width*height).fill(Infinity);
  for(let i=0;i<width*height;i++){pixels[i*3]=244;pixels[i*3+1]=241;pixels[i*3+2]=232;}
  for(const {screen:[a,b,c],color}of shapes){
    const d=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(d)<1e-9)continue;
    const minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),maxX=Math.min(width-1,Math.ceil(Math.max(a.x,b.x,c.x)));
    const minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),maxY=Math.min(height-1,Math.ceil(Math.max(a.y,b.y,c.y)));
    const rgb=[0,2,4].map(i=>parseInt(color.slice(i,i+2),16));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      const u=((b.y-c.y)*(x+.5-c.x)+(c.x-b.x)*(y+.5-c.y))/d;
      const v=((c.y-a.y)*(x+.5-c.x)+(a.x-c.x)*(y+.5-c.y))/d,w=1-u-v;
      if(u<0||v<0||w<0)continue;
      const z=u*a.z+v*b.z+w*c.z,k=y*width+x;if(z>=depths[k])continue;
      depths[k]=z;for(let channel=0;channel<3;channel++)pixels[k*3+channel]=rgb[channel];
    }
  }
  await sharp(pixels,{raw:{width,height,channels:3}}).resize(1120,800).png().toFile(new URL(`${name}.png`,import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
}
await render('penthouse-geometry');
for(let i=0;i<4;i++)await render(`room-${i+1}-geometry`,i);
console.log('Rendered actual floor and four room geometries for offline visual review.');
