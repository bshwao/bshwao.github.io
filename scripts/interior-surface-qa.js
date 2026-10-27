import { createSpatialScene } from '../assets/scene-3d.js';
import { sections } from '../assets/tower-geometry.js';
import { floorContent } from '../assets/floor-content.js';

// Local inspection controls use the existing scene and keyboard orbit handler.
// No additional camera mode or production navigation behavior is introduced.
const stage=document.querySelector('#stage'),view=document.querySelector('#view');
const status=document.querySelector('#status'),metrics=document.querySelector('#metrics');
const previous=document.querySelector('#previous'),next=document.querySelector('#next'),animate=document.querySelector('#animate');
const views=sections.flatMap(section=>[
  {section:section.id,room:null,angle:0,label:`${section.name} · whole floor`},
  ...floorContent[section.id].rooms.flatMap((room,index)=>Array.from({length:4},(_,angle)=>({section:section.id,room:index,angle,label:`${section.name} / ${room.name} · angle ${angle+1}`}))),
]);
for(const [index,item] of views.entries())view.add(new Option(`${index+1}. ${item.label}`,String(index)));
let latest,frames=0,current=0,spatial,busy=false;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report=[];
async function settled(){
  for(let i=0;i<200;i++){
    const held=frames;await delay(35);
    if(latest&&!latest.moving&&held===frames)return;
  }
  throw new Error('Scene did not settle');
}
function lock(value){busy=value;view.disabled=value;previous.disabled=value||current===0;next.disabled=value||current===views.length-1;animate.disabled=value||views[current].room===null;document.body.dataset.ready=String(!value);}
function record(){
  const item=views[current],row={index:current,...item,azimuth:latest.azimuth,polar:latest.polar,...spatial.metrics()};
  report.push(row);status.textContent=`${current+1} / ${views.length} · ${item.label}`;
  metrics.textContent=JSON.stringify({section:item.section,room:item.room,angle:item.angle+1,azimuth:row.azimuth,polar:row.polar,draws:row.calls,triangles:row.triangles,geometries:row.geometries},null,2);
  document.body.dataset.view=String(current);
}
async function show(index){
  if(busy)return;current=Math.max(0,Math.min(views.length-1,index));lock(true);view.value=String(current);
  try{
    const item=views[current];spatial.goTo('section',item.section,{instant:true,roomIndex:item.room});await settled();
    const desired=-.65-item.angle*Math.PI/2;
    const delta=Math.atan2(Math.sin(desired-latest.azimuth),Math.cos(desired-latest.azimuth));
    const steps=Math.round(delta/.13),canvas=stage.querySelector('canvas');
    for(let i=0;i<Math.abs(steps);i++)canvas.dispatchEvent(new KeyboardEvent('keydown',{key:steps<0?'ArrowLeft':'ArrowRight',bubbles:true}));
    await settled();
    // Refit at the reviewed azimuth so the whole composition stays in frame.
    spatial.goTo('section',item.section,{instant:true,roomIndex:item.room});await settled();
    record();lock(false);
  }catch(error){document.querySelector('#error').textContent=error.stack;status.textContent='FAIL';lock(false);}
}
previous.addEventListener('click',()=>show(current-1));next.addEventListener('click',()=>show(current+1));view.addEventListener('change',()=>show(Number(view.value)));
animate.addEventListener('click',async()=>{
  if(busy)return;lock(true);
  const item=views[current];
  for(const object of spatial.objectsForRoom(item.section,item.room))spatial.activateObject(object.id,{notify:false});
  await settled();record();lock(false);
});
try{
  spatial=createSpatialScene({container:stage,clock:()=>new Date(2026,9,27,10,0,0),preferences:{motion:'full'},onFrame(state){latest=state;frames++;}});
  await settled();await show(0);
}catch(error){document.querySelector('#error').textContent=error.stack;status.textContent='FAIL';}
