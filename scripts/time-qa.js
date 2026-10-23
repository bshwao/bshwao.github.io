import {createSpatialScene} from '../assets/scene-3d.js';

const select=document.querySelector('#hour'),stage=document.querySelector('#stage'),status=document.querySelector('#status'),output=document.querySelector('#results');
const params=new URLSearchParams(location.search);if(params.has('hour'))select.value=params.get('hour');
const clock=()=>{const date=new Date();if(select.value!=='live')date.setHours(Number(select.value),0,0,0);return date;};
let scene;
scene=createSpatialScene({container:stage,clock,onFrame(state){
  stage.dataset.motion=state.moving?'moving':'idle';
  const metrics=scene?.metrics();
  if(metrics){status.textContent=`READY · ${state.timeOfDay} · local ${state.localHour.toFixed(2)} · ${metrics.calls} draws · ${metrics.geometries} geometries · ${metrics.textures} textures`;output.textContent=JSON.stringify(metrics);}
}});
select.addEventListener('change',()=>scene.refreshTime());
for(const mode of ['tower','explore','projects'])document.querySelector(`#${mode}`).addEventListener('click',()=>scene.goTo(mode==='projects'?'section':mode,mode==='projects'?'projects':null,{instant:true}));
document.querySelector('#room').addEventListener('click',()=>scene.goTo('section','projects',{instant:true,onComplete:()=>scene.focusRoom(1,{instant:true})}));
document.querySelector('#reset').addEventListener('click',()=>scene.reset());
addEventListener('pagehide',()=>scene.dispose(),{once:true});
