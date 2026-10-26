import { penthouseTracks } from './penthouse-tracks.js';

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const visualizerStyles=['spectrum','waveform','orbit','constellation'];
export const formatAudioTime=value=>Number.isFinite(value)?`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`:'0:00';

/** One audio element and one analyser graph shared by compact/expanded views. */
export function createMusicEngine({document:doc=document,contextFactory=()=>new (window.AudioContext||window.webkitAudioContext)()}={}){
  const audio=doc.createElement('audio');audio.preload='none';audio.loop=true;
  let tracks=penthouseTracks.map(track=>({...track})),index=0,volume=.55,style='spectrum',error='',disposed=false;
  let context=null,source=null,analyser=null,master=null,ambient=null,ambientType='off',ambientRevision=0,graphFailed=false;
  const listeners=new Set(),urls=new Set(),events=new (doc.defaultView?.AbortController||AbortController)();
  audio.src=tracks[0].src;audio.volume=volume;
  const trackDuration=()=>Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:tracks[index].duration||0;
  const state=()=>({tracks:tracks.map(({file,...track})=>({...track})),index,track:{...tracks[index]},playing:!audio.paused,
    volume,style,error,ambient:ambientType,currentTime:audio.currentTime||0,duration:trackDuration(),loop:audio.loop,signalAvailable:Boolean(analyser)});
  const emit=()=>{if(!disposed)for(const listener of listeners)listener(state());};
  function graph(){
    if(context)return context;
    if(graphFailed){error='Audio visualization is unavailable in this browser. Playback still works.';return null;}
    try{
      context=contextFactory();source=context.createMediaElementSource(audio);analyser=context.createAnalyser();
      analyser.fftSize=2048;analyser.smoothingTimeConstant=.78;master=context.createGain();master.gain.value=volume;
      source.connect(analyser);analyser.connect(master);master.connect(context.destination);audio.volume=1;
    }catch{void context?.close().catch(()=>{});context=null;source=null;analyser=null;master=null;graphFailed=true;error='Audio visualization is unavailable in this browser. Playback still works.';}
    return context;
  }
  for(const type of ['play','pause','timeupdate','durationchange','loadedmetadata','ended'])audio.addEventListener(type,emit,{signal:events.signal});
  audio.addEventListener('error',()=>{error='This audio could not be played. Try another WAV, MP3, Ogg or M4A file.';emit();},{signal:events.signal});
  async function play(){
    if(disposed)return;error='';const ctx=graph();
    try{await Promise.all([ctx?.resume(),audio.play()]);}catch{error='Playback could not start. Press Play again or choose another track.';}
    emit();
  }
  function select(next){
    if(!Number.isInteger(next)||!tracks[next])return;
    const resume=!audio.paused;if(resume)audio.pause();index=next;audio.src=tracks[index].src;error='';
    if(resume)void play();emit();
  }
  function stopAmbient(){ambientRevision++;if(ambient){for(const node of ambient){try{node.stop?.();node.disconnect();}catch{}}ambient=null;}ambientType='off';}
  async function setAmbient(type){
    if(disposed)return;
    stopAmbient();if(!['rain','city'].includes(type)){emit();return;}
    const revision=ambientRevision,ctx=graph();if(!ctx){emit();return;}
    try{
      await ctx.resume();if(disposed||revision!==ambientRevision)return;
      const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),data=buffer.getChannelData(0);let seed=78123,last=0;
      for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/2147483648-1;last=last*.8+white*.2;data[i]=type==='rain'?white*.65+last*.35:last;}
      const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      noise.buffer=buffer;noise.loop=true;filter.type='lowpass';filter.frequency.value=type==='rain'?4200:380;gain.gain.value=type==='rain'?.035:.06;
      noise.connect(filter);filter.connect(gain);gain.connect(ctx.destination);noise.start();ambient=[noise,filter,gain];ambientType=type;emit();
    }catch{error='Ambient sound is unavailable. Music and the room controls remain usable.';emit();}
  }
  return {
    state,subscribe(listener){listeners.add(listener);listener(state());return()=>listeners.delete(listener);},
    play,pause(){if(!audio.paused)audio.pause();emit();},toggle(){return audio.paused?play():(audio.pause(),emit());},
    select,next(direction=1){select((index+direction+tracks.length)%tracks.length);},
    seek(value){if(trackDuration())try{audio.currentTime=Math.max(0,Math.min(trackDuration(),Number(value)||0));}catch{/* Metadata may still be loading. */}emit();},
    setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));if(master)master.gain.value=volume;else audio.volume=volume;emit();},
    setLoop(value){audio.loop=Boolean(value);emit();},
    setStyle(value){if(visualizerStyles.includes(value))style=value;emit();},
    signal(){const frequencies=new Uint8Array(analyser?.frequencyBinCount||1024),waveform=new Uint8Array(analyser?.fftSize||2048).fill(128);analyser?.getByteFrequencyData(frequencies);analyser?.getByteTimeDomainData(waveform);return {frequencies,waveform};},
    addFiles(files){
      if(disposed)return 0;
      const accepted=[...files].filter(file=>/^audio\//.test(file.type)||/\.(mp3|wav|ogg|m4a|flac|aac|webm)$/i.test(file.name));
      let added=0;
      for(const file of accepted){
        if(file.size>100*1024*1024||tracks.length>=15)continue;
        const src=URL.createObjectURL(file);urls.add(src);tracks.push({id:`local-${Date.now()}-${tracks.length}`,title:file.name,subtitle:'Your audio · stays on this device',src,local:true});added++;
      }
      error=added?'': 'Choose an audio file under 100 MB (up to 12 local tracks).';
      if(added)select(tracks.length-added);emit();return added;
    },
    setAmbient,
    stop(){if(!audio.paused)audio.pause();stopAmbient();emit();},
    dispose(){if(disposed)return;disposed=true;if(!audio.paused)audio.pause();stopAmbient();events.abort();source?.disconnect();analyser?.disconnect();master?.disconnect();void context?.close().catch(()=>{});audio.removeAttribute('src');for(const url of urls)URL.revokeObjectURL(url);urls.clear();listeners.clear();},
  };
}

