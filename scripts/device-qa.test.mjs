import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { JSDOM } from 'jsdom';
import { createDeviceServer } from './device-serve.mjs';

const source=await readFile(new URL('./device-qa.js',import.meta.url),'utf8');
async function serverFixture(t,options){
  const server=createDeviceServer(options);
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  return `http://127.0.0.1:${server.address().port}`;
}
function pageFixture(t,html,url){
  const dom=new JSDOM(html,{url,runScripts:'outside-only'}),win=dom.window,timers=new Map();let id=0;
  win.scrollTo=()=>{};
  win.setTimeout=(fn,ms)=>{timers.set(++id,{fn,ms});return id;};
  win.clearTimeout=key=>timers.delete(key);
  win.eval(source);
  t.after(()=>win.close());
  return {win,doc:win.document,timers};
}
const flush=()=>new Promise(setImmediate);

test('phone preview serves audio types and Safari-style byte ranges without exposing private files',async t=>{
  const temporaryRoot=resolve(tmpdir()),root=await mkdtemp(join(temporaryRoot,'portfolio-device-audio-'));
  t.after(async()=>{
    assert.equal(dirname(resolve(root)),temporaryRoot);assert.ok(basename(root).startsWith('portfolio-device-audio-'));
    await rm(root,{recursive:true,force:true});
  });
  const audio=Buffer.from('0123456789abcdefghijklmnopqrstuvwxyz');
  const types={WAV:'audio/wav',mp3:'audio/mpeg',ogg:'audio/ogg',m4a:'audio/mp4',flac:'audio/flac',aac:'audio/aac',webm:'audio/webm'};
  await mkdir(join(root,'assets'));
  await Promise.all(Object.keys(types).map(extension=>writeFile(join(root,'assets',`track.${extension}`),audio)));
  await writeFile(join(root,'private.txt'),'not public');
  const origin=await serverFixture(t,{root});
  for(const [extension,type]of Object.entries(types)){
    const response=await fetch(`${origin}/assets/track.${extension}`);
    assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),type);
    assert.equal(response.headers.get('accept-ranges'),'bytes');assert.equal(response.headers.get('content-length'),String(audio.length));
    assert.equal(response.headers.get('x-content-type-options'),'nosniff');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),audio);
  }
  for(const [range,start,end]of [['bytes=0-1',0,1],['bytes=8-',8,35],['bytes=-4',32,35]]){
    const response=await fetch(`${origin}/assets/track.WAV`,{headers:{Range:range}});
    assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes ${start}-${end}/${audio.length}`);
    assert.equal(response.headers.get('content-length'),String(end-start+1));
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),audio.subarray(start,end+1));
  }
  const invalid=await fetch(`${origin}/assets/track.WAV`,{headers:{Range:'bytes=999-'}});
  assert.equal(invalid.status,416);assert.equal(invalid.headers.get('content-range'),`bytes */${audio.length}`);assert.equal((await invalid.arrayBuffer()).byteLength,0);
  const head=await fetch(`${origin}/assets/track.WAV`,{method:'HEAD',headers:{Range:'bytes=0-1'}});
  assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),String(audio.length));assert.equal((await head.arrayBuffer()).byteLength,0);
  const conditional=await fetch(`${origin}/assets/track.WAV`,{headers:{Range:'bytes=0-1','If-Range':'"old-version"'}});
  assert.equal(conditional.status,200);assert.deepEqual(Buffer.from(await conditional.arrayBuffer()),audio);
  assert.equal((await fetch(`${origin}/private.txt`)).status,403);
  assert.equal((await fetch(`${origin}/assets/.secret`)).status,403);
});

test('both device-page URLs load their real module and start a reachable instrumented preview',async t=>{
  const origin=await serverFixture(t);
  for(const path of ['/','/scripts/device-qa.html']){
    const response=await fetch(origin+path);assert.equal(response.status,200);
    const {doc}=pageFixture(t,await response.text(),origin+path);
    const moduleURL=new URL(doc.querySelector('script[type="module"]').getAttribute('src'),origin+path);
    const moduleResponse=await fetch(moduleURL);
    assert.equal(moduleResponse.status,200);assert.match(moduleResponse.headers.get('content-type'),/javascript/);
    doc.querySelector('#run').click();
    assert.match(doc.querySelector('#status').textContent,/Preparing/);
    assert.equal(doc.querySelector('#run').disabled,true);
    const probe=doc.querySelector('iframe').src;
    assert.equal(new URL(probe).pathname,'/scripts/frame-probe.html');
    assert.equal((await fetch(probe)).status,200);
  }
});

test('a failed preview load reports the failure and re-enables retry',async t=>{
  const origin=await serverFixture(t),html=await (await fetch(origin)).text();
  const {doc,timers}=pageFixture(t,html,origin);
  doc.querySelector('#run').click();
  [...timers.values()].find(timer=>timer.ms===15000).fn();await flush();
  assert.match(doc.querySelector('#status').textContent,/Check stopped:.*could not load/);
  assert.equal(doc.querySelector('#run').disabled,false);
  doc.querySelector('#run').click();assert.match(doc.querySelector('#status').textContent,/Preparing/);
});

test('a fresh-session intro is entered and reduced motion gets an actionable explanation',async t=>{
  const origin=await serverFixture(t),html=await (await fetch(origin)).text();
  const {doc,win}=pageFixture(t,html,origin);
  doc.querySelector('#run').click();
  const frame=doc.querySelector('iframe'),preview=frame.contentDocument;
  preview.open();
  preview.write('<body><main id="main" data-transition="idle" data-camera-motion="idle" data-motion="reduced"></main><dialog id="portfolio-intro" open><button id="intro-enter">Enter</button></dialog></body>');
  preview.close();
  let entered=false;
  preview.querySelector('button').onclick=()=>{entered=true;preview.querySelector('dialog').open=false;};
  frame.dispatchEvent(new win.Event('load'));await flush();
  assert.equal(entered,true);
  assert.match(doc.querySelector('#status').textContent,/Select Full motion/);
  assert.equal(doc.querySelector('#run').disabled,false);
});
