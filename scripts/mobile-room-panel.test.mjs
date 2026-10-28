import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createMobileRoomPanel } from '../assets/mobile-room-panel.js';
import { viewportLayout } from '../assets/spatial-layout.js';

function fixture(){
  const dom=new JSDOM(`<main><div id="room-panel-views">${['scene','split','read'].map(view=>`<button data-panel-view="${view}" aria-controls="interior-scroll">${view}</button>`).join('')}</div><nav id="station-navigation"><button aria-pressed="false">First</button><button aria-pressed="true">Last</button></nav><div id="interior-scroll"><h2 id="interior-room-title" tabindex="-1">Room</h2><textarea>Unsaved notes</textarea></div></main>`,{pretendToBeVisual:true});
  let mobile=true;const changes=new Set();
  dom.window.matchMedia=()=>({get matches(){return mobile;},addEventListener(type,fn){changes.add(fn);},removeEventListener(type,fn){changes.delete(fn);}});
  const page=dom.window.document.querySelector('main'),controller=createMobileRoomPanel(page);
  return {dom,page,controller,change(value){mobile=value;for(const fn of changes)fn();}};
}

test('mobile panel switches preserve live activity state and exclude collapsed content from focus',()=>{
  const {dom,page,controller}=fixture(),scroll=page.querySelector('#interior-scroll'),notes=page.querySelector('textarea');
  notes.value='A draft that must survive switching views';notes.focus();
  page.querySelector('[data-panel-view="scene"]').click();
  assert.equal(scroll.inert,true);assert.equal(page.dataset.roomPanel,'scene');
  assert.equal(dom.window.document.activeElement,page.querySelector('[data-panel-view="scene"]'));
  page.querySelector('[data-panel-view="read"]').click();
  assert.equal(scroll.inert,false);assert.equal(notes,page.querySelector('textarea'));assert.equal(notes.value,'A draft that must survive switching views');
  assert.equal(page.querySelectorAll('[aria-pressed="true"][data-panel-view]').length,1);
  assert.equal(page.querySelector('[data-panel-view="read"]').getAttribute('aria-pressed'),'true');
  controller.dispose();dom.window.close();
});

test('room keyboard focus reveals content and returning to desktop restores a usable focus target',()=>{
  const {dom,page,controller,change}=fixture();
  controller.setView('scene');controller.revealForFocus();assert.equal(page.dataset.roomPanel,'split');
  controller.setView('scene');page.querySelector('[data-panel-view="scene"]').focus();change(false);
  assert.equal(page.querySelector('#interior-scroll').inert,false);
  assert.equal(dom.window.document.activeElement,page.querySelector('#interior-room-title'));
  change(true);assert.equal(page.querySelector('#interior-scroll').inert,true);
  controller.dispose();page.querySelector('[data-panel-view="read"]').click();
  assert.equal(page.dataset.roomPanel,'scene','Disposed controllers cannot mutate the view');dom.window.close();
});

test('horizontal room navigation brings a selected offscreen tab into reach in either direction',()=>{
  const {dom,page,controller}=fixture(),nav=page.querySelector('nav'),active=nav.querySelector('[aria-pressed="true"]');
  Object.defineProperties(nav,{clientWidth:{value:280},scrollWidth:{value:520}});
  nav.getBoundingClientRect=()=>({left:12,right:292});active.getBoundingClientRect=()=>({left:340,right:440});
  controller.refreshNavigation();assert.equal(nav.scrollLeft,148);
  active.getBoundingClientRect=()=>({left:-30,right:70});controller.refreshNavigation();assert.equal(nav.scrollLeft,106);
  controller.dispose();dom.window.close();
});

test('wide phone landscapes reserve a readable side panel while tablets retain their normal layout',()=>{
  for(const [width,height] of [[650,390],[844,390],[932,430]]){
    const layout=viewportLayout(width,height);assert.equal(layout.compactLandscape,true);assert.equal(layout.stacked,false);
    assert.equal(layout.panelWidth,Math.min(390,width*.44));assert.ok(layout.rect.right<=width-layout.panelWidth-24);
  }
  assert.equal(viewportLayout(768,1024).compactLandscape,false);
  assert.equal(viewportLayout(768,1024).stacked,true);
  assert.equal(viewportLayout(390,844).stacked,true);
});
