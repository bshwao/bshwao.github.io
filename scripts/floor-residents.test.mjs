import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/vendor/three.module.min.js';
import { createInterior } from '../assets/interiors.js';
import { sections } from '../assets/tower-geometry.js';
import { floorContent } from '../assets/floor-content.js';
import { readResidentPause,residentPauseKey } from '../assets/floor-residents.js';

const about=()=>createInterior(sections.find(section=>section.id==='about'),floorContent.about);
test('the two robot trial is confined to Level 01, with the seated partner attached to the study chair',()=>{
  for(const section of sections){const interior=createInterior(section,floorContent[section.id]);
    assert.equal(Boolean(interior.resident),section.id==='about');
    assert.deepEqual(interior.rooms.flatMap((room,i)=>room.group.userData.seatedResident?[i]:[]),section.id==='about'?[1]:[]);
    for(const room of interior.rooms)assert.equal(room.group.children.length,4,'The seated character retains the existing room batches');
    if(section.id==='about'){
      assert.equal(interior.resident.state().count,2);
      const chair=interior.interactions.objects.find(object=>object.name==='Desk chair');
      const bounds=new T.Box3();for(const part of chair.parts)for(let i=0;i<part.rest.length;i+=3)bounds.expandByPoint(new T.Vector3().fromArray(part.rest,i));
      assert.ok(bounds.getSize(new T.Vector3()).y>interior.unit*1.8,'The occupied chair includes the robot head and antenna in its actual solid ranges');
    }
  }
});
test('the walking route is closed, keeps its complete animated envelope on the floor, and clears fixed furnishings',()=>{
  const interior=about(),room=interior.rooms[0],resident=interior.resident,{region}=room;
  assert.ok(resident.bounds.min.x>=region.x-region.width/2&&resident.bounds.max.x<=region.x+region.width/2);
  assert.ok(resident.bounds.min.z>=region.z-region.depth/2&&resident.bounds.max.z<=region.z+region.depth/2);
  for(const obstacle of resident.obstacles)assert.equal(resident.bounds.intersectsBox(obstacle),false,'The entire patrol clears the actual display cabinets, benches, and task lights');
  assert.deepEqual(resident.route.sample(0),resident.route.sample(resident.route.length));
  for(let i=0;i<1200;i++){const p=resident.route.sample(i/1199*resident.route.length);assert.ok(Number.isFinite(p.heading));assert.ok(p.x>=resident.bounds.min.x&&p.x<=resident.bounds.max.x&&p.z>=resident.bounds.min.z&&p.z<=resident.bounds.max.z);}
  const point=new T.Vector3();
  for(let time=0;time<30000;time+=100){resident.update(time);resident.root.updateMatrixWorld(true);
    const vertices=resident.mesh.geometry.attributes.position;
    for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i).applyMatrix4(resident.mesh.matrixWorld);assert.ok(resident.bounds.containsPoint(point),'Every actual animated vertex remains inside the tested collision envelope');}
  }
});
test('walking changes position and articulated limbs while leaving the seated robot and GPU buffers intact',()=>{
  const interior=about(),resident=interior.resident,geometry=resident.mesh.geometry;
  const seated=interior.interactions.objects.find(object=>object.name==='Desk chair').parts.map(part=>({part,positions:part.geometry.attributes.position.array.slice()}));
  const before=geometry.attributes.position.array.slice(),position=resident.root.position.clone(),attributes=geometry.attributes.position;
  resident.update(0);resident.update(100);resident.update(200);
  assert.ok(resident.root.position.distanceTo(position)>.01);assert.ok(before.some((value,i)=>Math.abs(value-attributes.array[i])>.001));
  for(let t=300;t<=10000;t+=100)resident.update(t);
  assert.equal(resident.mesh.geometry,geometry);assert.equal(geometry.attributes.position,attributes);
  for(const item of seated)assert.deepEqual(item.part.geometry.attributes.position.array,item.positions,'The desk companion stays stationary');
});
test('pause, reduced-motion input, and another room stop walking without hidden-time catch-up',()=>{
  const interior=about(),resident=interior.resident;
  interior.updateResidents(0,true);interior.updateResidents(100,true);
  interior.updateResidents(200,false);const position=resident.root.position.clone(),distance=resident.state().distance;
  assert.equal(interior.updateResidents(5000,false).moving,false);assert.deepEqual(resident.root.position,position);
  interior.setFocus(1);assert.equal(interior.updateResidents(6000,true).moving,false);assert.equal(resident.root.visible,false);
  interior.setFocus(0);interior.updateResidents(90000,true);assert.equal(resident.state().distance,distance,'Returning to the gallery resumes from the existing position');
  interior.updateResidents(90100,true);assert.ok(resident.state().distance>distance);
});
test('the optional pause preference is tab-local and safe when storage is denied',()=>{
  assert.equal(readResidentPause({getItem:key=>key===residentPauseKey?'true':null}),true);
  assert.equal(readResidentPause({getItem:()=>null}),false);assert.equal(readResidentPause({getItem(){throw Error('denied');}}),false);
});
