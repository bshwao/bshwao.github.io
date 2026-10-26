import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { createPortfolioIntro, introSessionKey, shouldShowIntro } from '../assets/portfolio-intro.js';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const memoryStorage=()=>{
  const values=new Map();
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};
};
function fixture({hash='',storage=memoryStorage(),reduced=false}={}){
  const dom=new JSDOM(html,{url:`https://portfolio.test/${hash}`}),window=dom.window,document=window.document;
  Object.defineProperty(window.HTMLElement.prototype,'inert',{
    get(){return this.hasAttribute('inert');},set(value){this.toggleAttribute('inert',Boolean(value));},
  });
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  let now=0,id=0,entered=0;
  const timers=new Map();
  window.setTimeout=(callback,delay=0)=>{timers.set(++id,{callback,at:now+delay});return id;};
  window.clearTimeout=timer=>timers.delete(timer);
  const advance=delta=>{
    now+=delta;
    for(;;){
      const next=[...timers.entries()].filter(([,timer])=>timer.at<=now).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!next)break;
      timers.delete(next[0]);next[1].callback();
    }
  };
  const dialog=document.querySelector('#portfolio-intro'),page=document.querySelector('#main'),button=dialog.querySelector('#intro-enter');
  const cityButton=document.createElement('button');cityButton.textContent='Explore city';page.append(cityButton);
  const motion={reduced};
  const intro=createPortfolioIntro({dialog,page,storage,reducedMotion:()=>motion.reduced,onEntered(){entered++;cityButton.focus();}});
  return {window,document,dialog,page,button,storage,timers,advance,intro,motion,get entered(){return entered;},close(){intro.dispose();dom.window.close();}};
}

test('the intro is limited to fresh home entry and safely tolerates denied session storage',()=>{
  const storage=memoryStorage();
  for(const hash of ['','#tower'])assert.equal(shouldShowIntro(hash,storage),true);
  for(const hash of ['#explore','#penthouse','#penthouse/b','#about','#projects/b','#resume/d','#unknown'])assert.equal(shouldShowIntro(hash,storage),false);
  storage.setItem(introSessionKey,'1');
  for(const hash of ['','#tower'])assert.equal(shouldShowIntro(hash,storage),false);
  storage.setItem(introSessionKey,'unexpected');assert.equal(shouldShowIntro('',storage),true);
  assert.equal(shouldShowIntro('',{getItem(){throw new Error('denied');}}),true);
});

test('the static title page stays closed without JavaScript and preserves a direct reading link',()=>{
  const dom=new JSDOM(html),document=dom.window.document,dialog=document.querySelector('#portfolio-intro');
  assert.equal(dialog.open,false);
  assert.equal(document.querySelector('#main').hasAttribute('inert'),false);
  assert.equal(document.querySelector('#main').contains(dialog),false,'The intro survives replacement of the city markup');
  for(const attribute of ['aria-labelledby','aria-describedby'])assert.ok(document.getElementById(dialog.getAttribute(attribute)));
  assert.equal(dialog.querySelector('a[href="./reading.html"]').textContent.trim(),'Read the portfolio');
  assert.ok(document.querySelector('noscript').textContent.includes('Read the complete portfolio'));
  dom.window.close();
});

test('entry is user paced and reveals a ready city once before recording the session',()=>{
  const f=fixture();
  try{
    assert.equal(f.intro.active,true);assert.equal(f.page.inert,true);assert.equal(f.document.activeElement,f.button);
    f.intro.ready();f.advance(30_000);
    assert.equal(f.intro.active,true,'Readiness never automatically dismisses the introduction');
    assert.equal(f.timers.size,0);
    f.button.click();f.intro.enter();
    assert.equal(f.dialog.dataset.state,'leaving');assert.equal(f.timers.size,1);
    assert.equal(f.storage.getItem(introSessionKey),null,'Starting a reveal does not mark it completed');
    f.advance(849);assert.equal(f.intro.active,true);assert.equal(f.page.inert,true);
    f.advance(1);
    assert.equal(f.intro.active,false);assert.equal(f.page.inert,false);
    assert.equal(f.document.documentElement.dataset.intro,undefined);
    assert.equal(f.storage.getItem(introSessionKey),'1');assert.equal(f.entered,1);
    f.intro.enter();f.advance(10_000);assert.equal(f.entered,1);assert.equal(f.timers.size,0);
  }finally{f.close();}
});

