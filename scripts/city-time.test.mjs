import test from 'node:test';
import assert from 'node:assert/strict';
import {readCityTime,createCityClock} from '../assets/city-time.js';

const at=hour=>new Date(2026,9,23,Math.floor(hour),Math.round((hour%1)*60),0);
test('visitor-local morning and night select the sun, moon, stars and coordinated city lighting',()=>{
  const morning=readCityTime(at(10)),night=readCityTime(at(22));
  assert.equal(morning.hour,10);assert.equal(morning.phase,'morning');
  assert.equal(morning.daylight,1);assert.equal(morning.sunVisibility,1);
  assert.equal(morning.moonVisibility,0);assert.equal(morning.stars,0);
  assert.equal(night.phase,'night');assert.equal(night.daylight,0);
  assert.equal(night.sunVisibility,0);assert.equal(night.moonVisibility,1);assert.equal(night.stars,1);
  assert.ok(morning.ambientIntensity>night.ambientIntensity&&morning.keyIntensity>night.keyIntensity);
  assert.notEqual(morning.zenith,night.zenith);assert.notEqual(morning.haze,night.haze);assert.notEqual(morning.tint,night.tint);
  assert.equal(readCityTime(at(14)).phase,'afternoon');assert.equal(readCityTime(at(18)).phase,'evening');
  assert.equal(readCityTime(at(6)).phase,'dawn');
  assert.throws(()=>readCityTime(new Date('invalid')),TypeError);
});
test('dawn and dusk blend continuously and all celestial directions remain finite and normalized',()=>{
  let last=null;
  for(let minute=0;minute<1440;minute++) {
    const state=readCityTime(at(minute/60));
    for(const vector of [state.sunDirection,state.moonDirection])assert.ok(vector.every(Number.isFinite)&&Math.abs(Math.hypot(...vector)-1)<1e-12);
    assert.ok(state.daylight>=0&&state.daylight<=1);
    if(last)assert.ok(Math.abs(last.daylight-state.daylight)<.017,'No abrupt brightness step between adjacent minutes');
    last=state;
  }
  const midnight=readCityTime(at(0)),end=readCityTime(at(23.9833333333));
  assert.equal(midnight.zenith,end.zenith);assert.equal(midnight.horizon,end.horizon);
  for(const hour of [6,18]){const state=readCityTime(at(hour));assert.ok(state.daylight>0&&state.daylight<1&&state.stars>0&&state.stars<1);}
});
test('one minute-aligned clock skips hidden work, catches up on return and releases its timer',()=>{
  let date=new Date(2026,9,23,10,0,23),pending,delay,hidden=false,cancelled;
  const states=[];
  const clock=createCityClock(state=>states.push(state),{now:()=>date,hidden:()=>hidden,
    schedule:(callback,ms)=>{pending=callback;delay=ms;return 42;},cancel:id=>{cancelled=id;}});
  assert.equal(states.length,1);assert.equal(delay,37020);
  clock.refresh();assert.equal(states.length,1,'No redundant refresh in the same minute');
  date=at(10.0166666667);pending();assert.equal(states.length,2);assert.equal(delay,60020);
  hidden=true;date=at(22);pending();assert.equal(states.length,2,'Hidden tabs do not update scene state');
  hidden=false;clock.refresh();assert.equal(states.at(-1).phase,'night');assert.equal(states.length,3);
  clock.dispose();assert.equal(cancelled,42);date=at(10);pending();clock.refresh();assert.equal(states.length,3,'Disposed scenes cannot schedule or refresh');
});
