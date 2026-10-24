import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/vendor/three.module.min.js';
import {cityLots,cityEnvelopes,districtPlan,riverPlan,riverEdges,riverCenter,parkPlan,outskirtsRoads,neighborhoodParcels} from '../assets/city-layout.js';
import {createTowerModel} from '../assets/tower-model.js';
import {floorProfiles,towerAntennas,towerHeight,towerRoofHeight} from '../assets/tower-geometry.js';
import {outdoorCameraPose} from '../assets/camera-framing.js';
import {createCityEnvironment,cityPalette,applyTowerGlazing} from '../assets/city-environment.js';
import {createCityBackdrop} from '../assets/city-backdrop.js';
import {readCityTime} from '../assets/city-time.js';
import {roadNetwork} from '../assets/road-markings.js';
const model=createTowerModel();model.root.updateMatrixWorld(true);
const overlap=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];

test('every road has supported center and edge paint outside intersections',()=>{
  const groups=[['downtown',model.district,model.district.root.getObjectByName('streets')],
    ['outskirts',model.outskirts,model.outskirts.root.getObjectByName('outskirts-paving')],
    ['bridge',model.waterfront,model.waterfront.root.getObjectByName('waterfront-quays')]];
  let covered=0;
  for(const [group,owner,asphalt] of groups) {
    for(const road of roadNetwork.filter(road=>road.group===group)) {
      const patches=owner.roadMarkings.filter(patch=>patch.roadId===road.id);
      assert.ok(patches.some(patch=>patch.type==='center')&&patches.some(patch=>patch.type==='edge'),`${road.id}: both paint types cover the road`);
      covered++;
      for(const patch of patches) {
        const normal=new T.Vector3().subVectors(new T.Vector3(...patch.points[1]),new T.Vector3(...patch.points[0]))
          .cross(new T.Vector3().subVectors(new T.Vector3(...patch.points[2]),new T.Vector3(...patch.points[0])));
        assert.ok(normal.y>0,`${road.id}: paint faces upward, including sloped ramps`);
        for(const [x,y,z] of patch.points) {
          const along=road.axis==='x'?x:z,across=(road.axis==='x'?z:x)-road.center;
          assert.ok(Number.isFinite(y)&&along>=road.start-1e-5&&along<=road.end+1e-5&&Math.abs(across)<road.width/2-.25,`${road.id}: paint stays within the real asphalt`);
        }
        const bounds=[Math.min(...patch.points.map(p=>p[0])),Math.min(...patch.points.map(p=>p[2])),Math.max(...patch.points.map(p=>p[0])),Math.max(...patch.points.map(p=>p[2]))];
        for(const other of roadNetwork.filter(other=>other.axis!==road.axis)) {
          const cross=other.axis==='x'?[other.start,other.center-other.width/2,other.end,other.center+other.width/2]:[other.center-other.width/2,other.start,other.center+other.width/2,other.end];
          assert.ok(!overlap(bounds,cross),`${road.id}/${other.id}: intersection remains unpainted`);
        }
        const center=patch.points.reduce((sum,p)=>sum.add(new T.Vector3(...p)),new T.Vector3()).multiplyScalar(.25);
        const hits=new T.Raycaster(new T.Vector3(center.x,20,center.z),new T.Vector3(0,-1,0)).intersectObject(asphalt);
        assert.ok(hits.some(hit=>Math.abs(center.y-hit.point.y-.025)<1e-4),`${road.id}: paint follows the actual road/deck/ramp elevation`);
      }
    }
  }
  assert.equal(covered,42,'Downtown, all 36 outer streets and both bridges receive markings');
});

test('the previously blank downtown extensions carry visible paint and retain crossing gaps',()=>{
  const paint=model.district.root.getObjectByName('road-markings');
  for(const [x,z] of [[145,42+.22],[-145,-42-.22],[42+4.4,-140],[-42-4.4,-140]]) {
    assert.ok(new T.Raycaster(new T.Vector3(x,10,z),new T.Vector3(0,-1,0)).intersectObject(paint).length,'The full road beyond the old 108-unit paint boundary is marked');
  }
  for(const [x,z] of [[42,42],[-42,-42],[2.5,42]])
    assert.equal(new T.Raycaster(new T.Vector3(x,10,z),new T.Vector3(0,-1,0)).intersectObject(paint).length,0,'Junctions and gaps between plaza crossing stripes remain clear');
  assert.equal(paint.geometry.attributes.position.count,paint.geometry.attributes.color.count,'Yellow dividers and white edges share the existing mesh');
});

