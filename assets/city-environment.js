import * as T from './vendor/three.module.min.js';
import { palette } from './color-theme.js';

/** Exterior-only material/light system. Interface and occupied floors stay light. */
export const cityPalette = Object.freeze({
  zenith: '#5278ae', horizon: '#d8af9d', haze: '#a9acb8',
  cloudLight: '#ffe0b4', cloudShade: '#a693af', sunlight: '#ffd39a',
  metal: '#252a34', glazing: '#3d526c', reflection: '#e3ae64',
  brick: '#9a6653', limestone: '#c5b49b', concrete: '#9faaa9', bronze: '#8e7965',
  roof: '#636873', road: '#555c66', pavement: '#a9aaa3', foliage: '#455e4e',
});
export const citySun = new T.Vector3(-65,82,100).normalize();

// Fixed world-direction clouds: no animation, images, textures or extra render pass.
export function createCityEnvironment() {
  const root=new T.Group(); root.name='city-environment';
  const paper=new T.Color(palette.paper);
  const material=new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,depthTest:false,
    uniforms:Object.fromEntries(['zenith','horizon','cloudLight','cloudShade'].map(key=>[key,{value:new T.Color(cityPalette[key])}])),
    vertexShader:`varying vec3 skyDirection;
      void main(){skyDirection=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position=p.xyww;}`,
    fragmentShader:`varying vec3 skyDirection;
      uniform vec3 zenith,horizon,cloudLight,cloudShade;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float cloud(vec2 p){return noise(p)*.52+noise(p*2.13+7.4)*.27+noise(p*4.31-3.2)*.14+noise(p*8.47+1.8)*.07;}
      void main(){
        vec3 d=normalize(skyDirection);
        vec3 sky=mix(horizon,zenith,smoothstep(-.03,.32,d.y));
        vec2 uv=d.xz*5.0+vec2(0.0,d.y*13.0);
        float n=cloud(uv+vec2(8.2,-3.1));
        float mass=smoothstep(.49,.61,n)*smoothstep(-.015,.08,d.y)*(1.0-smoothstep(.7,.95,d.y));
        float light=clamp(.52+(n-cloud(uv+vec2(8.06,-3.35)))*4.0,0.0,1.0);
        vec3 clouds=mix(cloudShade,cloudLight,light);
        sky=mix(sky,clouds,mass*.91);
        gl_FragColor=vec4(sky,1.0);
        #include <colorspace_fragment>
      }`,
  });
  const sky=new T.Mesh(new T.BoxGeometry(2,2,2),material);sky.name='sunset-sky';sky.frustumCulled=false;sky.renderOrder=-100;root.add(sky);
  const groundMaterial=new T.MeshBasicMaterial({color:cityPalette.pavement,transparent:true});
  const ground=new T.Mesh(new T.PlaneGeometry(1400,1400),groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.82;ground.renderOrder=-20;ground.name='city-ground';root.add(ground);
  return {root,sky,update(camera,visibility){
    sky.position.copy(camera.position);root.visible=visibility>.001;
    material.uniforms.zenith.value.set(cityPalette.zenith).lerp(paper,1-visibility);
    material.uniforms.horizon.value.set(cityPalette.horizon).lerp(paper,1-visibility);
    material.uniforms.cloudLight.value.set(cityPalette.cloudLight).lerp(paper,1-visibility);
    material.uniforms.cloudShade.value.set(cityPalette.cloudShade).lerp(paper,1-visibility);
    groundMaterial.opacity=visibility;
  }};
}

/** Crisp physical bays and fixed, grouped warm windows on the main elevations. */
export function applyTowerGlazing(material,sectionLow) {
  material.onBeforeCompile=shader=>{
    shader.uniforms.towerSectionLow={value:sectionLow};
    shader.vertexShader=`uniform float towerSectionLow;varying vec3 towerPoint;varying vec3 towerNormal;\n${shader.vertexShader}`.replace('#include <begin_vertex>',`#include <begin_vertex>\ntowerPoint=position+vec3(0.0,towerSectionLow,0.0);towerNormal=normal;`);
    shader.fragmentShader=`varying vec3 towerPoint;varying vec3 towerNormal;\n${shader.fragmentShader}`.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 n=normalize(towerNormal);
      float across=abs(n.x)>.5?towerPoint.z:towerPoint.x;
      vec2 cell=vec2(across/1.4,towerPoint.y/1.7);
      vec2 f=fract(cell);
      float pane=step(.12,f.x)*step(f.x,.88)*step(.12,f.y)*step(f.y,.84)*(1.0-step(.4,abs(n.y)));
      float group=fract(sin(dot(floor(cell/vec2(4.0,3.0)),vec2(13.7,67.1)))*43758.5453);
      float lit=step(.84,group);
      diffuseColor.rgb*=mix(.52,1.12,pane);
      diffuseColor.rgb+=vec3(.12,.055,.012)*lit*pane;
    `);
  };
  material.customProgramCacheKey=()=>`tower-glazing-v1`;
  return material;
}
