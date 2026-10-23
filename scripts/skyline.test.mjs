import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/vendor/three.module.min.js';
import {cityLots,cityEnvelopes,districtPlan} from '../assets/city-layout.js';
import {createTowerModel} from '../assets/tower-model.js';
import {floorProfiles,towerAntennas,towerHeight,towerRoofHeight} from '../assets/tower-geometry.js';
import {outdoorCameraPose} from '../assets/camera-framing.js';
import {createCityEnvironment,cityPalette,applyTowerGlazing} from '../assets/city-environment.js';
import {createCityBackdrop} from '../assets/city-backdrop.js';
const model=createTowerModel();model.root.updateMatrixWorld(true);
const overlap=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];

test('sunset environment is static, world-oriented and can render independently of interiors',()=>{
  const environment=createCityEnvironment(),camera=new T.PerspectiveCamera();camera.position.set(120,20,300);
  environment.update(camera,1);
  assert.ok(environment.root.visible);assert.deepEqual(environment.sky.position.toArray(),camera.position.toArray());
  assert.equal(environment.sky.material.depthWrite,false);
  assert.ok(!Object.keys(environment.sky.material.uniforms).some(k=>/time|texture|sampler/i.test(k)),'Clouds have no animation or texture allocations');
  assert.equal(environment.sky.material.uniforms.zenith.value.getHexString(),cityPalette.zenith.slice(1));
  const source=environment.sky.material.fragmentShader;environment.update(camera,.5);environment.update(camera,1);
  assert.equal(environment.sky.material.fragmentShader,source,'Presentation does not rebuild cloud programs');
  environment.update(camera,0);assert.equal(environment.root.visible,false);
  const material=applyTowerGlazing(new T.MeshLambertMaterial(),42.525),shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};
  material.onBeforeCompile(shader);assert.equal(shader.uniforms.towerSectionLow.value,42.525);
  assert.ok(shader.fragmentShader.includes('floor(cell/vec2(4.0,3.0))'),'Warm windows form fixed physical groups');
});

test('city blur isolates the sharp subject, caches unchanged views, and releases its bounded targets',()=>{
  const world=new T.Scene(),view=new T.PerspectiveCamera(34,16/9,.1,1000);
  const city=new T.Group(),tower=new T.Group();world.add(city,tower);city.visible=false;
  const draws=[],size=new T.Vector2(3840,2160);let target=null,pixelRatio=Math.sqrt(2_400_000/(3840*2160));
  const renderer={autoClear:true,getSize:v=>v.copy(size),getDrawingBufferSize:v=>v.copy(size).multiplyScalar(pixelRatio).floor(),getRenderTarget:()=>target,
    setRenderTarget:value=>{target=value;},clearDepth(){},
    render(scene,camera){draws.push({scene,camera,target,city:city.visible,tower:tower.visible});}};
  const blur=createCityBackdrop(renderer,[city],[tower]);
  blur.render(world,view,1,()=>{},()=>{});
  assert.equal(draws.length,5,'One scenery pass, two blur passes, composite, sharp foreground');
  assert.equal(draws[0].city,true);assert.equal(draws[0].tower,false,'The tower never enters the blurred texture');
  assert.equal(draws[4].city,false);assert.equal(draws[4].tower,true,'City cannot occlude an unfolded floor');
  const buffer=renderer.getDrawingBufferSize(new T.Vector2());
  assert.deepEqual(blur.metrics(),{width:buffer.x,height:buffer.y},'City matches the main drawing buffer instead of upscaling a thumbnail');
  assert.ok(buffer.x*buffer.y<=2_400_000,'Large screens retain the shared raster cap');
  assert.equal(city.visible,false);assert.equal(tower.visible,true);assert.equal(renderer.autoClear,true);assert.equal(target,null);
  const targets=[draws[0].target,draws[1].target];let disposed=0;
  targets.forEach(t=>t.addEventListener('dispose',()=>disposed++));
  draws.length=0;blur.render(world,view,1,()=>{},()=>{});
  assert.equal(draws.length,2,'Hover redraws reuse the scenery texture');
  view.position.x=5;draws.length=0;blur.render(world,view,1,()=>{},()=>{});
  assert.equal(draws.length,5,'Orbiting updates the city perspective');
  size.set(390,844);pixelRatio=1;blur.render(world,view,1,()=>{},()=>{});
  assert.deepEqual(blur.metrics(),{width:390,height:844});
  pixelRatio=1.35;draws.length=0;blur.render(world,view,1,()=>{},()=>{});
  assert.deepEqual(blur.metrics(),{width:526,height:1139},'Dense phone screens retain the main canvas pixel ratio');
  assert.equal(draws.length,5,'A pixel-ratio change refreshes the backdrop even without a CSS resize');
  disposed=0;blur.dispose();assert.equal(disposed,2,'Both GPU targets are disposed');
});

test('street additions stay batched, supported and clear of live approaches',()=>{
  const features=model.districtDetails.features;
  assert.equal(features.filter(f=>f.kind==='parked-car').length,2);
  assert.equal(features.filter(f=>f.kind==='shop-sign').length,8);
  assert.ok(features.filter(f=>f.kind==='tree').length>=36);
  assert.ok(features.filter(f=>f.kind==='streetlight').length>=12);
  for(const sign of features.filter(f=>f.kind==='shop-sign')) {
    assert.ok(model.districtBuildings.buildings.filter(b=>b.form==='shopfront').some(b=>Math.abs(sign.bounds.getCenter(new T.Vector3()).z-(b.parts[0].z+b.parts[0].depth/2))<.3),'Retail signs are attached to an actual facade');
  }
  assert.equal(model.districtDetails.root.children.length,6);
});

