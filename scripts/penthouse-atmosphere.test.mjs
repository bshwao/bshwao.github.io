import test from 'node:test';
import assert from 'node:assert/strict';

import { atmospherePresets, DEFAULT_ATMOSPHERE, normalizeAtmosphere } from '../assets/penthouse-atmosphere.js';



test('presets carry distinct complete room atmospheres',()=>{
  assert.deepEqual(atmospherePresets.map(preset=>preset.id),['rainy-night','golden-hour','late-night-coding']);
  const rainy=atmospherePresets[0],golden=atmospherePresets[1],coding=atmospherePresets[2];
  assert.deepEqual([rainy.hour,rainy.brightness,rainy.lamps,rainy.weather,rainy.ambient],[22,.62,true,'rain','rain']);
  assert.deepEqual([golden.hour,golden.brightness,golden.lamps,golden.weather,golden.ambient],[18,.95,false,'clear','city']);
  assert.deepEqual([coding.hour,coding.brightness,coding.lamps,coding.weather,coding.ambient],[23,.48,true,'clear','city']);
  for(const preset of atmospherePresets){assert.ok(Object.isFrozen(preset));assert.ok(preset.label);assert.equal(normalizeAtmosphere(preset).hour,preset.hour);}
});

test('normalization retains device time and bounds untrusted room settings',()=>{
  for(const input of [undefined,null,[],true,'rainy-night'])assert.deepEqual(normalizeAtmosphere(input),DEFAULT_ATMOSPHERE);
  assert.deepEqual(normalizeAtmosphere({hour:99,brightness:100,lamps:'yes',weather:'snow',ambient:'loud'}),{hour:23.999,brightness:1.25,lamps:false,weather:'clear',ambient:'off'});
  assert.deepEqual(normalizeAtmosphere({hour:-7,brightness:-4,lamps:true,weather:'rain',ambient:'city'}),{hour:0,brightness:.25,lamps:true,weather:'rain',ambient:'city'});
  assert.equal(normalizeAtmosphere({hour:null}).hour,null);
  assert.equal(normalizeAtmosphere({hour:Infinity,brightness:NaN}).hour,null);
  assert.equal(normalizeAtmosphere({hour:'18.5',brightness:'.62'}).hour,18.5);
  assert.equal(normalizeAtmosphere({hour:''}).hour,null);
});
