import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createMusicEngine, signalMetrics, visualizerStyles, formatAudioTime, musicPlayerMarkup } from '../assets/penthouse-music.js';
import { penthouseTracks } from '../assets/penthouse-tracks.js';

function fixture({contextFailure=false,gainFailure=false}={}) {
  const dom=new JSDOM('<main></main>',{url:'https://portfolio.test/'}),document=dom.window.document;
  const nativeCreate=document.createElement.bind(document),audio=nativeCreate('audio');
  let paused=true,duration=NaN,playCalls=0,pauseCalls=0,contextCalls=0,playFailure=false;
  Object.defineProperties(audio,{paused:{get:()=>paused},duration:{get:()=>duration}});
  audio.play=async()=>{playCalls++;if(playFailure)throw Error('Playback blocked');paused=false;audio.dispatchEvent(new dom.window.Event('play'));};
  audio.pause=()=>{pauseCalls++;paused=true;audio.dispatchEvent(new dom.window.Event('pause'));};
  document.createElement=(name,...args)=>name.toLowerCase()==='audio'?audio:nativeCreate(name,...args);
  const nodes=[],buffers=[],noises=[],filters=[],gains=[];
  function node(kind) {
    const value={kind,connections:[],disconnects:0,connect(target){this.connections.push(target);return target;},disconnect(){this.disconnects++;}};
    nodes.push(value);return value;
  }
  const source=node('media'),analyser=node('analyser');
  analyser.fftSize=2048;analyser.frequencyValue=64;analyser.waveValue=160;
  Object.defineProperty(analyser,'frequencyBinCount',{get(){return this.fftSize/2;}});
  analyser.getByteFrequencyData=values=>values.fill(analyser.frequencyValue);
  analyser.getByteTimeDomainData=values=>values.fill(analyser.waveValue);
  const context={
    sampleRate:100,destination:node('destination'),resumes:0,closes:0,mediaElements:[],resumeHook:null,
    createMediaElementSource(element){this.mediaElements.push(element);return source;},
    createAnalyser(){return analyser;},
    createGain(){if(gainFailure)throw Error('Unsupported gain');const gain=node('gain');gain.gain={value:0};gains.push(gain);return gain;},
    createBiquadFilter(){const filter=node('filter');filter.frequency={value:0};filters.push(filter);return filter;},
    createBuffer(channels,length,sampleRate){const data=new Float32Array(length),buffer={channels,length,sampleRate,data,getChannelData(channel){assert.equal(channel,0);return data;}};buffers.push(buffer);return buffer;},
    createBufferSource(){const noise=node('noise');noise.starts=0;noise.stops=0;noise.start=()=>noise.starts++;noise.stop=()=>noise.stops++;noises.push(noise);return noise;},
    resume(){this.resumes++;return this.resumeHook?this.resumeHook():Promise.resolve();},
    close(){this.closes++;return Promise.resolve();},
  };
  const engine=createMusicEngine({document,contextFactory(){contextCalls++;if(contextFailure)throw Error('Unsupported audio context');return context;}});
  return {dom,document,audio,engine,context,source,analyser,nodes,buffers,noises,filters,gains,
    get contextCalls(){return contextCalls;},get playCalls(){return playCalls;},get pauseCalls(){return pauseCalls;},
    setDuration(value){duration=value;audio.dispatchEvent(new dom.window.Event('durationchange'));},
    setPlayFailure(value){playFailure=value;},
    close(){engine.dispose();dom.window.close();},
  };
}