export function signalMetrics({frequencies,waveform}){
  const rms=Math.sqrt(waveform.reduce((sum,value)=>sum+((value-128)/128)**2,0)/Math.max(1,waveform.length));
  return {rms,bass:frequencies.slice(1,18).reduce((a,b)=>a+b,0)/(17*255),peak:Math.max(...frequencies)/255};
}

export function musicPlayerMarkup({expanded=false,id='penthouse-player'}={}){
  return `<section class="penthouse-player ${expanded?'is-expanded':''}" aria-label="Music player">
    <div class="music-heading"><div><h4 data-music-title>Window Light</h4><p data-music-subtitle>Original lofi · CC0</p></div>${expanded?'':'<button type="button" data-music-expand aria-label="Expand music visualizer">Expand ↗</button>'}</div>
    <div class="music-art"><canvas data-music-canvas role="img" aria-label="Audio-reactive music visualization"></canvas></div>
    <label class="music-select" for="${id}-track">Track<select id="${id}-track" data-music-track>${penthouseTracks.map((track,index)=>`<option value="${index}">${escape(track.title)}</option>`).join('')}</select></label>
    <div class="music-transport"><button type="button" data-music-prev aria-label="Previous track">↤</button><button class="music-play" type="button" data-music-play aria-label="Play music">Play ▶</button><button type="button" data-music-next aria-label="Next track">↦</button><label class="music-loop"><input type="checkbox" data-music-loop checked> Loop</label></div>
    <div class="music-timeline"><span data-music-elapsed>0:00</span><input type="range" min="0" max="1" value="0" step=".1" data-music-seek aria-label="Seek through track" disabled><span data-music-duration>0:00</span></div>
    <div class="music-options"><label for="${id}-style">Visual style<select id="${id}-style" data-music-style>${visualizerStyles.map(style=>`<option value="${style}">${style[0].toUpperCase()+style.slice(1)}</option>`).join('')}</select></label><label for="${id}-volume">Volume<input id="${id}-volume" type="range" min="0" max="1" step=".01" value=".55" data-music-volume></label></div>
    <label class="music-drop" for="${id}-file">Drop your audio here <span>or choose files · kept on this device</span><input id="${id}-file" data-music-file type="file" accept="audio/*,.flac,.m4a,.ogg" multiple></label>
    <p class="music-status" data-music-status role="status"></p><p class="music-credit">Included tracks are original synthesized compositions. <a href="./assets/audio/penthouse/LICENSE.md" target="_blank" rel="noopener">CC0 / credits ↗</a></p>
  </section>`;
}

