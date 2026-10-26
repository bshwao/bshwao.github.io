import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/vendor/three.module.min.js';
import { sections,interiorFloorHeight } from '../assets/tower-geometry.js';
import { floorContent } from '../assets/floor-content.js';
import { createInterior } from '../assets/interiors.js';
import { interiorRoomDesign } from '../assets/interior-design.js';

const interiors=new Map(sections.map(section=>[section.id,createInterior(section,floorContent[section.id])]));
const objectBounds=object=>{
  const bounds=new T.Box3();
  for(const part of object.parts.filter(part=>part.normals))bounds.union(new T.Box3().setFromArray(part.rest));
  return bounds;
};

test('all 23 rendered rooms retain independent palettes through focus and hover transitions',()=>{
  const palettes=new Set();
  for(const [id,interior]of interiors)for(const [index,room]of interior.rooms.entries()){
    const expected=new Set(Object.values(interiorRoomDesign(id,index).colors).map(hex=>hex.slice(1)));
    const actual=()=>new Set(room.surfaces.map(surface=>surface.material.color.getHexString()));
    assert.deepEqual(actual(),expected,`${id}/${index}: actual furniture materials use the room palette`);
    palettes.add([...actual()].sort().join('/'));
    interior.setFocus(index,1);interior.setHoveredRoom(index);assert.deepEqual(actual(),expected,'Focused room keeps its full material colors');
    interior.setHoveredRoom(null);interior.setFocus(null,0);assert.deepEqual(actual(),expected,'Returning to overview restores authored colors');
  }
  assert.equal(palettes.size,23,'No room repeats the old four-color cycle');
});

test('every physical room floor carries its own finish in the rendered vertex buffer',()=>{
  const floors=new Set();
  for(const [id,interior]of interiors){
    const architecture=interior.architecture.group.children.filter(node=>node.isMesh);
    for(const [index,room]of interior.architecture.rooms.entries()){
      const x=room.region.x-room.region.width*.39,z=room.region.z-room.region.depth*.39;
      const hits=new T.Raycaster(new T.Vector3(x,10,z),new T.Vector3(0,-1,0)).intersectObjects(architecture);
      const hit=hits.find(hit=>Math.abs(hit.point.y-interiorFloorHeight)<1e-5);
      assert.ok(hit,`${id}/${index}: a real finish covers the floor`);
      assert.ok(hit.point.y-.035>=.05,'The finish clears the tower slab at overview depth precision');
      assert.equal(hit.object.material.vertexColors,true);
      const actual=new T.Color().fromBufferAttribute(hit.object.geometry.attributes.color,hit.face.a);
      const expected=new T.Color(interiorRoomDesign(id,index).floor);
      assert.ok(actual.toArray().every((v,i)=>Math.abs(v-expected.toArray()[i])<1e-5));
      floors.add(actual.getHexString());
    }
  }
  assert.equal(floors.size,23,'Floor finishes vary by room as well as by floor');
});

test('the penthouse has warm physical materials and rounded upholstery while the workshop uses low utility stools',()=>{
  const penthouse=interiors.get('penthouse');
  for(const room of penthouse.rooms)for(const surface of room.surfaces.filter(surface=>surface.material.color.getHexString()!==room.design.colors.ink.slice(1))){
    const c=surface.material.color;assert.ok(c.r>c.b,'Penthouse furniture retains a warm red-to-blue balance');
  }
  const bedding=penthouse.interactions.objects.find(object=>object.name==='Pillows and duvet');
  const curved=bedding.parts.filter(part=>part.normals).some(part=>{
    for(let i=0;i<part.normals.length;i+=3)if([0,1,2].filter(axis=>Math.abs(part.normals[i+axis])>.1).length>1)return true;
    return false;
  });
  assert.ok(curved,'Bedding has curved bevel normals instead of sharp cube faces');
  const classic=interiors.get('about').interactions.objects.find(object=>object.name==='Desk chair');
  const utility=interiors.get('experience').interactions.objects.find(object=>object.name==='Desk chair');
  assert.ok(objectBounds(classic).getSize(new T.Vector3()).y>objectBounds(utility).getSize(new T.Vector3()).y*1.6,'Study seating and workshop stools have distinct actual silhouettes');
});

test('restaged focal furnishings have different orientations while attached parts remain in their object batches',()=>{
  const bed=interiors.get('penthouse').interactions.objects.find(object=>object.name==='Pillows and duvet');
  const bedSize=objectBounds(bed).getSize(new T.Vector3());assert.ok(bedSize.x>bedSize.z,'The bed now sits across its bay');
  const desk=interiors.get('projects').interactions.objects.find(object=>object.name==='Work desk');
  const deskSize=objectBounds(desk).getSize(new T.Vector3());assert.ok(deskSize.z>deskSize.x*1.5,'The maker desk is a lengthwise island');
  assert.ok(desk.parts.some(part=>!part.normals),'Restaging keeps outlines with their animated solid ranges');
});

test('the bedroom workstation has an aligned task chair and stays separate from the sleeping area',()=>{
  const interior=interiors.get('penthouse');
  const find=name=>interior.interactions.objects.find(object=>object.name===name);
  const chair=find('Bedroom computer chair'),desk=find('Bedroom computer desk'),monitor=find('Bedroom computer monitor');
  assert.ok(chair&&desk&&monitor,'The desk, task chair and working monitor remain individually selectable');
  assert.equal(chair.kind,'seat');
  const seat=objectBounds(chair),table=objectBounds(desk),screen=objectBounds(monitor),bed=objectBounds(find('Pillows and duvet')),ottoman=objectBounds(find('Soft ottoman'));
  const center=box=>box.getCenter(new T.Vector3()).setY(0);
  const towardDesk=center(table).sub(center(seat)).normalize(),towardScreen=center(screen).sub(center(table)).normalize();
  assert.ok(towardDesk.dot(towardScreen)>.98,'The chair is centered in front of the desk and faces its monitor');
  const gap=(a,b)=>Math.max(a.min.x-b.max.x,b.min.x-a.max.x,a.min.z-b.max.z,b.min.z-a.max.z);
  assert.ok(gap(seat,bed)>.7,'The complete chair footprint clears the bed and leaves a walking aisle');
  assert.ok(gap(table,bed)>1.5,'The workstation occupies a separate area instead of hiding behind the headboard');
  assert.ok(gap(ottoman,seat)>.5&&gap(ottoman,table)>.5,'The ottoman does not occupy the desk sitting area');
  assert.ok(seat.max.y>1.7,'The computer has a full-height backrest rather than a bedside stool');
  assert.ok(center(seat).distanceTo(center(table))<center(seat).distanceTo(center(bed)),'The task chair belongs to the workstation');
});
