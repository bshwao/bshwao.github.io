import * as T from './vendor/three.module.min.js';
import { cityPalette } from './city-environment.js';
import { towerHeight } from './tower-geometry.js';
const tau=Math.PI*2;
const metal=new T.Color(cityPalette.metal),glass=new T.Color(cityPalette.glazing),gold=new T.Color(cityPalette.reflection),cool=new T.Color('#637c9d');
const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
const variation=seed=>{const n=Math.sin(seed*127.1+311.7)*43758.5453;return n-Math.floor(n);};

/** Whole-elevation charcoal/glass with a warm western reflection and cool return. */
export function facadeColor(angle,height,target=new T.Color(),position=null) {
  const azimuth=(angle%tau+tau)%tau,y=height/towerHeight;
  const front=smooth(.05,.7,azimuth)*(1-smooth(2.2,2.85,azimuth));
  const rear=smooth(3.2,3.6,azimuth)*(1-smooth(5.4,5.9,azimuth));
  const reflection=front*(.16+.63*Math.exp(-Math.pow((y-.42)/.25,2)));
  target.copy(metal).lerp(glass,front*.65+rear*.4).lerp(gold,reflection).lerp(cool,rear*.17);
  const bay=position?Math.floor(position.x/1.4)*17+Math.floor(position.z/1.4)*31:Math.floor(azimuth/tau*96);
  return target.multiplyScalar(.96+variation(bay*19+Math.floor(height/1.7)*71)*.08);
}