test('night environment is smooth, static, world-oriented and independent of interiors',()=>{
  const environment=createCityEnvironment(readCityTime(new Date(2026,9,23,0))),camera=new T.PerspectiveCamera();camera.position.set(120,20,300);
  environment.update(camera,1);
  assert.ok(environment.root.visible);assert.deepEqual(environment.sky.position.toArray(),camera.position.toArray());
  assert.equal(environment.sky.material.depthWrite,false);
  assert.ok(!Object.keys(environment.sky.material.uniforms).some(k=>/time|texture|sampler/i.test(k)),'Night sky has no animation or texture allocations');
  assert.equal(environment.sky.material.precision,'highp','Sky interpolation and fragment math retain full precision');
  assert.equal(environment.sky.material.dithering,true,'The dark gradient avoids visible color bands');
  assert.doesNotMatch(environment.sky.material.fragmentShader,/float (noise|cloud|hash)\(/,'The broken cloud-noise path is removed');
  const stars=environment.sky.material.uniforms.stars.value.map(v=>v.toArray());
  assert.ok(stars.every(v=>Math.abs(Math.hypot(...v)-1)<1e-8&&v[1]>.09),'Stars use fixed directions above the horizon');
  assert.equal(environment.sky.material.uniforms.zenith.value.getHexString(),cityPalette.zenith.slice(1));
  assert.equal(environment.sky.material.uniforms.sunVisibility.value,0);
  assert.equal(environment.sky.material.uniforms.moonVisibility.value,1);
  environment.setTime(readCityTime(new Date(2026,9,23,10)));environment.update(camera,1);
  assert.equal(environment.sky.material.uniforms.starVisibility.value,0);
  assert.equal(environment.sky.material.uniforms.sunVisibility.value,1);
  assert.equal(environment.sky.material.uniforms.moonVisibility.value,0);
  const source=environment.sky.material.fragmentShader;environment.update(camera,.5);environment.update(camera,1);
  assert.equal(environment.sky.material.fragmentShader,source,'Presentation does not rebuild sky programs');
  assert.deepEqual(environment.sky.material.uniforms.stars.value.map(v=>v.toArray()),stars,'Presentation leaves stars fixed in world directions');
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
  assert.deepEqual(blur.metrics(),{width:buffer.x,height:buffer.y,blurPasses:2},'City matches the main drawing buffer instead of upscaling a thumbnail');
  assert.ok(buffer.x*buffer.y<=2_400_000,'Large screens retain the shared raster cap');
  assert.equal(city.visible,false);assert.equal(tower.visible,true);assert.equal(renderer.autoClear,true);assert.equal(target,null);
  const targets=[draws[0].target,draws[1].target];let disposed=0;
  targets.forEach(t=>t.addEventListener('dispose',()=>disposed++));
  draws.length=0;blur.render(world,view,1,()=>{},()=>{});
  assert.equal(draws.length,2,'Hover redraws reuse the scenery texture');
  view.position.x=5;draws.length=0;blur.render(world,view,1,()=>{},()=>{});
  assert.equal(draws.length,5,'Orbiting updates the city perspective');
  blur.invalidate();draws.length=0;blur.render(world,view,1,()=>{},()=>{});
  assert.equal(draws.length,5,'A clock/lighting change refreshes the cached city without moving the camera');
  size.set(390,844);pixelRatio=1;blur.render(world,view,1,()=>{},()=>{});
  assert.deepEqual(blur.metrics(),{width:390,height:844,blurPasses:2});
  pixelRatio=1.35;draws.length=0;blur.render(world,view,1,()=>{},()=>{});
  assert.deepEqual(blur.metrics(),{width:526,height:1139,blurPasses:2},'Dense phone screens retain the main canvas pixel ratio');
  assert.equal(draws.length,5,'A pixel-ratio change refreshes the backdrop even without a CSS resize');
  blur.setLowGraphics(true);draws.length=0;blur.render(world,view,1,()=>{},()=>{});
  assert.equal(draws.length,3,'Low graphics skips both blur shader passes');
  assert.deepEqual(blur.metrics(),{width:263,height:569,blurPasses:0},'Low graphics quarters the scenery buffer area');
  assert.equal(draws[0].target,targets[0],'The same GPU target is reused across graphics changes');
  assert.equal(draws[2].city,false);assert.equal(draws[2].tower,true,'The sharp subject remains isolated in low graphics');
  blur.setLowGraphics(false);draws.length=0;blur.render(world,view,1,()=>{},()=>{});
  assert.equal(draws.length,5,'Returning to standard restores both blur passes');
  assert.deepEqual(blur.metrics(),{width:526,height:1139,blurPasses:2});
  disposed=0;blur.dispose();assert.equal(disposed,2,'Both GPU targets are disposed');
});

test('finished parks, planted edges and ground detail stay clear of buildings, avenues and water',()=>{
  const landscape=model.landscape;
  assert.equal(landscape.root.children.length,3,'Public spaces share three static batches');
  assert.equal(landscape.features.filter(f=>f.kind==='city-park').length,3);
  const occupied=model.districtBuildings.buildings.flatMap(b=>b.parts.map(p=>new T.Box3(new T.Vector3(p.x-p.width/2,p.bottom,p.z-p.depth/2),new T.Vector3(p.x+p.width/2,p.top,p.z+p.depth/2))));
  for(const feature of landscape.features) {
    assert.ok(occupied.every(bounds=>!bounds.intersectsBox(feature.bounds)),`${feature.id||feature.kind}: no occupied-volume collision`);
    for(let x=feature.bounds.min.x;x<=feature.bounds.max.x;x+=2) {
      const water=riverEdges(x);
      assert.ok(feature.bounds.max.z<=water.north||feature.bounds.min.z>=water.south,`${feature.id||feature.kind}: dry landscape`);
    }
  }
  for(const park of parkPlan)for(const center of districtPlan.roadCenters) {
    assert.ok(!overlap(park.bounds,[center-5,-170,center+5,170]));
    assert.ok(!overlap(park.bounds,[-170,center-5,170,center+5]));
  }
  let triangles=0;
  for(const mesh of landscape.root.children) {
    const p=mesh.geometry.attributes.position;triangles+=p.count/3;
    assert.equal(p.count,mesh.geometry.attributes.color.count);
    assert.equal(p.count,mesh.geometry.attributes.cityGlow.count);
    assert.ok(Array.from(p.array).every(Number.isFinite));
  }
  assert.ok(triangles<6500,`${triangles} landscape triangles`);
  for(const root of [landscape.root,model.waterfront.root,model.districtDetails.root])root.traverse(node=>{
    if(node.material?.userData.cityGlowMode==='vertex')assert.equal(node.geometry.attributes.position.count,node.geometry.attributes.cityGlow.count,`${node.name}: complete lamp mask`);
  });
  const terrain=new T.Raycaster(new T.Vector3(800,10,0),new T.Vector3(0,-1,0));
  const environment=createCityEnvironment();environment.root.updateMatrixWorld(true);
  assert.ok(terrain.intersectObject(environment.root.getObjectByName('city-ground')).length,'Terrain extends beyond the built city to remove the tabletop edge');
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
  const downtown=cityLots.filter(lot=>lot.layer!=='outskirts');
  assert.ok(downtown.length>=60&&downtown.length<=65,'The established downtown is preserved');
  assert.ok(neighborhoodParcels.length>=100,'Outer neighborhoods fill the city perimeter');
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

test('outer streets connect to downtown and both bridges without crossing occupied land or water',()=>{
  const roadBounds=outskirtsRoads.map(r=>r.bounds);
  const core=districtPlan.roadCenters.flatMap(c=>[[c-5,-170,c+5,170],[-170,c-5,170,c+5]]);
  const bridges=riverPlan.bridges.map(x=>{const a=riverEdges(x-7),b=riverEdges(x+7);return[x-5,Math.min(a.north,b.north)-18,x+5,214];});
  const nodes=[...roadBounds,...core,...bridges],seen=new Set([outskirtsRoads.length]);
  const joins=(a,b)=>a[0]<=b[2]+.001&&a[2]>=b[0]-.001&&a[1]<=b[3]+.001&&a[3]>=b[1]-.001;
  for(let changed=true;changed;){changed=false;for(let i=0;i<nodes.length;i++)if(!seen.has(i)&&[...seen].some(j=>joins(nodes[i],nodes[j]))){seen.add(i);changed=true;}}
  assert.equal(seen.size,nodes.length,'Every peripheral street has a continuous route to the tower and bridges');
  for(const road of outskirtsRoads){
    for(const lot of cityLots)assert.ok(!overlap(road.bounds,lot.bounds),`${road.id}/${lot.id}: road leaves the occupied parcel clear`);
    for(const park of parkPlan)assert.ok(!overlap(road.bounds,park.bounds),`${road.id}: established park stays intact`);
    for(let x=road.bounds[0];x<=road.bounds[2];x+=2){const water=riverEdges(x);assert.ok(road.bounds[3]<=water.north||road.bounds[1]>=water.south,`${road.id}: dry road outside designated bridges`);}
    const midpoint=new T.Vector3((road.bounds[0]+road.bounds[2])/2,10,(road.bounds[1]+road.bounds[3])/2);
    assert.ok(new T.Raycaster(midpoint,new T.Vector3(0,-1,0)).intersectObject(model.outskirts.root.getObjectByName('outskirts-paving')).length,`${road.id}: road is rendered with an upward-facing surface`);
  }
});

test('outer neighborhoods have street access, public space and a bounded transition to woodland',()=>{
  const outskirts=model.outskirts,features=outskirts.features;
  for(const district of ['north','south','east','west'])assert.ok(neighborhoodParcels.filter(lot=>lot.district===district).length>=12,`${district}: occupied neighborhood`);
  assert.ok(neighborhoodParcels.every(lot=>lot.height<=14),'Heights taper beyond downtown');
  assert.ok(neighborhoodParcels.some(lot=>lot.form==='gable')&&neighborhoodParcels.some(lot=>lot.form==='sawtooth')&&neighborhoodParcels.some(lot=>lot.form==='court'),'Housing, workshops and civic buildings have different roof/massing types');
  for(const garden of features.filter(f=>f.kind==='home-garden')){
    const road=outskirtsRoads.find(r=>r.id===garden.streetId),end=road.center+Math.sign(garden.path.end-road.center)*(road.width/2+road.walk);
    assert.ok(Math.abs(garden.path.end-end)<1e-6,`${garden.id}: front path reaches a real sidewalk`);
  }
  assert.equal(features.filter(f=>f.kind==='neighborhood-court').length,1);
  assert.equal(features.filter(f=>f.kind==='service-yard').length,1);
  assert.ok(features.filter(f=>f.kind==='transit-stop').length>=2);
  assert.ok(features.filter(f=>f.kind==='neighborhood-lamp').length>=8);
  assert.ok(features.filter(f=>f.kind==='avenue-tree').length>=12,'Outer avenues retain their planted sidewalk edge');
  assert.ok(features.filter(f=>f.kind==='woodland').length>=60);
  const occupied=model.districtBuildings.buildings.flatMap(b=>b.parts.map(p=>new T.Box3(new T.Vector3(p.x-p.width/2,p.bottom,p.z-p.depth/2),new T.Vector3(p.x+p.width/2,p.top,p.z+p.depth/2))));
  for(const feature of features.filter(f=>!['street','home-garden'].includes(f.kind))){
    assert.ok(occupied.every(b=>!b.intersectsBox(feature.bounds)),`${feature.kind}: no occupied-volume collision`);
    for(let x=feature.bounds.min.x;x<=feature.bounds.max.x;x+=4){const water=riverEdges(x);assert.ok(feature.bounds.max.z<=water.north||feature.bounds.min.z>=water.south,`${feature.kind}: dry land`);}
    for(const r of outskirtsRoads)assert.ok(!overlap([feature.bounds.min.x,feature.bounds.min.z,feature.bounds.max.x,feature.bounds.max.z],r.bounds),`${feature.kind}/${r.id}: roadway stays clear`);
  }
  assert.equal(outskirts.root.children.length,4,'All outskirts detail shares four static batches');
  let triangles=0;
  outskirts.root.traverse(node=>{if(!node.isMesh)return;const p=node.geometry.attributes.position;triangles+=p.count/3;assert.ok(Array.from(p.array).every(Number.isFinite));assert.equal(p.count,node.geometry.attributes.color.count);assert.equal(p.count,node.geometry.attributes.cityGlow.count);assert.ok(node.material.userData.districtDepth);});
  assert.ok(triangles<20000,`${triangles}: outer roads, gardens and woodland remain bounded`);
  assert.ok(riverPlan.minX<=-2000&&riverPlan.maxX>=2000,'The river continues through the full outer landscape');
});

test('river, bridges and riverwalk occupy real space without flooding the city or hiding the landmark',()=>{
  const waterfront=model.waterfront;
  assert.equal(waterfront.root.children.length,5,'River details share a fixed number of batches');
  assert.equal(waterfront.features.filter(f=>f.kind==='bridge').length,2);
  assert.equal(waterfront.features.filter(f=>f.kind==='riverside-tree').length,28);
  assert.equal(waterfront.features.filter(f=>f.kind==='riverside-park').length,2);
  for(const lot of cityLots) for(let x=lot.bounds[0];x<=lot.bounds[2];x+=2) {
    const edges=riverEdges(x);
    assert.ok(lot.bounds[3]<=edges.north||lot.bounds[1]>=edges.south,`${lot.id}: occupied parcels stay outside the water`);
  }
  const occupied=model.districtBuildings.buildings.flatMap(b=>b.parts.map(p=>new T.Box3(new T.Vector3(p.x-p.width/2,p.bottom,p.z-p.depth/2),new T.Vector3(p.x+p.width/2,p.top,p.z+p.depth/2))));
  for(const f of waterfront.features.filter(f=>['riverside-tree','riverside-bench','riverwalk-lamp','riverside-park'].includes(f.kind))) {
    assert.ok(occupied.every(bounds=>!bounds.intersectsBox(f.bounds)),`${f.kind}: waterfront fixtures stay outside occupied buildings`);
    assert.ok(districtPlan.roadCenters.every(x=>f.bounds.max.x<x-5||f.bounds.min.x>x+5),`${f.kind}: avenue crossings stay clear`);
  }
  let triangles=0,vertices=0;
  for(const object of waterfront.root.children) {
    const p=object.geometry.attributes.position,c=object.geometry.attributes.color;
    vertices+=p.count;if(object.isMesh)triangles+=p.count/3;
    assert.equal(p.count,c.count);assert.equal(object.userData.sectionId,undefined);
    assert.ok(object.material.userData.districtDepth,'River scenery follows the shared atmospheric depth');
    for(let i=0;i<p.count;i++)assert.ok([p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite));
  }
  assert.ok(triangles<5000&&vertices<16000,`${triangles} riverfront triangles / ${vertices} vertices`);
  const water=waterfront.root.getObjectByName('waterfront-water'),quays=waterfront.root.getObjectByName('waterfront-quays');
  const riverRay=new T.Raycaster(new T.Vector3(0,30,riverCenter(0)),new T.Vector3(0,-1,0));
  assert.ok(riverRay.intersectObject(water).length,'The river has an upward-facing water surface');
  for(const x of riverPlan.bridges) {
    const ray=new T.Raycaster(new T.Vector3(x,30,riverCenter(x)),new T.Vector3(0,-1,0));
    const hits=ray.intersectObjects([water,quays]);
    assert.equal(hits[0].object,quays,'Bridge decks cross above the water and connect both banks');
  }
  const pose=outdoorCameraPose('tower',1440,900),target=new T.Vector3(-7,68,0);
  assert.equal(new T.Raycaster(pose.position,target.clone().sub(pose.position).normalize(),0,pose.position.distanceTo(target)).intersectObjects(waterfront.root.children.filter(o=>o.isMesh)).length,0,'The waterfront keeps the main shaft visible');
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
