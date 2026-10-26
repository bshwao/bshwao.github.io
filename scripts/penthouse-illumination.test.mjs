import test from 'node:test';
import assert from 'node:assert/strict';
import { sections } from '../assets/tower-geometry.js';
import { floorContent } from '../assets/floor-content.js';
import { createInterior } from '../assets/interiors.js';

function fixture() {
  const interior=createInterior(sections.find(section=>section.id==='penthouse'),floorContent.penthouse);
  const interactions=interior.interactions;
  const lamp=interactions.objects.find(object=>object.name==='Bedside lamp');
  const neighbor=interactions.objects.find(object=>object.roomIndex===0&&object!==lamp);
  return {interactions,lamp,neighbor};
}
const sampleColor=object=>object.parts.map(part=>Array.from(part.geometry.attributes.color.array.subarray(part.start*3,(part.start+part.count)*3)));
const samplePosition=object=>object.parts.map(part=>Array.from(part.geometry.attributes.position.array.subarray(part.start*3,(part.start+part.count)*3)));

test('bedside illumination changes only its own batched ranges and creates no animation work',()=>{
  const {interactions,lamp,neighbor}=fixture(),before=sampleColor(neighbor);
  assert.ok(lamp,'The physical bedside lamp is independently addressable');
  assert.equal(interactions.setIllumination(object=>object.name==='Bedside lamp',true),true);
  assert.equal(lamp.illumination,1);
  for(const part of lamp.parts){
    const color=part.geometry.attributes.color;
    assert.ok(color.getX(part.start)>2,'Lamp receives a persistent warm vertex boost');
    assert.ok(color.getX(part.start)>color.getY(part.start)&&color.getY(part.start)>color.getZ(part.start));
  }
  assert.deepEqual(sampleColor(neighbor),before,'Other objects sharing its materials remain unchanged');
  assert.equal(interactions.setIllumination('Bedside lamp',1),false,'Repeating the same setting is a no-op');
  assert.deepEqual(interactions.update(100),{changed:false,moving:false});
});

test('illumination survives highlight, click response and reset without moving the lamp',()=>{
  const {interactions,lamp}=fixture(),rest=samplePosition(lamp);
  interactions.setIllumination('Bedside lamp',1);
  const illuminated=sampleColor(lamp);
  interactions.hover(lamp);interactions.activate(lamp,0);interactions.update(230);
  assert.notDeepEqual(sampleColor(lamp),illuminated,'Temporary feedback composes with the lit state');
  assert.notDeepEqual(samplePosition(lamp),rest,'The existing lamp response remains active');
  interactions.reset();
  assert.equal(lamp.illumination,1);
  assert.deepEqual(sampleColor(lamp),illuminated,'Reset restores the illuminated baseline');
  assert.deepEqual(samplePosition(lamp),rest);
  assert.deepEqual(interactions.update(2000),{changed:false,moving:false});
  interactions.setIllumination('Bedside lamp',false);
  for(const part of lamp.parts)assert.equal(part.geometry.attributes.color.getX(part.start),1);
});

test('changing illumination preserves the exact in-progress object pose and finite settling',()=>{
  const {interactions,lamp}=fixture();
  interactions.activate(lamp,10);interactions.update(280);
  const before=samplePosition(lamp);
  interactions.setIllumination('Bedside lamp',.7);
  assert.deepEqual(samplePosition(lamp),before,'A brightness setting does not restart or jump an object response');
  interactions.update(1000);
  assert.deepEqual(interactions.update(1016),{changed:false,moving:false});
  assert.equal(lamp.illumination,.7);
  interactions.setIllumination('Bedside lamp',Number.POSITIVE_INFINITY);
  assert.equal(lamp.illumination,0,'Invalid values cannot corrupt vertex colors');
});

test('reduced-motion illumination retains color while keeping resting geometry',()=>{
  const {interactions,lamp}=fixture(),rest=samplePosition(lamp);
  interactions.setReducedMotion(true);interactions.setIllumination('Bedside lamp',true);
  interactions.hover(lamp);interactions.activate(lamp,0);interactions.update(300);
  assert.deepEqual(samplePosition(lamp),rest);
  assert.ok(lamp.parts[0].geometry.attributes.color.getX(lamp.parts[0].start)>1);
  interactions.reset();
  assert.deepEqual(interactions.update(1000),{changed:false,moving:false});
});
