import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/vendor/three.module.min.js';
import {motionEase,motionPhase,shortestAngle,staggerProgress,sampleCameraFlight} from '../assets/spatial-motion.js';

const radians=degrees=>degrees*Math.PI/180;
const close=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} should be within ${tolerance} of ${expected}`);
const finite=vector=>assert.ok(vector.toArray().every(Number.isFinite),`Non-finite camera vector: ${vector.toArray()}`);
const radius=pose=>pose.position.distanceTo(pose.target);
function pose(distance,azimuth=.3,polar=.8,target=new T.Vector3()){
  return {position:target.clone().add(new T.Vector3().setFromSphericalCoords(distance,polar,azimuth)),target:target.clone()};
}
const snapshot=value=>({position:value.position.toArray(),target:value.target.toArray()});

test('motion easing clamps time and settles with zero endpoint velocity and acceleration',()=>{
  assert.equal(motionEase(-.5),0);assert.equal(motionEase(0),0);
  assert.equal(motionEase(1),1);assert.equal(motionEase(1.5),1);close(motionEase(.5),.5);
  let previous=0;
  for(let i=0;i<=100;i++){
    const t=i/100,value=motionEase(t);
    assert.ok(value>=previous&&value>=0&&value<=1);previous=value;
    close(value+motionEase(1-t),1);
  }
  const h=.0001;
  assert.ok(motionEase(h)/h<.00001,'The first frame should accelerate gently from rest');
  assert.ok((1-motionEase(1-h))/h<.00001,'The final frame should settle without a velocity step');
  assert.ok(Math.abs((motionEase(2*h)-2*motionEase(h))/h**2)<.01);
  assert.ok(Math.abs((1-2*motionEase(1-h)+motionEase(1-2*h))/h**2)<.01);
});

test('phase windows hold their endpoints outside the active beat and ease inside it',()=>{
  for(const t of [-1,0,.19,.2])assert.equal(motionPhase(t,.2,.8),0);
  for(const t of [.8,.81,1,2])assert.equal(motionPhase(t,.2,.8),1);
  close(motionPhase(.5,.2,.8),.5);
  assert.ok(motionPhase(.3,.2,.8)<1/6,'A reveal should not begin at constant speed');
  assert.ok(motionPhase(.7,.2,.8)>5/6,'A reveal should ease into its final state');
});

test('azimuth differences cross the angle seam by the shortest route in either direction',()=>{
  close(shortestAngle(radians(179),radians(-179)),radians(2));
  close(shortestAngle(radians(-179),radians(179)),radians(-2));
  close(shortestAngle(0,Math.PI*8),0);
  close(shortestAngle(Math.PI*7,.25),shortestAngle(Math.PI,.25));
  for(let from=-12;from<=12;from+=.75)for(let to=-12;to<=12;to+=.75){
    const delta=shortestAngle(from,to);
    assert.ok(delta>=-Math.PI-1e-10&&delta<=Math.PI+1e-10);
    close(Math.sin(from+delta),Math.sin(to));close(Math.cos(from+delta),Math.cos(to));
  }
});

test('floor staggering opens from the crown and closes from the base without changing final transforms',()=>{
  for(const expanding of [true,false])for(const count of [1,6]){
    for(let index=0;index<count;index++){
      assert.equal(staggerProgress(0,index,count,expanding),0);
      assert.equal(staggerProgress(1,index,count,expanding),1);
      let previous=0;
      for(let step=0;step<=100;step++){
        const value=staggerProgress(step/100,index,count,expanding);
        assert.ok(value>=previous-1e-10&&value>=0&&value<=1);previous=value;
      }
    }
  }
  for(const t of [.25,.5,.75]){
    const opening=Array.from({length:6},(_,i)=>staggerProgress(t,i,6,true));
    const closing=Array.from({length:6},(_,i)=>staggerProgress(t,i,6,false));
    assert.ok(opening[0]>opening[5],`Crown should lead at ${t}`);
    assert.ok(closing[5]>closing[0],`Base should lead at ${t}`);
    for(let i=1;i<6;i++){assert.ok(opening[i]<=opening[i-1]);assert.ok(closing[i]>=closing[i-1]);}
  }
});

test('camera flights preserve exact endpoints and input poses while returning independent vectors',()=>{
  const from=pose(90,.2,.6,new T.Vector3(1,12,-2)),to=pose(18,-.4,.9,new T.Vector3(-8,35,7));
  const before=[snapshot(from),snapshot(to)];
  for(const [progress,expected]of [[-.1,from],[0,from],[1,to],[1.1,to]]){
    const sample=sampleCameraFlight(from,to,progress,{arc:.08,yaw:.06});
    assert.ok(sample.position.equals(expected.position));assert.ok(sample.target.equals(expected.target));
    assert.notEqual(sample.position,expected.position);assert.notEqual(sample.target,expected.target);
  }
  for(let i=0;i<=100;i++){
    const sample=sampleCameraFlight(from,to,i/100,{arc:.08,yaw:.06});finite(sample.position);finite(sample.target);
    sample.position.addScalar(100);sample.target.addScalar(100);
  }
  assert.deepEqual([snapshot(from),snapshot(to)],before);
});

test('camera travel uses optical zoom pacing and avoids a full orbit across the angle seam',()=>{
  const from=pose(10,radians(179),Math.PI/2,new T.Vector3(2,3,4));
  const to=pose(160,radians(-179),Math.PI/2,new T.Vector3(12,13,14));
  const middle=sampleCameraFlight(from,to,.5),offset=middle.position.clone().sub(middle.target);
  close(radius(middle),40,1e-8,'Zoom midpoint is the geometric mean');
  assert.ok(middle.target.distanceTo(new T.Vector3(7,8,9))<1e-9);
  close(Math.abs(Math.atan2(offset.x,offset.z)),Math.PI,1e-9);
  let previousRadius=10;
  for(let i=0;i<=100;i++){
    const sample=sampleCameraFlight(from,to,i/100),distance=radius(sample),direction=sample.position.clone().sub(sample.target);
    assert.ok(distance>=previousRadius-1e-8&&distance>=10-1e-8&&distance<=160+1e-8);previousRadius=distance;
    assert.ok(Math.abs(shortestAngle(radians(179),Math.atan2(direction.x,direction.z)))<=radians(2)+1e-8);
  }
});

test('clearance and yaw create a bounded camera bow which returns to rest at both ends',()=>{
  const still=pose(40,.4,.8);
  const midpoint=sampleCameraFlight(still,still,.5,{arc:.08,yaw:.06}),direction=midpoint.position.clone().sub(midpoint.target);
  close(radius(midpoint),43.2,1e-8);
  close(shortestAngle(.4,Math.atan2(direction.x,direction.z)),.06,1e-9);
  for(let i=0;i<=100;i++){
    const sample=sampleCameraFlight(still,still,i/100,{arc:.08,yaw:.06});
    assert.ok(radius(sample)>=40-1e-8&&radius(sample)<=43.2+1e-8);
  }
  const from=pose(80,.3,.65),to=pose(20,-.5,.9,new T.Vector3(8,5,2)),h=.0001;
  const samples=[0,h,2*h,1-2*h,1-h,1].map(t=>sampleCameraFlight(from,to,t,{arc:.08,yaw:.06}));
  for(const property of ['position','target']){
    const values=samples.map(sample=>sample[property]);
    const initialVelocity=values[1].clone().sub(values[0]).divideScalar(h);
    const finalVelocity=values[5].clone().sub(values[4]).divideScalar(h);
    const initialAcceleration=values[2].clone().addScaledVector(values[1],-2).add(values[0]).divideScalar(h*h);
    const finalAcceleration=values[5].clone().addScaledVector(values[4],-2).add(values[3]).divideScalar(h*h);
    assert.ok(initialVelocity.length()<.001&&finalVelocity.length()<.001,`${property} must settle in velocity`);
    assert.ok(initialAcceleration.length()<4&&finalAcceleration.length()<4,`${property} must settle in acceleration`);
  }
});

test('near-pole and degenerate camera offsets remain finite throughout a flight',()=>{
  const cases=[
    [pose(10,0,0),pose(20,Math.PI,1e-10)],
    [pose(10,.4,Math.PI),pose(20,-.4,Math.PI-1e-10)],
    [pose(1e-12,.3,.8),pose(2e-12,-.3,.6)],
    [{position:new T.Vector3(),target:new T.Vector3()},pose(10,.5,.7)],
    [{position:new T.Vector3(),target:new T.Vector3()},{position:new T.Vector3(),target:new T.Vector3()}],
  ];
  for(const [from,to]of cases)for(let i=0;i<=50;i++){
    const sample=sampleCameraFlight(from,to,i/50,{arc:.08,yaw:.06});finite(sample.position);finite(sample.target);
    assert.ok(radius(sample)<25,'Degenerate inputs must not throw the camera far from the scene');
    if(i>0&&i<50)assert.ok(radius(sample)>0,'Interior samples need a usable look direction');
  }
});

test('interrupted-flight carry continues incoming motion and disappears before the new arrival',()=>{
  const still=pose(40,.4,.8),carryPosition=new T.Vector3(8,-3,2),carryTarget=new T.Vector3(1,2,-1),h=.000001;
  const before=[carryPosition.toArray(),carryTarget.toArray()];
  const options={carryPosition,carryTarget},start=sampleCameraFlight(still,still,0,options),early=sampleCameraFlight(still,still,h,options);
  const nearEnd=sampleCameraFlight(still,still,1-h,options),end=sampleCameraFlight(still,still,1,options);
  assert.ok(start.position.equals(still.position));assert.ok(start.target.equals(still.target));
  assert.ok(end.position.equals(still.position));assert.ok(end.target.equals(still.target));
  const initialPositionVelocity=early.position.clone().sub(start.position).divideScalar(h);
  const initialTargetVelocity=early.target.clone().sub(start.target).divideScalar(h);
  assert.ok(initialPositionVelocity.distanceTo(carryPosition)<.00005,'The replacement flight should inherit the rendered camera velocity');
  assert.ok(initialTargetVelocity.distanceTo(carryTarget)<.00002,'The look target should retain its incoming motion as well');
  assert.ok(end.position.distanceTo(nearEnd.position)/h<.00001,'Carry must not alter the resting arrival');
  assert.ok(end.target.distanceTo(nearEnd.target)/h<.00001);
  assert.deepEqual([carryPosition.toArray(),carryTarget.toArray()],before);
});
