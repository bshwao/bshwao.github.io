import * as T from './vendor/three.module.min.js';
import { palette } from './color-theme.js';

/** Exterior-only material/light system. Interface and occupied floors stay light. */
export const cityPalette = Object.freeze({
  zenith: '#071225', horizon: '#253a59', haze: '#2c3e56',
  sunlight: '#ffd39a',
  metal: '#252a34', glazing: '#3d526c', reflection: '#e3ae64',
  brick: '#9a6653', limestone: '#c5b49b', concrete: '#9faaa9', bronze: '#8e7965',
  roof: '#636873', road: '#555c66', pavement: '#a9aaa3', foliage: '#455e4e',
});
export const citySun = new T.Vector3(-65,82,100).normalize();

// A smooth night sky with fixed star directions; no cloud noise or image texture.
export function createCityEnvironment() {
  const root=new T.Group(); root.name='city-environment';
  const paper=new T.Color(palette.paper);
  const material=new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,depthTest:false,precision:'highp',dithering:true,
    uniforms:{
      zenith:{value:new T.Color(cityPalette.zenith)},horizon:{value:new T.Color(cityPalette.horizon)},
      starVisibility:{value:1},
      stars:{value:Array.from({length:32},(_,i)=>{
        const azimuth=i*2.3999632297,y=.10+(i+.5)/32*.84,radius=Math.sqrt(1-y*y);
        return new T.Vector3(Math.cos(azimuth)*radius,y,Math.sin(azimuth)*radius);
      })},
    },
    vertexShader:`varying highp vec3 skyDirection;
      void main(){skyDirection=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position=p.xyww;}`,
    fragmentShader:`varying highp vec3 skyDirection;
      uniform vec3 zenith,horizon,stars[32];
      uniform float starVisibility;
      #include <common>
      #include <dithering_pars_fragment>
      void main(){
        vec3 d=normalize(skyDirection);
        vec3 sky=mix(horizon,zenith,smoothstep(-.08,.72,d.y));
        float edge=max(length(fwidth(d))*.65,.00015),starlight=0.0;
        for(int i=0;i<32;i++){
          starlight+=1.0-smoothstep(.0010-edge,.0010+edge,length(d-stars[i]));
        }
        sky=mix(sky,vec3(.60,.71,.88),clamp(starlight*.65*starVisibility,0.0,1.0));
        gl_FragColor=vec4(sky,1.0);
        #include <colorspace_fragment>
        #include <dithering_fragment>
      }`,
  });
  const sky=new T.Mesh(new T.BoxGeometry(2,2,2),material);sky.name='night-sky';sky.frustumCulled=false;sky.renderOrder=-100;root.add(sky);
  const groundMaterial=new T.MeshBasicMaterial({color:cityPalette.pavement,transparent:true});
  const ground=new T.Mesh(new T.PlaneGeometry(1400,1400),groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.82;ground.renderOrder=-20;ground.name='city-ground';root.add(ground);
  return {root,sky,update(camera,visibility){
    sky.position.copy(camera.position);root.visible=visibility>.001;
    material.uniforms.zenith.value.set(cityPalette.zenith).lerp(paper,1-visibility);
    material.uniforms.horizon.value.set(cityPalette.horizon).lerp(paper,1-visibility);
    material.uniforms.starVisibility.value=visibility;
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
