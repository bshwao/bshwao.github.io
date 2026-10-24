import * as T from './vendor/three.module.min.js';
import { palette } from './color-theme.js';
import { cityPalette,citySun } from './city-palette.js';
import { readCityTime } from './city-time.js';
import { applyDistrictDepth } from './district-style.js';
import { applyGroundTexture } from './ground-materials.js';
export {cityPalette,citySun};

/** Exterior-only material/light system. Interface and occupied floors stay light. */
// Smooth local-time sky; fixed stars and analytic sun/moon discs avoid cloud noise.
export function createCityEnvironment(initialTime=readCityTime()) {
  const root=new T.Group(); root.name='city-environment';
  const paper=new T.Color(palette.paper);
  const material=new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,depthTest:false,precision:'highp',dithering:true,
    uniforms:{
      zenith:{value:new T.Color(cityPalette.zenith)},horizon:{value:new T.Color(cityPalette.horizon)},
      starVisibility:{value:1},
      sunDirection:{value:new T.Vector3()},moonDirection:{value:new T.Vector3()},
      sunVisibility:{value:0},moonVisibility:{value:0},sunColor:{value:new T.Color('#fff0ce')},
      stars:{value:Array.from({length:32},(_,i)=>{
        const azimuth=i*2.3999632297,y=.10+(i+.5)/32*.84,radius=Math.sqrt(1-y*y);
        return new T.Vector3(Math.cos(azimuth)*radius,y,Math.sin(azimuth)*radius);
      })},
    },
    vertexShader:`varying highp vec3 skyDirection;
      void main(){skyDirection=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position=p.xyww;}`,
    fragmentShader:`varying highp vec3 skyDirection;
      uniform vec3 zenith,horizon,stars[32],sunDirection,moonDirection,sunColor;
      uniform float starVisibility,sunVisibility,moonVisibility;
      #include <common>
      #include <dithering_pars_fragment>
      void main(){
        vec3 d=normalize(skyDirection);
        vec3 sky=mix(horizon,zenith,smoothstep(-.08,.72,d.y));
        float edge=max(length(fwidth(d))*.65,.00015),starlight=0.0;
        if(starVisibility>.001)for(int i=0;i<32;i++)starlight+=1.0-smoothstep(.0010-edge,.0010+edge,length(d-stars[i]));
        sky=mix(sky,vec3(.60,.71,.88),clamp(starlight*.65*starVisibility,0.0,1.0));
        float sunDistance=length(d-sunDirection),moonDistance=length(d-moonDirection);
        sky+=sunColor*exp(-sunDistance*sunDistance*550.0)*.13*sunVisibility;
        sky=mix(sky,sunColor,(1.0-smoothstep(.010-edge,.010+edge,sunDistance))*sunVisibility);
        float moonDisc=1.0-smoothstep(.008-edge,.008+edge,moonDistance);
        float moonShade=sqrt(max(0.0,1.0-pow(moonDistance/.008,2.0)));
        sky+=vec3(.22,.30,.44)*exp(-moonDistance*moonDistance*1200.0)*.07*moonVisibility;
        sky=mix(sky,vec3(.58,.68,.82)*(.72+.28*moonShade),moonDisc*moonVisibility);
        gl_FragColor=vec4(sky,1.0);
        #include <colorspace_fragment>
        #include <dithering_fragment>
      }`,
  });
  const sky=new T.Mesh(new T.BoxGeometry(2,2,2),material);sky.name='local-time-sky';sky.frustumCulled=false;sky.renderOrder=-100;root.add(sky);
  const groundMaterial=applyGroundTexture(applyDistrictDepth(new T.MeshBasicMaterial({color:'#7b8b70',transparent:true}),.98),'terrain');
  const ground=new T.Mesh(new T.PlaneGeometry(12000,12000),groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.82;ground.renderOrder=-20;ground.name='city-ground';root.add(ground);
  let timeState=initialTime;
  const setTime=state=>{
    timeState=state;
    material.uniforms.sunDirection.value.fromArray(state.sunDirection);
    material.uniforms.moonDirection.value.fromArray(state.moonDirection);
    material.uniforms.sunColor.value.set(state.keyColor);
  };
  setTime(initialTime);
  return {root,sky,setTime,update(camera,visibility){
    sky.position.copy(camera.position);root.visible=visibility>.001;
    material.uniforms.zenith.value.set(timeState.zenith).lerp(paper,1-visibility);
    material.uniforms.horizon.value.set(timeState.horizon).lerp(paper,1-visibility);
    material.uniforms.starVisibility.value=visibility*timeState.stars;
    material.uniforms.sunVisibility.value=visibility*timeState.sunVisibility;
    material.uniforms.moonVisibility.value=visibility*timeState.moonVisibility;
    groundMaterial.opacity=visibility;
  }};
}

/** Crisp physical bays and fixed, grouped warm windows on the main elevations. */
export function applyTowerGlazing(material,sectionLow) {
  material.precision='highp';
  const night={value:0};material.userData.cityNight=night;
  material.onBeforeCompile=shader=>{
    shader.uniforms.towerSectionLow={value:sectionLow};
    shader.uniforms.towerNight=night;
    shader.vertexShader=`attribute vec3 towerNightColor;varying vec3 nightFacadeColor;\n${shader.vertexShader}`.replace('#include <color_vertex>','#include <color_vertex>\nnightFacadeColor=towerNightColor;');
    shader.fragmentShader=`varying vec3 nightFacadeColor;\n${shader.fragmentShader}`;
    shader.vertexShader=`uniform float towerSectionLow;varying vec3 towerPoint;varying vec3 towerNormal;\n${shader.vertexShader}`.replace('#include <begin_vertex>',`#include <begin_vertex>\ntowerPoint=position+vec3(0.0,towerSectionLow,0.0);towerNormal=normal;`);
    shader.fragmentShader=`uniform float towerNight;varying vec3 towerPoint;varying vec3 towerNormal;\n${shader.fragmentShader}`.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 n=normalize(towerNormal);
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuse*nightFacadeColor,towerNight);
      float across=abs(n.x)>.5?towerPoint.z:towerPoint.x;
      vec2 cell=vec2(across/1.4,towerPoint.y/1.7);
      vec2 f=fract(cell);
      float pane=step(.12,f.x)*step(f.x,.88)*step(.12,f.y)*step(f.y,.84)*(1.0-step(.4,abs(n.y)));
      float group=fract(sin(dot(floor(cell/vec2(4.0,3.0)),vec2(13.7,67.1)))*43758.5453);
      float lit=step(.84,group);
      diffuseColor.rgb*=mix(.52,1.12,pane);
      diffuseColor.rgb+=vec3(.12,.055,.012)*lit*pane;
    `).replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.85,.45,.13)*lit*pane*towerNight*.75;');
  };
  material.customProgramCacheKey=()=>`tower-glazing-v3`;
  return material;
}
