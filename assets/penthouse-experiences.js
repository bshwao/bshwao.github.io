import { createMusicEngine,musicPlayerMarkup,createMusicPlayer } from './penthouse-music.js';
import { arcadeMarkup,createArcade } from './penthouse-arcade.js';
import { bedroomMarkup,desktopMarkup,createDesktop } from './penthouse-bedroom.js';
import { starMapMarkup,createStarMap } from './penthouse-star-map.js';
import { atmospherePresets,normalizeAtmosphere } from './penthouse-atmosphere.js';

export function penthouseExperienceMarkup(index){
  if(index===0)return bedroomMarkup();
  if(index===1)return `<section class="penthouse-feature"><h4>The pocket arcade</h4><p>Snake, 2048 and Sudoku. A quick round, or a longer stay.</p><button type="button" data-penthouse-open="arcade">Open the arcade ↗</button></section>`;
  if(index===2)return musicPlayerMarkup({id:'listening-music'});
  return `<section class="penthouse-feature"><h4>A window into the night sky</h4><p>Pan across the stars, trace constellations and get to know the brightest lights. Click the telescope, or open the atlas here.</p><button type="button" data-penthouse-open="sky">Explore the star atlas ↗</button></section>`;
}

/** Persistent activity controllers; room content can be replaced independently. */
export function createPenthouseExperiences({container,onAtmosphere=()=>{},reducedMotion=()=>false}){
  const engine=createMusicEngine(),dialogs=new Map();
  const events=new window.AbortController(),options={signal:events.signal};
  let compact=null,active=false,atmosphere=normalizeAtmosphere(),presetId='',disposed=false;
  function dialogFor(kind){
    if(dialogs.has(kind))return dialogs.get(kind);
    const titles={music:'Watch the sound',arcade:'A little friendly competition',desktop:'The bedroom desktop',sky:'A window into the night sky'};
    const dialog=document.createElement('dialog');dialog.id=`penthouse-${kind}-dialog`;
    dialog.className=`penthouse-dialog${kind==='music'?' penthouse-visualizer-dialog':''}`;
    dialog.setAttribute('aria-labelledby',`${dialog.id}-title`);
    const markup=kind==='music'?musicPlayerMarkup({expanded:true,id:'expanded-music'}):kind==='arcade'?arcadeMarkup():kind==='desktop'?desktopMarkup():starMapMarkup();
    dialog.innerHTML=`<header class="penthouse-dialog-header"><div><p>PENTHOUSE / AFTER HOURS</p><h2 id="${dialog.id}-title">${titles[kind]}</h2></div><button class="penthouse-dialog-close" type="button" aria-label="Close ${kind==='music'?'visualizer':kind}" data-close-experience>×</button></header><div class="penthouse-dialog-body">${markup}</div>`;
    document.body.append(dialog);
    const controller=kind==='music'?createMusicPlayer(dialog,engine,{reducedMotion}):kind==='arcade'?createArcade(dialog):kind==='desktop'?createDesktop(dialog):createStarMap(dialog,{reducedMotion:reducedMotion()});
    const record={dialog,controller,opener:null};dialogs.set(kind,record);
    dialog.querySelector('[data-close-experience]').addEventListener('click',()=>dialog.close(),options);
    dialog.addEventListener('close',()=>{controller.setActive?.(false);compact?.setActive?.(true);if(record.opener?.isConnected)record.opener.focus({preventScroll:true});},options);
    return record;
  }
  function open(kind){
    if(!active||disposed)return;
    for(const [key,{dialog}]of dialogs)if(key!==kind&&dialog.open)dialog.close();
    const record=dialogFor(kind);record.opener=document.activeElement;
    if(!record.dialog.open)record.dialog.showModal();
    compact?.setActive?.(false);
    record.controller.setActive?.(true);record.controller.refresh?.();
  }
  function paintAtmosphere(){
    for(const button of container.querySelectorAll('[data-bedroom-preset]'))button.setAttribute('aria-pressed',String(button.dataset.bedroomPreset===presetId));
    const light=container.querySelector('[data-bedroom-lighting]'),rain=container.querySelector('[data-bedroom-weather]'),sound=container.querySelector('[data-bedroom-ambient]');
    if(light)light.value=atmosphere.hour===null?'local':atmosphere.hour>=19||atmosphere.hour<6?'night':'day';
    if(rain)rain.value=atmosphere.weather;if(sound)sound.value=atmosphere.ambient;
  }
  function applyAtmosphere(next,{sound=true}={}){
    atmosphere=normalizeAtmosphere(next);onAtmosphere(active?atmosphere:null);
    paintAtmosphere();
    if(sound)void engine.setAmbient(active?atmosphere.ambient:'off');
  }
  function mount(sectionId,index){
    const nextActive=sectionId==='penthouse';
    if(active&&!nextActive)engine.stop();
    compact?.dispose();compact=null;
    active=nextActive;
    for(const {dialog}of dialogs.values())if(dialog.open)dialog.close();
    if(!active){onAtmosphere(null);return;}
    compact=createMusicPlayer(container,engine,{onExpand:()=>open('music'),reducedMotion});
    // Returning to the floor restores its appearance without autoplaying sound.
    applyAtmosphere(atmosphere,{sound:false});
  }
  const click=event=>{
    const openButton=event.target.closest('[data-penthouse-open]');if(openButton)open(openButton.dataset.penthouseOpen);
    if(event.target.closest('[data-bedroom-desktop]'))open('desktop');
    const preset=event.target.closest('[data-bedroom-preset]');
    if(preset){const next=atmospherePresets.find(item=>item.id===preset.dataset.bedroomPreset);if(next){presetId=next.id;applyAtmosphere(next);}}
  };
  container.addEventListener('click',click,options);
  container.addEventListener('change',event=>{
    const node=event.target;
    if(node.matches('[data-bedroom-lighting]')){presetId='';const night=node.value==='night';applyAtmosphere({...atmosphere,hour:node.value==='local'?null:night?22:10,brightness:night?.55:1,lamps:night});}
    if(node.matches('[data-bedroom-weather]')){presetId='';applyAtmosphere({...atmosphere,weather:node.value});}
    if(node.matches('[data-bedroom-ambient]')){presetId='';applyAtmosphere({...atmosphere,ambient:node.value});}
  },options);
  return {
    mount,open,
    onObject({sectionId,roomIndex,name}){
      if(sectionId!=='penthouse')return;
      if(roomIndex===3&&name==='Telescope')open('sky');
      if(roomIndex===0&&name==='Bedroom computer monitor')open('desktop');
      if(roomIndex===0&&name==='Bedside lamp')applyAtmosphere({...atmosphere,lamps:!atmosphere.lamps},{sound:false});
      if(roomIndex===1&&/Arcade machine|Game controller|Game console/.test(name))open('arcade');
      if(roomIndex===2&&name==='Vinyl record')open('music');
    },
    dispose(){if(disposed)return;disposed=true;events.abort();compact?.dispose();engine.dispose();for(const {dialog,controller}of dialogs.values()){controller.dispose();if(dialog.open)dialog.close();dialog.remove();}dialogs.clear();},
  };
}