test('an early entry request waits for the rendered city instead of revealing a blank view',()=>{
  const f=fixture();
  try{
    f.button.click();f.advance(10_000);
    assert.equal(f.intro.active,true);assert.equal(f.page.inert,true);assert.equal(f.button.disabled,true);
    assert.equal(f.timers.size,0);assert.equal(f.storage.getItem(introSessionKey),null);
    f.intro.ready();f.intro.ready();assert.equal(f.timers.size,1);
    f.advance(850);assert.equal(f.intro.active,false);assert.equal(f.entered,1);
  }finally{f.close();}
});

test('reduced motion reveals the city immediately and follows the current preference',()=>{
  const f=fixture();
  try{
    f.intro.ready();f.motion.reduced=true;f.button.click();
    assert.equal(f.intro.active,false);assert.equal(f.page.inert,false);
    assert.equal(f.timers.size,0);assert.equal(f.storage.getItem(introSessionKey),'1');assert.equal(f.entered,1);
  }finally{f.close();}
});

test('entry and replay remain usable when session storage access throws',()=>{
  const storage={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}};
  const f=fixture({storage,reduced:true});
  try{
    f.intro.ready();f.button.click();assert.equal(f.intro.active,false);
    f.intro.show();assert.equal(f.intro.active,true);assert.equal(f.button.disabled,false);
    f.button.click();assert.equal(f.intro.active,false);assert.equal(f.entered,2);
  }finally{f.close();}
});

test('a completed session and direct room links bypass the intro while explicit replay still works',()=>{
  const storage=memoryStorage();storage.setItem(introSessionKey,'1');
  for(const options of [{storage},{hash:'#projects/b'}]){
    const f=fixture(options);
    try{
      assert.equal(f.intro.active,false);assert.equal(f.page.inert,false);
      f.intro.ready();f.intro.show();assert.equal(f.intro.active,true);assert.equal(f.page.inert,true);
      f.intro.dismiss();assert.equal(f.intro.active,false);assert.equal(f.page.inert,false);
    }finally{f.close();}
  }
});

test('Escape requests entry and waits for readiness instead of exposing an unfinished city',()=>{
  const f=fixture({reduced:true});
  try{
    const cancel=new f.window.Event('cancel',{cancelable:true});f.dialog.dispatchEvent(cancel);
    assert.equal(cancel.defaultPrevented,true);assert.equal(f.intro.active,true);assert.equal(f.button.disabled,true);
    f.intro.ready();assert.equal(f.intro.active,false);assert.equal(f.entered,1);
  }finally{f.close();}
});

test('replaying from an interior can wait for the city camera to return',()=>{
  const f=fixture({reduced:true});
  try{
    f.intro.ready();f.button.click();
    f.intro.show({waitForReady:true});f.button.click();
    assert.equal(f.intro.active,true);assert.equal(f.timers.size,0);
    f.intro.ready();assert.equal(f.intro.active,false);assert.equal(f.entered,2);
  }finally{f.close();}
});

test('route or fallback dismissal cancels a pending reveal without restoring focus or marking a visit',()=>{
  const f=fixture();
  try{
    f.intro.ready();f.button.click();assert.equal(f.timers.size,1);
    f.intro.dismiss();f.advance(850);
    assert.equal(f.timers.size,0);assert.equal(f.intro.active,false);assert.equal(f.page.inert,false);
    assert.equal(f.storage.getItem(introSessionKey),null);assert.equal(f.entered,0);
  }finally{f.close();}
});

test('external close and disposal release the city and leave no reveal callbacks',()=>{
  const f=fixture();
  try{
    f.intro.ready();f.button.click();f.dialog.close();f.dialog.dispatchEvent(new f.window.Event('close'));
    assert.equal(f.intro.active,false);assert.equal(f.page.inert,false);assert.equal(f.timers.size,0);
    f.intro.show();f.button.click();assert.equal(f.timers.size,1);
    f.intro.dispose();f.advance(850);f.button.click();f.intro.show();
    assert.equal(f.intro.active,false);assert.equal(f.page.inert,false);assert.equal(f.timers.size,0);assert.equal(f.entered,0);
  }finally{f.close();}
});

test('finishing entry does not steal focus moved outside the intro',()=>{
  const f=fixture();
  try{
    f.intro.ready();f.button.click();
    const outside=f.document.querySelector('.skip-portfolio');outside.focus();f.advance(850);
    assert.equal(f.document.activeElement,outside);assert.equal(f.entered,0);assert.equal(f.page.inert,false);
  }finally{f.close();}
});
