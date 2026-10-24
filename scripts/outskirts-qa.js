import * as T from '../assets/vendor/three.module.min.js';
import { createTowerModel } from '../assets/tower-model.js';
import { createCityEnvironment } from '../assets/city-environment.js';
import { readCityTime } from '../assets/city-time.js';
const model=createTowerModel(),scene=new T.Scene(),environment=createCityEnvironment();scene.add(model.root,environment.root);
for(const module of model.modules){module.interior.group.visible=false;module.capPlans.group.visible=false;module.caps[0].visible=module.index===4;}
const ambient=new T.HemisphereLight(),sun=new T.DirectionalLight(),fill=new T.DirectionalLight();scene.add(ambient,sun,fill);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.localClippingEnabled=true;document.body.append(renderer.domElement);
const view=document.querySelector('#view'),hour=document.querySelector('#hour'),status=document.querySelector('#status');
function render(){
  const width=innerWidth,height=innerHeight-42,aspect=width/height,time=readCityTime(new Date(2026,9,23,Number(hour.value)));
  renderer.setSize(width,height);ambient.color.set(time.ambient);ambient.groundColor.set('#6f7974');ambient.intensity=time.ambientIntensity;
  sun.color.set(time.keyColor);sun.intensity=time.keyIntensity;sun.position.fromArray(time.daylight>.1?time.sunDirection:time.moonDirection).multiplyScalar(500);
  fill.color.set(time.fill);fill.intensity=.3+time.daylight*.3;fill.position.set(-80,30,-60);environment.setTime(time);
  const target=new T.Vector3(0,0,0);let camera;
  if(view.value==='aerial'){
    const size=Math.max(590,590/aspect);camera=new T.OrthographicCamera(-size*aspect,size*aspect,size,-size,1,5000);camera.up.set(0,0,-1);camera.position.set(0,1500,0);
  }else{
    camera=new T.PerspectiveCamera(40,aspect,1,5000);camera.position.copy(view.value==='west'?new T.Vector3(-1100,650,250):view.value==='rear'?new T.Vector3(250,650,-1100):new T.Vector3(650,650,1100));
  }
  camera.lookAt(target);camera.updateMatrixWorld();environment.update(camera,1);
  scene.traverse(node=>{
    const material=node.material;if(!material)return;
    if(material.userData.districtDepth)material.userData.districtDepth.value=camera.position.length();
    const refs=material.userData.cityLighting;if(refs){refs.tint.value.set(time.tint);refs.haze.value.set(time.haze);refs.night.value=time.night;}
    if(material.userData.cityNight)material.userData.cityNight.value=time.night;
  });
  renderer.render(scene,camera);status.textContent=`READY · ${view.value} · ${time.phase} · ${renderer.info.render.calls} draws`;
}
view.addEventListener('change',render);hour.addEventListener('change',render);addEventListener('resize',render);render();
addEventListener('pagehide',()=>{const geometries=new Set(),materials=new Set();scene.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)materials.add(n.material);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();renderer.dispose();},{once:true});
