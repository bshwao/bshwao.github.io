import { createSpatialScene } from '../assets/scene-3d.js';
const studies=[];
for(const id of ['baked','mapped']) {
  const spatial=createSpatialScene({container:document.getElementById(id),shadowComparison:id==='mapped',onFrame(state){
    if(!state.moving)setTimeout(()=>{
      document.getElementById(id+'-result').textContent=JSON.stringify(spatial.metrics(),null,2);
      if(studies.length===2&&studies.every(s=>s.metrics().calls>0))document.getElementById('status').textContent='READY — both production scenes rendered';
    },40);
  }});
  studies.push(spatial);
}
document.getElementById('dispose').addEventListener('click',()=>{
  studies.forEach(s=>s.dispose());document.getElementById('status').textContent=studies.every(s=>s.metrics().geometries===0)?'PASS — both studies disposed':'FAIL — resources retained';
});
