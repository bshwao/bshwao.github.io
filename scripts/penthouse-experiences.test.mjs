import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createPenthouseExperiences,penthouseExperienceMarkup } from '../assets/penthouse-experiences.js';

function fixture(){
  const dom=new JSDOM('<div id="stage"></div><main></main>',{url:'https://portfolio.test/',pretendToBeVisual:true}),w=dom.window;
  const saved=new Map();
  const globals={window:w,document:w.document,ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:w.requestAnimationFrame.bind(w),cancelAnimationFrame:w.cancelAnimationFrame.bind(w)};
  for(const [key,value]of Object.entries(globals)){saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  const container=w.document.querySelector('main'),atmospheres=[];
  const experience=createPenthouseExperiences({container,stage:w.document.querySelector('#stage'),onAtmosphere:value=>atmospheres.push(value)});
  const mount=(id,index=0)=>{container.innerHTML=id==='penthouse'?penthouseExperienceMarkup(index):'';experience.mount(id,index);};
  return {w,container,experience,mount,atmospheres,find:selector=>w.document.querySelector(selector),close(){experience.dispose();w.close();for(const [key,descriptor]of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}};
}

test('room activities open from content and furniture, keep desktop/game state, and close on navigation',()=>{
  const f=fixture();try{
    f.mount('penthouse',0);assert.equal(f.find('.penthouse-player'),null);f.find('[data-bedroom-desktop]').click();
    const desktop=f.find('#penthouse-desktop-dialog');assert.equal(desktop.open,true);
    const notes=f.find('[data-desktop-notes]');notes.value='A room with a view.';notes.dispatchEvent(new f.w.Event('input',{bubbles:true}));
    desktop.close();f.experience.onObject({sectionId:'penthouse',roomIndex:0,name:'Bedroom computer monitor'});
    assert.equal(desktop.open,true);assert.equal(f.find('[data-desktop-notes]').value,'A room with a view.');
    f.mount('penthouse',1);assert.equal(desktop.open,false);f.find('[data-penthouse-open="arcade"]').click();
    const arcade=f.find('#penthouse-arcade-dialog');assert.equal(arcade.open,true);
    f.mount('penthouse',3);assert.equal(arcade.open,false);
    f.experience.onObject({sectionId:'penthouse',roomIndex:3,name:'Telescope'});assert.equal(f.find('#penthouse-sky-dialog').open,true);
    f.mount('penthouse',2);f.find('[data-music-expand]').click();assert.equal(f.find('#penthouse-music-dialog').open,true);
    f.mount('about');assert.equal(f.find('#penthouse-music-dialog').open,false);assert.equal(f.atmospheres.at(-1),null);
    f.experience.open('sky');assert.equal(f.find('#penthouse-sky-dialog').open,false,'activities cannot reopen off the penthouse');
  }finally{f.close();}
});

test('lighting and weather controls drive scene state without a bedroom rain overlay',()=>{
  const f=fixture();try{
    f.mount('penthouse');
    const select=f.find('[data-bedroom-lighting]');select.value='night';select.dispatchEvent(new f.w.Event('change',{bubbles:true}));
    assert.deepEqual(f.atmospheres.at(-1),{hour:22,brightness:.55,lamps:true,weather:'clear',ambient:'off'});
    f.experience.onObject({sectionId:'penthouse',roomIndex:0,name:'Bedside lamp'});assert.equal(f.atmospheres.at(-1).lamps,false);
    const rain=f.find('[data-bedroom-weather]');rain.value='rain';rain.dispatchEvent(new f.w.Event('change',{bubbles:true}));
    assert.equal(f.atmospheres.at(-1).weather,'rain');
    assert.equal(f.find('.penthouse-weather'),null,'Rain is rendered behind the interior by the scene, never on top of the bedroom');
    f.mount('penthouse',2);f.mount('penthouse',0);assert.equal(f.find('[data-bedroom-lighting]').value,'night');assert.equal(f.find('[data-bedroom-weather]').value,'rain');
    f.mount('projects');assert.equal(f.atmospheres.at(-1),null);
  }finally{f.close();}
});

test('dropping local audio into the compact player selects it without uploading or starting playback',()=>{
  const f=fixture(),create=URL.createObjectURL,revoke=URL.revokeObjectURL,revoked=[];
  URL.createObjectURL=()=> 'blob:local-drop-test';URL.revokeObjectURL=value=>revoked.push(value);
  try{
    f.mount('penthouse',2);
    const drop=new f.w.Event('drop',{bubbles:true,cancelable:true});
    Object.defineProperty(drop,'dataTransfer',{value:{files:[{name:'Visitor session.wav',type:'audio/wav',size:1000}]}});
    f.find('.music-drop').dispatchEvent(drop);
    assert.equal(drop.defaultPrevented,true);assert.equal(f.find('[data-music-title]').textContent,'Visitor session.wav');
    assert.equal(f.find('[data-music-track]').options.length,4);assert.match(f.find('[data-music-subtitle]').textContent,/stays on this device/);
    assert.equal(f.find('[data-music-play]').getAttribute('aria-label'),'Play music');
    f.experience.dispose();assert.deepEqual(revoked,['blob:local-drop-test']);
  }finally{f.close();URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
});