export function createMusicVisualizer(canvas,engine,{reducedMotion=()=>false}={}){
  let context=null,frame=0,last=0,disposed=false,samples=0,width=0,height=0,shown=false,contextTried=false,enabled=true;
  function size(){const box=canvas.getBoundingClientRect();width=box.width;height=box.height;shown=enabled&&width>0&&height>0&&(!canvas.closest('dialog')||canvas.closest('dialog').open);const ratio=Math.min(window.devicePixelRatio||1,1.5,Math.sqrt(1200000/Math.max(1,width*height)));const nextWidth=Math.max(1,Math.round(width*ratio)),nextHeight=Math.max(1,Math.round(height*ratio));if(canvas.width!==nextWidth||canvas.height!==nextHeight){canvas.width=nextWidth;canvas.height=nextHeight;}context?.setTransform(ratio,0,0,ratio,0,0);}
  function draw(){
    if(!contextTried&&engine.state().signalAvailable){contextTried=true;try{context=canvas.getContext('2d');size();}catch{}}
    if(!context||!width||!height)return;
    const signal=engine.signal(),levels=signalMetrics(signal),ctx=context,w=width,h=height;
    const gradient=ctx.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#70c6b6');gradient.addColorStop(.55,'#f0bd79');gradient.addColorStop(1,'#ca7d87');
    ctx.fillStyle='#111e25';ctx.fillRect(0,0,w,h);ctx.strokeStyle=gradient;ctx.fillStyle=gradient;ctx.lineWidth=2;
    const value=i=>signal.frequencies[Math.min(signal.frequencies.length-1,Math.round(2**(i/63*9)))]/255;
    const style=engine.state().style;
    if(style==='spectrum')for(let i=0;i<48;i++){const x=w*.05+i*w*.9/48,y=value(i*63/47)**1.2*h*.76;ctx.fillRect(x,h*.88-y,w*.9/48*.68,Math.max(2,y));}
    if(style==='waveform'){
      ctx.beginPath();for(let i=0;i<512;i++){const x=i/511*w,y=h*.5+(signal.waveform[i*4]-128)/128*h*.42;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
      ctx.globalAlpha=.12;ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
    }
    if(style==='orbit'||style==='constellation'){
      const radius=Math.min(w,h)*(.19+Math.min(levels.rms,.5)*.22),cx=w/2,cy=h/2;
      ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
      for(let i=0;i<64;i++){
        const angle=i/64*Math.PI*2-Math.PI/2,amplitude=value(i),outer=radius+amplitude*Math.min(w,h)*.16;
        const x=cx+Math.cos(angle)*outer,y=cy+Math.sin(angle)*outer;
        if(style==='orbit'){ctx.beginPath();ctx.moveTo(cx+Math.cos(angle)*radius,cy+Math.sin(angle)*radius);ctx.lineTo(x,y);ctx.stroke();}
        else{ctx.beginPath();ctx.arc(x,y,1.5+amplitude*4,0,Math.PI*2);ctx.fill();if(i%4===0){ctx.globalAlpha=.25;ctx.beginPath();ctx.moveTo(x,y);const a=(i+7)/64*Math.PI*2-Math.PI/2;ctx.lineTo(cx+Math.cos(a)*radius,cy+Math.sin(a)*radius);ctx.stroke();ctx.globalAlpha=1;}}
      }
    }
    canvas.dataset.signalEnergy=levels.rms.toFixed(5);canvas.dataset.visualStyle=style;canvas.dataset.signalFrames=String(++samples);
  }
  function tick(time){frame=0;if(disposed||document.hidden||!shown||!engine.state().playing||!canvas.isConnected||!context)return;if(!reducedMotion()||time-last>=120){draw();last=time;}frame=requestAnimationFrame(tick);}
  function refresh(){cancelAnimationFrame(frame);frame=0;if(disposed)return;size();if(shown)draw();if(shown&&context&&engine.state().playing&&!document.hidden&&canvas.isConnected)frame=requestAnimationFrame(tick);}
  const observer=new ResizeObserver(refresh);observer.observe(canvas);const unsubscribe=engine.subscribe(refresh);
  document.addEventListener('visibilitychange',refresh);
  return {refresh,setActive(value){enabled=Boolean(value);refresh();},dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();unsubscribe();document.removeEventListener('visibilitychange',refresh);}};
}