test('the city has distinct height/depth layers and independent lots with open streets and approaches',()=>{
  assert.ok(cityLots.length>=30&&cityLots.length<=40);
  assert.equal(cityLots.filter(lot=>lot.height>=55).length,3,'Three secondary towers support the main landmark');
  assert.ok(cityLots.filter(lot=>lot.height>=22&&lot.height<=50).length>=10);
  assert.ok(cityLots.filter(lot=>lot.height>=8&&lot.height<=22).length>=12);
  assert.ok(new Set(cityLots.map(lot=>lot.family)).size>=6);
  assert.ok(cityLots.filter(lot=>lot.layer==='distant').length>=8,'Distant volumes continue the skyline around the scene');
  assert.ok(cityLots.filter(lot=>lot.layer==='foreground').length>=8,'Street fronts reduce the empty central apron');
  for(const [i,lot]of cityLots.entries()) {
    for(const other of cityLots.slice(i+1)) assert.ok(!overlap(lot.bounds,other.bounds),`${lot.id}/${other.id}: independent usable lots`);
    for(const [x,z]of [[0,30],[0,-30],[30,0],[-30,0]]) assert.ok(!overlap(lot.bounds,[x-4,z-4,x+4,z+4]),'The four axial approaches stay clear');
    for(const center of districtPlan.roadCenters) {
      assert.ok(!overlap(lot.bounds,[center-5,-170,center+5,170]));
      assert.ok(!overlap(lot.bounds,[-170,center-5,170,center+5]));
    }
  }
});

test('generated architecture and rooftop details fit their shared skyline envelopes',()=>{
  for(const layer of model.districtBuildings.root.children.filter(node=>node.isMesh||node.isLine)) {
    const p=layer.geometry.attributes.position;
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      assert.ok(cityEnvelopes.some(b=>x>=b.minX-1e-4&&x<=b.maxX+1e-4&&z>=b.minZ-1e-4&&z<=b.maxZ+1e-4&&y>=b.minY-1e-4&&y<=b.maxY+1e-4),'Actual geometry fits the bounds used by blockout and cameras');
    }
  }
  for(const feature of model.districtDetails.features.filter(f=>f.placement==='roof')) {
    const b=feature.bounds;
    assert.ok(model.districtBuildings.buildings.some(building=>building.parts.some(p=>b.min.x>=p.x-p.width/2&&b.max.x<=p.x+p.width/2&&b.min.z>=p.z-p.depth/2&&b.max.z<=p.z+p.depth/2&&b.min.y>=p.top)),'Roof plant is supported by a real building part');
  }
});

test('bundled tower has a broad podium, long shafts, flat roof and two unequal mounted antennae',()=>{
  assert.ok(floorProfiles.length<=6,'A few major terminations replace repeated small retreats');
  assert.ok(floorProfiles[1].height<towerRoofHeight*.1,'A substantial podium supports the shafts');
  assert.ok(floorProfiles[2].height-floorProfiles[1].height>=25);
  assert.ok(floorProfiles[3].height-floorProfiles[2].height>=20);
  assert.equal(towerAntennas.length,2);
  assert.ok(towerAntennas[0].top>towerAntennas[1].top);
  assert.ok(towerAntennas.every(a=>a.base===towerRoofHeight&&a.top<=towerHeight));
  assert.ok(towerHeight>=145&&towerHeight>Math.max(...cityEnvelopes.map(b=>b.maxY))*1.8,'The landmark is substantially taller than the city');
  assert.ok(Math.abs(new T.Box3().setFromObject(model.modules[0].mesh).max.y-towerHeight)<1e-4,'The actual shell reaches the declared height');
  const secondary=model.modules[0].antennas[0];
  assert.equal(secondary.geometry.parameters.openEnded,false,'Antenna has closed end caps');
  const bounds=new T.Box3().setFromObject(secondary);
  assert.ok(Math.abs(bounds.max.y-towerAntennas[1].top)<1e-4&&Math.abs(bounds.min.y-towerAntennas[1].base)<1e-4);
  for(const a of towerAntennas) {
    const ray=new T.Raycaster(new T.Vector3(a.x+a.radius+.2,a.base+.2,a.z),new T.Vector3(0,-1,0),0,.3);
    assert.ok(ray.intersectObject(model.modules[0].mesh).length,'Every antenna is mounted on the shared flat roof');
  }
});

test('opening composition keeps the full main tower prominent at a lower camera on desktop and phones',()=>{
  for(const [w,h]of [[1440,900],[390,844],[614,672],[844,390],[650,390]]) {
    const pose=outdoorCameraPose('tower',w,h),c=new T.PerspectiveCamera(34,w/h,.1,1500);
    c.position.copy(pose.position);c.lookAt(pose.target);c.setViewOffset(w,h,w/2-pose.layout.centerX,h/2-pose.layout.centerY,w,h);c.updateMatrixWorld();
    assert.ok(c.position.y>1&&c.position.y<40,'The opening camera is at city level rather than above the skyline');
    let top=Infinity,bottom=-Infinity;
    for(const section of model.modules) {
      const p=section.mesh.geometry.attributes.position;
      for(let i=0;i<p.count;i++) {
        const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(section.mesh.matrixWorld).project(c),y=(1-v.y)*h/2;
        top=Math.min(top,y);bottom=Math.max(bottom,y);
        assert.ok(y>=pose.layout.rect.top-1&&y<=pose.layout.rect.bottom+1,'Antennae and podium remain inside the reserved view');
      }
    }
    const fraction=(bottom-top)/(pose.layout.rect.bottom-pose.layout.rect.top);
    assert.ok(fraction>=.65&&fraction<=.81,`${w}x${h}: main tower fills ${(fraction*100).toFixed(1)}% of the usable view`);
  }
});
