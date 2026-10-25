import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/vendor/three.module.min.js';
import { settlementRoads, settlementHouses, settlementStructures } from '../assets/island-settlement.js';
import { outskirtsRoads, cityLots, riverEdges, riverPlan, riverCenter } from '../assets/city-layout.js';
import { islandContains } from '../assets/city-geography.js';
import { islandTerrainHeight } from '../assets/island-topography.js';
import { createIslandWilderness } from '../assets/island-wilderness.js';
import { createCityOutskirts } from '../assets/city-outskirts.js';

const overlap=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
const grow=(b,d)=>[b[0]-d,b[1]-d,b[2]+d,b[3]+d];
const owner=createCityOutskirts();

test('new road sections form one connected network with the existing island streets',()=>{
  assert.ok(settlementRoads.length>=25);
  const roads=[...outskirtsRoads,...settlementRoads],seen=new Set(outskirtsRoads.map((_,i)=>i));
  let change=true;while(change){change=false;for(let i=0;i<roads.length;i++)if(!seen.has(i)&&[...seen].some(j=>overlap(grow(roads[i].bounds,.2),roads[j].bounds))){seen.add(i);change=true;}}
  assert.equal(seen.size,roads.length,'Every new street reaches the existing city');
  for(const road of settlementRoads){
    assert.ok(road.profile.length>=2&&road.end-road.start>=24);
    for(let i=0;i<road.profile.length;i++){
      const [at,y]=road.profile[i],x=road.axis==='x'?at:road.center,z=road.axis==='x'?road.center:at;
      assert.ok(islandContains(x,z,.93));
      assert.ok(Math.abs(y-islandTerrainHeight(x,z)-.32)<1e-6,'Road profiles follow the exact uploaded terrain');
      if(i){const[a,h]=road.profile[i-1];assert.ok(Math.abs((y-h)/(at-a))<=.22,'Grades remain walkable and drivable');}
      if(x>=riverPlan.minX-55&&x<=riverPlan.mouthX){const banks=riverEdges(x);assert.ok(z<banks.north-7||z>banks.south+7,'New roads avoid the river');}
    }
  }
});

test('housing fills multiple outer districts with clear, supported, non-overlapping plots',()=>{
  assert.ok(settlementHouses.length>=280);
  assert.equal(new Set(settlementHouses.map(h=>h.id)).size,settlementHouses.length);
  assert.equal(new Set(settlementHouses.map(h=>h.roof)).size,3);
  assert.ok(Math.max(...settlementHouses.map(h=>h.height))-Math.min(...settlementHouses.map(h=>h.height))>4);
  assert.ok(Math.max(...settlementHouses.map(h=>h.x))-Math.min(...settlementHouses.map(h=>h.x))>1500);
  assert.ok(Math.max(...settlementHouses.map(h=>h.z))-Math.min(...settlementHouses.map(h=>h.z))>1500);
  const counts=[0,0,0,0];
  for(const [i,h]of settlementHouses.entries()){
    counts[h.z<-515?0:h.z>525?1:h.x<0?2:3]++;
    assert.ok(settlementRoads.some(r=>r.id===h.roadId),'Each home has a frontage on an actual street');
    for(const x of [h.bounds[0],h.bounds[2]])for(const z of [h.bounds[1],h.bounds[3]]){
      assert.ok(islandContains(x,z,.925));assert.ok(h.base>=islandTerrainHeight(x,z)+.239,'Foundations cover the uphill terrain corner');
      if(x>=riverPlan.minX-55&&x<=riverPlan.mouthX){const bank=riverEdges(x);assert.ok(z<bank.north-5||z>bank.south+5);}
    }
    assert.ok(cityLots.every(lot=>!overlap(h.bounds,lot.bounds)),'Original occupied parcels are preserved');
    assert.ok([...outskirtsRoads,...settlementRoads].every(r=>!overlap(h.bounds,grow(r.bounds,r.walk+1.9))),'Homes leave roads and sidewalks clear');
    assert.ok(settlementHouses.slice(i+1).every(other=>!overlap(grow(h.bounds,3.9),other.bounds)));
    assert.ok(settlementStructures.every(s=>!overlap(h.bounds,grow(s.bounds,6.9))&&!overlap(h.bounds,s.accessBounds)));
  }
  assert.ok(counts.every(count=>count>=20),'New housing surrounds the old town rather than filling only one corner');
});

test('community and service sites retain public road access and distinct visible structures',()=>{
  const types=new Set(settlementStructures.map(s=>s.type));
  for(const type of ['school','clinic','market','water-tower','depot','fire-station','solar-garden','community-hall','harbor-office'])assert.ok(types.has(type));
  for(const s of settlementStructures){
    assert.ok(s.access.distance<100&&settlementRoads.includes(s.access.road));
    const feature=owner.features.find(f=>f.id===s.id);assert.ok(feature&&!feature.bounds.isEmpty());
    assert.ok(feature.bounds.max.y>s.base+.5,'The site has actual raised structure geometry');
  }
  const marina=owner.features.find(f=>f.kind==='island-marina');assert.ok(marina?.waterfront);
  assert.ok(marina.bounds.max.z>riverEdges(marina.bounds.getCenter(new T.Vector3()).x).north,'The marina has actual piers and boats in the river');
});

test('relocated forest crowns and rocks leave new streets, homes and civic access open',()=>{
  const wild=createIslandWilderness();assert.ok(wild.trees.length>=350,'Woodlands remain substantial');
  for(const tree of [...wild.trees,...wild.rocks]){
    const b=[tree.x-tree.radius,tree.z-tree.radius,tree.x+tree.radius,tree.z+tree.radius];
    assert.ok(settlementRoads.every(r=>!overlap(b,grow(r.bounds,r.walk+2))));
    assert.ok(settlementHouses.every(h=>!overlap(b,grow(h.bounds,3))));
    assert.ok(settlementStructures.every(s=>!overlap(b,grow(s.bounds,4))&&!overlap(b,s.accessBounds)));
  }
});

test('expanded streets and buildings share existing batches with complete finite night-light attributes',()=>{
  assert.equal(owner.root.children.length,4);
  assert.equal(owner.features.filter(f=>f.kind==='island-house').length,settlementHouses.length);
  let triangles=0,lit=0;
  for(const mesh of owner.root.children){
    const {position,color,cityGlow,surfaceKind}=mesh.geometry.attributes;
    assert.equal(position.count,color.count);assert.equal(position.count,cityGlow.count);assert.equal(position.count,surfaceKind.count);
    assert.ok(Array.from(position.array).every(Number.isFinite));triangles+=position.count/3;
    for(const value of cityGlow.array)lit+=value;
  }
  assert.ok(lit>settlementHouses.length*20,'Every district includes visible warm-window geometry at night');
  assert.ok(triangles<30000,'The expanded town remains bounded within its four shared batches');
});
