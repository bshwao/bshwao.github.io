// Browser sharing artwork: the finished production city and fixed HTML
// typography. Open social-preview.html and capture at exactly 1280 × 720.
import { createSpatialScene } from '../assets/scene-3d.js';
createSpatialScene({container:document.querySelector('#city'),onFrame(state){
  if(!state.moving)document.querySelector('#status').textContent='READY — production skyline sharing artwork';
}});