export function createMusicPlayer(container,engine,{onExpand=()=>{},reducedMotion=()=>false}={}){
  const root=container.matches?.('.penthouse-player')?container:container.querySelector('.penthouse-player');
  if(!root)return {dispose(){},refresh(){}};
  const events=new window.AbortController(),options={signal:events.signal},$=selector=>root.querySelector(selector);
  let optionCount=-1;
  const visualizer=createMusicVisualizer($('[data-music-canvas]'),engine,{reducedMotion});
  const unsubscribe=engine.subscribe(state=>{
    $('[data-music-title]').textContent=state.track.title;$('[data-music-subtitle]').textContent=state.track.subtitle;
    $('[data-music-play]').textContent=state.playing?'Pause Ⅱ':'Play ▶';$('[data-music-play]').setAttribute('aria-label',state.playing?'Pause music':'Play music');
    $('[data-music-status]').textContent=state.error;$('[data-music-elapsed]').textContent=formatAudioTime(state.currentTime);$('[data-music-duration]').textContent=formatAudioTime(state.duration);
    const seek=$('[data-music-seek]');seek.max=String(state.duration||1);seek.value=String(state.currentTime);seek.disabled=!state.duration;
    $('[data-music-volume]').value=String(state.volume);$('[data-music-loop]').checked=state.loop;$('[data-music-style]').value=state.style;
    const select=$('[data-music-track]');
    if(optionCount!==state.tracks.length){select.replaceChildren(...state.tracks.map((track,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=track.title;return option;}));optionCount=state.tracks.length;}
    select.value=String(state.index);
  });
  root.addEventListener('click',event=>{if(event.target.closest('[data-music-play]'))void engine.toggle();if(event.target.closest('[data-music-prev]'))engine.next(-1);if(event.target.closest('[data-music-next]'))engine.next();if(event.target.closest('[data-music-expand]'))onExpand();},options);
  root.addEventListener('change',event=>{const node=event.target;if(node.matches('[data-music-track]'))engine.select(Number(node.value));if(node.matches('[data-music-style]'))engine.setStyle(node.value);if(node.matches('[data-music-loop]'))engine.setLoop(node.checked);if(node.matches('[data-music-file]'))engine.addFiles(node.files);},options);
  root.addEventListener('input',event=>{if(event.target.matches('[data-music-volume]'))engine.setVolume(event.target.value);if(event.target.matches('[data-music-seek]'))engine.seek(event.target.value);},options);
  const drop=$('.music-drop');drop.addEventListener('dragover',event=>{event.preventDefault();drop.dataset.dragging='true';},options);
  drop.addEventListener('dragleave',()=>delete drop.dataset.dragging,options);
  drop.addEventListener('drop',event=>{event.preventDefault();delete drop.dataset.dragging;engine.addFiles(event.dataTransfer.files);},options);
  return {refresh:visualizer.refresh,setActive:visualizer.setActive,dispose(){events.abort();unsubscribe();visualizer.dispose();}};
}
