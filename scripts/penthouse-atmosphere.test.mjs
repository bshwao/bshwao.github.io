import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { atmospherePresets, DEFAULT_ATMOSPHERE, normalizeAtmosphere, normalizeWindowPoints, createBedroomWeather } from '../assets/penthouse-atmosphere.js';

const windowPoints=[{x:100,y:40},{x:400,y:65},{x:380,y:330},{x:90,y:300}];

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

test('projected glass must be a finite convex quadrilateral',()=>{
  assert.deepEqual(normalizeWindowPoints(windowPoints),windowPoints);
  assert.notEqual(normalizeWindowPoints(windowPoints),windowPoints);
  assert.deepEqual(normalizeWindowPoints([...windowPoints].reverse()),[...windowPoints].reverse());
  for(const input of [null,[],windowPoints.slice(0,3),[{x:NaN,y:1},...windowPoints.slice(1)],[{x:1e9,y:0},...windowPoints.slice(1)],[{x:0,y:0},{x:1,y:1},{x:2,y:2},{x:3,y:3}],[{x:0,y:0},{x:20,y:20},{x:20,y:0},{x:0,y:20}]])assert.equal(normalizeWindowPoints(input),null);
});

function fixture() {
  const dom=new JSDOM('<div id="stage"></div>',{pretendToBeVisual:true});
  const stage=dom.window.document.querySelector('#stage');
  let dimensions={width:720,height:500};
  stage.getBoundingClientRect=()=>({...dimensions,left:0,top:0});
  const weather=createBedroomWeather(stage),layer=stage.querySelector('.penthouse-weather');
  return {dom,stage,weather,layer,resize(width,height){dimensions={width,height};dom.window.dispatchEvent(new dom.window.Event('resize'));}};
}

test('weather stays hidden until both rain and a visible projected window exist',()=>{
  const {dom,weather,layer}=fixture();
  assert.equal(layer.hidden,true);assert.equal(layer.getAttribute('aria-hidden'),'true');
  assert.equal(layer.dataset.animating,'false');
  weather.setState({weather:'rain',visible:true});assert.equal(layer.hidden,true);
  weather.setWindow(windowPoints);assert.equal(layer.hidden,false);assert.equal(layer.dataset.animating,'true');
  assert.equal(layer.querySelector('polygon').getAttribute('points'),'100.00,40.00 400.00,65.00 380.00,330.00 90.00,300.00');
  weather.setState({weather:'clear'});assert.equal(layer.hidden,true);assert.equal(layer.dataset.animating,'false');
  weather.setState({weather:'rain'});assert.equal(layer.hidden,false);
  weather.setWindow(windowPoints,false);assert.equal(layer.hidden,true);
  weather.setWindow(null,true);assert.equal(layer.hidden,true);
  weather.dispose();dom.window.close();
});

test('visibility and reduced motion stop CSS rain while static rain remains available',()=>{
  const {dom,weather,layer}=fixture();
  weather.setWindow(windowPoints);weather.setState({weather:'rain',visible:true});
  weather.setState({reducedMotion:true});assert.equal(layer.hidden,false);assert.equal(layer.dataset.animating,'false');
  weather.setState({reducedMotion:false});assert.equal(layer.dataset.animating,'true');
  Object.defineProperty(dom.window.document,'hidden',{value:true,configurable:true});
  dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));
  assert.equal(layer.dataset.animating,'false');
  Object.defineProperty(dom.window.document,'hidden',{value:false,configurable:true});
  dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));
  assert.equal(layer.dataset.animating,'true');
  weather.setState({visible:false});assert.equal(layer.dataset.animating,'false');
  weather.dispose();dom.window.close();
});

test('resize tracks stage pixels, instance clip IDs are safe, and dispose removes observers/listeners',()=>{
  const {dom,stage,weather,layer,resize}=fixture();
  const second=createBedroomWeather(stage);
  const ids=[...stage.querySelectorAll('[id]')].map(node=>node.id);
  assert.equal(ids.length,new Set(ids).size);
  assert.equal(layer.querySelector('svg').getAttribute('viewBox'),'0 0 720 500');
  resize(390,844);assert.equal(layer.querySelector('svg').getAttribute('viewBox'),'0 0 390 844');
  weather.dispose();weather.dispose();assert.equal(stage.contains(layer),false);
  resize(1000,700);weather.setWindow(windowPoints);weather.setState({weather:'rain',visible:true});
  assert.equal(layer.querySelector('svg').getAttribute('viewBox'),'0 0 390 844');
  second.dispose();assert.equal(stage.querySelector('.penthouse-weather'),null);
  dom.window.close();
});

test('ResizeObserver is disconnected and no JavaScript animation loop is scheduled',()=>{
  const dom=new JSDOM('<div id="stage"></div>',{pretendToBeVisual:true});
  let observed=null,disconnected=0,resizeCallback=null;
  dom.window.ResizeObserver=class {
    constructor(callback){resizeCallback=callback;}
    observe(element){observed=element;}
    disconnect(){disconnected++;}
  };
  dom.window.requestAnimationFrame=()=>{throw new Error('Rain must use CSS animation only.');};
  const stage=dom.window.document.querySelector('#stage');
  stage.getBoundingClientRect=()=>({width:800,height:600});
  const weather=createBedroomWeather(stage);
  assert.equal(observed,stage);
  weather.setWindow(windowPoints);weather.setState({weather:'rain',visible:true});
  resizeCallback();
  assert.equal(stage.querySelector('svg').getAttribute('viewBox'),'0 0 800 600');
  weather.dispose();assert.equal(disconnected,1);
  resizeCallback();assert.equal(stage.children.length,0);
  dom.window.close();
});
