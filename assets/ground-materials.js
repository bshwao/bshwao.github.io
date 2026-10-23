/** World-anchored surface detail, filtered with screen derivatives to avoid moiré. */
export function applyGroundTexture(material,kind='stone') {
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey;
  material.precision='highp';material.userData.groundSurface=kind;
  material.onBeforeCompile=shader=>{
    compile.call(material,shader);
    if(kind==='mixed') {
      shader.vertexShader=`attribute float surfaceKind;varying float vSurfaceKind;\n${shader.vertexShader}`.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurfaceKind=surfaceKind;');
      shader.fragmentShader=`varying float vSurfaceKind;\n${shader.fragmentShader}`;
    }
    shader.vertexShader=`varying highp vec2 groundPoint;\n${shader.vertexShader}`.replace('#include <begin_vertex>','#include <begin_vertex>\ngroundPoint=(modelMatrix*vec4(transformed,1.0)).xz;');
    shader.fragmentShader=`varying highp vec2 groundPoint;
      float groundHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
      float groundNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(groundHash(i),groundHash(i+vec2(1,0)),f.x),mix(groundHash(i+vec2(0,1)),groundHash(i+vec2(1,1)),f.x),f.y);}
      ${shader.fragmentShader}`.replace('#include <color_fragment>',`#include <color_fragment>
        vec2 gp=groundPoint;
        float footprint=max(length(fwidth(gp)),.001);
        float fine=(groundHash(floor(gp*7.0))-.5)*(1.0-smoothstep(.035,.25,footprint));
        ${kind==='terrain'?`
          float grass=groundNoise(gp*.15)*.16+groundNoise(gp*.65)*.06;
          diffuseColor.rgb*=.84+grass+fine*.06;
        `:kind==='asphalt'?`
          diffuseColor.rgb*=.94+groundNoise(gp*.6)*.07+fine*.075;
        `:kind==='water'?`
          float ripple=sin(gp.x*.65+sin(gp.y*.12)*2.0)*sin(gp.y*1.3);
          diffuseColor.rgb*=.96+ripple*.035+groundNoise(gp*.16)*.06;
        `:`
          vec2 tile=abs(fract(gp/3.0+.5)-.5)*3.0;
          float seam=(1.0-smoothstep(.025-footprint*.6,.025+footprint*.6,min(tile.x,tile.y)))*(1.0-smoothstep(.12,1.4,footprint));
          float slab=groundHash(floor(gp/3.0));
          float stone=.94+slab*.10-seam*.15+fine*.025;
          ${kind==='mixed'?'float asphalt=.94+groundNoise(gp*.6)*.07+fine*.075;diffuseColor.rgb*=mix(stone,asphalt,step(.5,vSurfaceKind));':'diffuseColor.rgb*=stone;'}
        `}
      `);
  };
  material.customProgramCacheKey=()=>`${cache.call(material)}-ground-${kind}-v1`;
  return material;
}
