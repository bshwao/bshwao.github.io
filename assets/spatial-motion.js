import * as T from './vendor/three.module.min.js';

export const motionEase = value => {
  const t=T.MathUtils.clamp(value,0,1);
  return t*t*t*(t*(t*6-15)+10);
};
export const motionPhase = (t,start,end) => motionEase((t-start)/(end-start));
export const shortestAngle = (from,to) => T.MathUtils.euclideanModulo(to-from+Math.PI,Math.PI*2)-Math.PI;

/** A short top-down peel; the reverse stacks the lower floors first. */
export function staggerProgress(progress,index,count,expanding=true){
  const rank=expanding?index:count-1-index;
  const delay=count>1?.16*rank/(count-1):0;
  return motionPhase(progress,delay,.84+delay);
}

/** Orbit the moving subject rather than cutting a chord through it.
 * Radius blends optically in log space. The small clearance/yaw bow has
 * zero velocity and acceleration at either end, without spring overshoot.
 */
export function sampleCameraFlight(from,to,progress,{arc=0,yaw=0,carryPosition,carryTarget}={}){
  const t=T.MathUtils.clamp(progress,0,1);
  if(t===0)return {position:from.position.clone(),target:from.target.clone()};
  if(t===1)return {position:to.position.clone(),target:to.target.clone()};
  const e=motionEase(t),bump=64*t*t*t*(1-t)**3;
  const a=new T.Spherical().setFromVector3(from.position.clone().sub(from.target));
  const b=new T.Spherical().setFromVector3(to.position.clone().sub(to.target));
  if(a.radius<1e-4){a.theta=b.theta;a.phi=b.phi;}
  if(b.radius<1e-4){b.theta=a.theta;b.phi=a.phi;}
  const radius=Math.exp(T.MathUtils.lerp(Math.log(Math.max(a.radius,1e-4)),Math.log(Math.max(b.radius,1e-4)),e))*(1+Math.max(0,arc)*bump);
  const target=new T.Vector3().lerpVectors(from.target,to.target,e);
  const offset=new T.Vector3().setFromSphericalCoords(radius,T.MathUtils.lerp(a.phi,b.phi,e),a.theta+shortestAngle(a.theta,b.theta)*e+yaw*bump);
  const position=target.clone().add(offset),carry=t*(1-t)**3;
  if(carryPosition)position.addScaledVector(carryPosition,carry);
  if(carryTarget)target.addScaledVector(carryTarget,carry);
  return {position,target};
}