test('creation and subscriptions never autoplay or create an AudioContext',async()=>{
  const app=fixture();
  try {
    const snapshots=[],unsubscribe=app.engine.subscribe(state=>snapshots.push(state));
    assert.equal(app.contextCalls,0);assert.equal(app.playCalls,0);assert.equal(app.audio.preload,'none');
    assert.equal(app.audio.autoplay,false);assert.equal(app.engine.state().playing,false);assert.equal(snapshots.length,1);
    assert.equal(app.engine.state().duration,40,'authored track duration is available before audio downloads');
    assert.equal(app.engine.state().tracks.length,penthouseTracks.length);assert.equal(app.engine.state().signalAvailable,false);
    const signal=app.engine.signal();assert.ok(signal.frequencies.every(value=>value===0));assert.ok(signal.waveform.every(value=>value===128));
    app.engine.pause();app.engine.setVolume(.4);await app.engine.setAmbient('off');
    assert.equal(app.contextCalls,0);assert.equal(app.playCalls,0);
    const count=snapshots.length;unsubscribe();app.engine.setLoop(false);assert.equal(snapshots.length,count);
    const copy=app.engine.state();copy.tracks[0].title='Changed';assert.equal(app.engine.state().tracks[0].title,penthouseTracks[0].title);
  } finally {app.close();}
});

test('explicit play builds one shared graph and returns the analyser’s actual signal',async()=>{
  const app=fixture();
  try {
    await app.engine.play();
    assert.equal(app.contextCalls,1);assert.equal(app.playCalls,1);assert.equal(app.engine.state().playing,true);
    assert.deepEqual(app.context.mediaElements,[app.audio]);assert.equal(app.source.connections[0],app.analyser);
    assert.equal(app.analyser.connections[0],app.gains[0]);assert.equal(app.gains[0].connections[0],app.context.destination);
    assert.equal(app.analyser.fftSize,2048);assert.equal(app.audio.volume,1);assert.equal(app.gains[0].gain.value,.55);
    const signal=app.engine.signal();assert.equal(signal.frequencies.length,1024);assert.equal(signal.waveform.length,2048);
    assert.ok(signal.frequencies.every(value=>value===64));assert.ok(signal.waveform.every(value=>value===160));
    const levels=signalMetrics(signal);assert.equal(levels.rms,.25);assert.equal(levels.peak,64/255);assert.equal(levels.bass,64/255);
    app.analyser.frequencyValue=255;app.analyser.waveValue=128;
    assert.deepEqual(signalMetrics(app.engine.signal()),{rms:0,bass:1,peak:1});
    app.engine.pause();await app.engine.play();assert.equal(app.contextCalls,1);assert.equal(app.context.mediaElements.length,1);
    app.engine.setVolume(2);assert.equal(app.gains[0].gain.value,1);app.engine.setVolume(-1);assert.equal(app.gains[0].gain.value,0);
  } finally {app.close();}
});

test('transport preserves playback through track changes and validates timeline, loop, and visual styles',async()=>{
  const app=fixture();
  try {
    app.engine.select(1);assert.equal(app.engine.state().index,1);assert.equal(app.playCalls,0);
    app.engine.next(-1);assert.equal(app.engine.state().index,0);app.engine.next(-1);assert.equal(app.engine.state().index,penthouseTracks.length-1);
    for(const index of [-1,999,1.4,NaN])app.engine.select(index);
    assert.equal(app.engine.state().index,penthouseTracks.length-1);
    await app.engine.toggle();assert.equal(app.engine.state().playing,true);
    app.engine.select(0);await Promise.resolve();assert.equal(app.engine.state().playing,true);assert.ok(app.pauseCalls>0);
    app.engine.toggle();assert.equal(app.engine.state().playing,false);
    app.setDuration(120);app.engine.seek(900);assert.equal(app.engine.state().currentTime,120);
    app.engine.seek(-8);assert.equal(app.engine.state().currentTime,0);app.engine.seek('37.5');assert.equal(app.engine.state().currentTime,37.5);
    app.setDuration(NaN);app.engine.seek(70);assert.equal(app.engine.state().currentTime,40);assert.equal(app.engine.state().duration,40);
    app.engine.setLoop(false);assert.equal(app.audio.loop,false);app.engine.setLoop(true);assert.equal(app.audio.loop,true);
    for(const style of visualizerStyles){app.engine.setStyle(style);assert.equal(app.engine.state().style,style);}
    app.engine.setStyle('arbitrary');assert.equal(app.engine.state().style,visualizerStyles.at(-1));
    assert.equal(formatAudioTime(65.9),'1:05');assert.equal(formatAudioTime(NaN),'0:00');
  } finally {app.close();}
});

