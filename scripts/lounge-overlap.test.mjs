import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/vendor/three.module.min.js';
import { sections } from '../assets/tower-geometry.js';
import { floorContent } from '../assets/floor-content.js';
import { createInterior } from '../assets/interiors.js';

const interiors=new Map(['about','contact','penthouse'].map(id=>[
  id,createInterior(sections.find(section=>section.id===id),floorContent[id]),
]));
const bounds=part=>new T.Box3().setFromArray(part.rest);
const mesh=(part,transform=new T.Matrix4())=>{
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(part.rest,3));
  geometry.applyMatrix4(transform);
  const result=new T.Mesh(geometry,new T.MeshBasicMaterial());
  result.updateMatrixWorld(true);
  return result;
};

test('visitor cushions remain supported at every corner of the rendered beveled seat',()=>{
  let seats=0;
  for(const id of ['about','contact'])for(const object of interiors.get(id).interactions.objects.filter(object=>object.name==='Visitor seat')){
    const solids=object.parts.filter(part=>part.normals);
    const base=solids.find(part=>{
      const box=bounds(part);
      return Math.abs(box.min.y-.71)<1e-5&&Math.abs(box.max.y-.85)<1e-5;
    });
    const cushion=solids.find(part=>{
      const box=bounds(part);
      return box.min.y>.8&&box.max.y<1&&box.max.y-box.min.y<.1;
    });
    assert.ok(base&&cushion,`${id}/${object.roomIndex}: the seat and cushion remain separate rendered panels`);
    const underside=bounds(cushion).min.y,corners=new Map();
    for(let i=0;i<cushion.rest.length;i+=3)if(Math.abs(cushion.rest[i+1]-underside)<1e-5){
      const x=cushion.rest[i],z=cushion.rest[i+2];
      corners.set(`${Math.round(x*1e5)},${Math.round(z*1e5)}`,[x,z]);
    }
    assert.equal(corners.size,4);
    const seat=mesh(base);
    for(const [x,z]of corners.values()){
      const support=new T.Raycaster(new T.Vector3(x,2,z),new T.Vector3(0,-1,0)).intersectObject(seat)[0];
      assert.ok(support,`${id}/${object.roomIndex}: every cushion corner stays over the seat`);
      assert.ok(support.point.y-underside>.001,`${id}/${object.roomIndex}: lower cushion edges sit inside the bevel rather than floating over it`);
    }
    seats++;
  }
  assert.ok(seats>=8,'Narrow chairs and wide benches are checked across the study and garden floors');
});

test('the narrow penthouse bookcase exposes eight separate spines with clear gaps',()=>{
  const interior=interiors.get('penthouse'),index=2;
  const shelf=interior.interactions.objects.find(object=>object.roomIndex===index&&object.name==='Reference shelves');
  const turn=interior.rooms[index].design.turn+(interior.architecture.rooms[index].opening.entrySide<0?Math.PI:0);
  const unstaged=new T.Matrix4().makeRotationY(-turn);
  const solids=shelf.parts.filter(part=>part.normals).map(part=>mesh(part,unstaged));
  const intervals=[];
  let start=null;
  for(let sample=0;sample<=810;sample++){
    const x=2.45-.81+sample*.002;
    const hits=new T.Raycaster(new T.Vector3(x,.6,-1.5),new T.Vector3(0,0,-1)).intersectObjects(solids);
    const spine=hits.some(hit=>Math.abs(hit.point.z-(-2.65+.24))<1e-5);
    if(spine&&start===null)start=x;
    if(!spine&&start!==null){intervals.push([start,x-.002]);start=null;}
  }
  assert.equal(start,null,'The books fit inside the shelf uprights');
  assert.equal(intervals.length,8,'Rendered book fronts never merge into overlapping blocks');
  for(let i=1;i<intervals.length;i++)assert.ok(intervals[i][0]-intervals[i-1][1]>.03,'Neighboring books leave a visible gap across their full height');
});
