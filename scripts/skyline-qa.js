import * as T from '../assets/vendor/three.module.min.js';
import {createTowerModel} from '../assets/tower-model.js';
import {outdoorCameraPose} from '../assets/camera-framing.js';
import {cityLots} from '../assets/city-layout.js';
const model=createTowerModel(),scene=new T.Scene();
scene.add(new T.HemisphereLight('#ffffff','#9fa8a2',2));
const sun=new T.DirectionalLight('#ffffff',2);sun.position.set(80,130,90);scene.add(sun);
const solid=new T.MeshLambertMaterial({color:'#bfc9c4',side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
const hero=new T.MeshLambertMaterial({color:'#7d8b84',side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
const ink=new T.LineBasicMaterial({color:'#58665d',transparent:true,opacity:.3});
function add(source,material,lift=0) {
  const mesh=new T.Mesh(source.geometry,material);mesh.position.copy(source.position);mesh.position.y+=lift;mesh.scale.copy(source.scale);mesh.rotation.copy(source.rotation);scene.add(mesh);
  const edges=new T.LineSegments(new T.EdgesGeometry(source.geometry,25),ink);edges.position.copy(mesh.position);edges.scale.copy(mesh.scale);edges.rotation.copy(mesh.rotation);scene.add(edges);
}
for(const module of model.modules) for(const source of [module.mesh,...module.caps,...module.antennas]) add(source,hero,module.low);
for(const name of ['building-surfaces','building-roofs']) add(model.districtBuildings.root.getObjectByName(name),solid);
const streetGeometry=model.district.root.getObjectByName('streets').geometry.clone();streetGeometry.computeVertexNormals();
const streets=new T.Mesh(streetGeometry,new T.MeshLambertMaterial({color:'#c2c5c1',side:T.DoubleSide}));scene.add(streets);
const ground=new T.Mesh(new T.PlaneGeometry(360,360),new T.MeshLambertMaterial({color:'#e3e5e1'}));ground.rotation.x=-Math.PI/2;ground.position.y=-.9;scene.add(ground);
const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setScissorTest(true);renderer.setClearColor('#f7f8f6',1);document.body.append(renderer.domElement);
function render() {
  renderer.setSize(innerWidth,innerHeight);
  for(const view of document.querySelectorAll('.view')) {
    const rect=view.getBoundingClientRect();let camera;
    if(view.dataset.view==='overhead') {
      const aspect=rect.width/rect.height,halfY=Math.max(180,180/aspect);
      camera=new T.OrthographicCamera(-halfY*aspect,halfY*aspect,halfY,-halfY,.1,1000);camera.up.set(0,0,-1);camera.position.set(0,400,0);camera.lookAt(0,0,0);
    } else {
      const direction=view.dataset.view==='side'?new T.Vector3(1,-.08,0):view.dataset.view==='rear'?new T.Vector3(-.4,-.08,-1):null;
      const pose=outdoorCameraPose('tower',1440,900,direction);
      camera=new T.PerspectiveCamera(34,rect.width/rect.height,.1,1500);camera.position.copy(pose.position);camera.lookAt(pose.target);
    }
    camera.updateMatrixWorld();renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissor(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.render(scene,camera);
  }
  document.querySelector('#status').textContent=`READY · ${cityLots.length} buildings · 3 secondary towers · 2 tower antennae · actual production geometry`;
}
render();addEventListener('resize',render);addEventListener('scroll',render,{passive:true});