test('blocked playback remains recoverable and unsupported visualization retains usable audio',async()=>{
  const blocked=fixture();
  try {
    blocked.setPlayFailure(true);await blocked.engine.play();assert.equal(blocked.engine.state().playing,false);
    assert.match(blocked.engine.state().error,/could not start/);
    blocked.setPlayFailure(false);await blocked.engine.play();assert.equal(blocked.engine.state().playing,true);assert.equal(blocked.engine.state().error,'');
  } finally {blocked.close();}
  const unsupported=fixture({contextFailure:true});
  try {
    await unsupported.engine.play();assert.equal(unsupported.engine.state().playing,true);assert.equal(unsupported.engine.state().signalAvailable,false);
    assert.match(unsupported.engine.state().error,/visualization is unavailable/);
    unsupported.engine.pause();await unsupported.engine.play();assert.equal(unsupported.contextCalls,1);
    assert.match(unsupported.engine.state().error,/visualization is unavailable/,'A persistent missing graph must retain its explanation');
    unsupported.engine.setVolume(.3);assert.equal(unsupported.audio.volume,.3);
  } finally {unsupported.close();}
});

test('a partial graph failure never reports an available analyser',async()=>{
  const app=fixture({gainFailure:true});
  try {
    await app.engine.play();assert.equal(app.engine.state().playing,true);
    assert.equal(app.engine.state().signalAvailable,false);assert.equal(app.context.closes,1);
    const signal=app.engine.signal();assert.ok(signal.frequencies.every(value=>value===0));assert.ok(signal.waveform.every(value=>value===128));
  } finally {app.close();}
});

test('local audio accepts MIME or known extensions, enforces size/count limits, and revokes only owned ObjectURLs',t=>{
  const app=fixture(),created=[],revoked=[];
  t.mock.method(URL,'createObjectURL',file=>{const url=`blob:local-${created.length}`;created.push({file,url});return url;});
  t.mock.method(URL,'revokeObjectURL',url=>revoked.push(url));
  const file=(name,type='',size=64)=>({name,type,size});
  try {
    const name='<img src=x onerror=alert(1)>.wav';
    assert.equal(app.engine.addFiles([file(name),file('custom.bin','audio/mpeg'),file('notes.txt','text/plain'),file('oversized.mp3','audio/mpeg',100*1024*1024+1)]),2);
    assert.equal(created.length,2);assert.equal(app.engine.state().track.title,name);assert.equal(app.engine.state().track.local,true);
    assert.equal(app.contextCalls,0);assert.equal(app.playCalls,0);assert.equal(app.engine.state().playing,false);
    assert.ok(app.engine.state().track.src.startsWith('blob:'));
    const more=Array.from({length:20},(_,index)=>file(`Track ${index}.MP3`));
    assert.equal(app.engine.addFiles(more),10);assert.equal(app.engine.state().tracks.length,15);assert.equal(created.length,12);
    assert.equal(app.engine.addFiles([file('extra.ogg')]),0);assert.equal(created.length,12);assert.match(app.engine.state().error,/100 MB/);
    app.engine.dispose();assert.deepEqual(revoked,created.map(item=>item.url));assert.equal(app.audio.hasAttribute('src'),false);
    app.engine.dispose();assert.equal(revoked.length,12,'Repeated disposal must not revoke a resource twice');
    assert.equal(app.engine.addFiles([file('after-dispose.wav')]),0);assert.equal(created.length,12,'Disposed engines must not allocate local file URLs');
  } finally {app.close();}
});

test('ambient sound starts only on request, changes timbre, and disconnects on room stop',async()=>{
  const app=fixture();
  try {
    assert.equal(app.noises.length,0);await app.engine.setAmbient('rain');
    assert.equal(app.contextCalls,1);assert.equal(app.playCalls,0);assert.equal(app.engine.state().ambient,'rain');
    assert.equal(app.noises[0].starts,1);assert.equal(app.noises[0].loop,true);assert.equal(app.filters[0].frequency.value,4200);
    assert.equal(app.noises[0].connections[0],app.filters[0]);assert.equal(app.filters[0].connections[0],app.gains[1]);
    assert.equal(app.gains[1].connections[0],app.context.destination);
    assert.ok(app.buffers[0].data.some(value=>value>0));assert.ok(app.buffers[0].data.some(value=>value<0));
    await app.engine.setAmbient('city');assert.equal(app.engine.state().ambient,'city');assert.equal(app.filters[1].frequency.value,380);
    assert.equal(app.noises[0].stops,1);assert.equal(app.noises[0].disconnects,1);
    await app.engine.play();app.engine.stop();assert.equal(app.engine.state().playing,false);assert.equal(app.engine.state().ambient,'off');
    assert.equal(app.noises[1].stops,1);assert.equal(app.filters[1].disconnects,1);assert.equal(app.gains[2].disconnects,1);
    assert.equal(app.context.closes,0,'Room stop retains the graph for a later explicit Play');
  } finally {app.close();}
});

test('pending ambient resumes cannot start stale sounds after replacement or disposal',async()=>{
  const app=fixture(),pending=[];
  try {
    app.context.resumeHook=()=>new Promise(resolve=>pending.push(resolve));
    const rain=app.engine.setAmbient('rain'),city=app.engine.setAmbient('city');
    assert.equal(app.noises.length,0);pending.shift()();await rain;assert.equal(app.noises.length,0);
    pending.shift()();await city;assert.equal(app.noises.length,1);assert.equal(app.engine.state().ambient,'city');
    const late=app.engine.setAmbient('rain');app.engine.dispose();pending.shift()();await late;
    assert.equal(app.noises.length,1);assert.equal(app.noises[0].stops,1);
    const resumes=app.context.resumes;await app.engine.setAmbient('city');
    assert.equal(app.context.resumes,resumes,'Disposed engines must not resume an audio context');
  } finally {app.close();}
});

test('dispose detaches audio events and closes/disconnects the graph once',async()=>{
  const app=fixture();
  try {
    const snapshots=[];app.engine.subscribe(state=>snapshots.push(state));await app.engine.play();await app.engine.setAmbient('rain');
    app.engine.dispose();const count=snapshots.length;app.audio.dispatchEvent(new app.dom.window.Event('timeupdate'));
    await app.engine.play();assert.equal(snapshots.length,count);assert.equal(app.engine.state().playing,false);
    assert.equal(app.context.closes,1);assert.equal(app.source.disconnects,1);assert.equal(app.analyser.disconnects,1);assert.equal(app.gains[0].disconnects,1);
    app.engine.dispose();assert.equal(app.context.closes,1);assert.equal(app.source.disconnects,1);
  } finally {app.close();}
});

test('compact and expanded music markup expose labels and unique control IDs',()=>{
  const dom=new JSDOM(musicPlayerMarkup({id:'compact'})+musicPlayerMarkup({id:'expanded',expanded:true}));
  try {
    const document=dom.window.document,ids=[...document.querySelectorAll('[id]')].map(node=>node.id);
    assert.equal(new Set(ids).size,ids.length);assert.equal(document.querySelectorAll('dialog').length,0);
    assert.equal(document.querySelectorAll('[data-music-expand]').length,1);
    for(const input of document.querySelectorAll('input,select'))assert.ok(input.labels.length>0||input.hasAttribute('aria-label'));
    for(const player of document.querySelectorAll('.penthouse-player'))assert.equal(player.querySelectorAll('[data-music-style] option').length,4);
    assert.equal(document.querySelector('[data-music-seek]').disabled,true);
  } finally {dom.window.close();}
});
