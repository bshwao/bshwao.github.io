import * as T from './vendor/three.module.min.js';

/** Blur only the scenery, at a bounded resolution, keeping the portfolio sharp. */
export function createCityBackdrop(renderer, backgrounds, foregrounds) {
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blur = new T.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { source: { value: null }, step: { value: new T.Vector2() } },
    vertexShader: 'varying vec2 uvPoint; void main(){uvPoint=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
    fragmentShader: `varying vec2 uvPoint; uniform sampler2D source; uniform vec2 step;
      void main(){
        vec4 color=texture2D(source,uvPoint)*.103152619;
        color+=(texture2D(source,uvPoint+step*1.476580)+texture2D(source,uvPoint-step*1.476580))*.191010813;
        color+=(texture2D(source,uvPoint+step*3.445530)+texture2D(source,uvPoint-step*3.445530))*.140428908;
        color+=(texture2D(source,uvPoint+step*5.414899)+texture2D(source,uvPoint-step*5.414899))*.080715463;
        color+=(texture2D(source,uvPoint+step*7.384912)+texture2D(source,uvPoint-step*7.384912))*.036268507;
        gl_FragColor=color;
        #include <colorspace_fragment>
      }`,
  });
  // Weather belongs to the city image. The occupied floor is drawn afterwards,
  // so its walls, furniture and glazing naturally cover every rain streak.
  const composite = new T.ShaderMaterial({
    depthTest:false,depthWrite:false,toneMapped:false,
    uniforms:{source:{value:null},resolution:{value:new T.Vector2()},rain:{value:0},night:{value:0},time:{value:0}},
    vertexShader:'varying vec2 uvPoint; void main(){uvPoint=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
    fragmentShader:`varying vec2 uvPoint;
      uniform sampler2D source;
      uniform vec2 resolution;
      uniform float rain,night,time;
      float rainHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float rainLayer(vec2 pixel,float scale,float speed){
        vec2 p=vec2(pixel.x+pixel.y*.16,pixel.y+time*speed)*scale;
        vec2 cell=floor(p/vec2(70.0,180.0)),f=fract(p/vec2(70.0,180.0));
        float across=abs(f.x-(.12+.76*rainHash(cell)))*70.0;
        float along=(f.y-(.16+.68*rainHash(cell+17.0)))*180.0;
        return (1.0-smoothstep(.3,1.0,across))*smoothstep(-25.0,-20.0,along)
          *(1.0-smoothstep(0.0,1.0,along))*(.35+.65*rainHash(cell+31.0));
      }
      void main(){
        vec4 color=texture2D(source,uvPoint);
        // Keep the lit windows warm while the streets and sky become night.
        float warm=clamp((color.r-max(color.g,color.b))*4.0,0.0,1.0);
        vec3 nightColor=mix(color.rgb*vec3(.20,.28,.43),color.rgb*.85,warm);
        color.rgb=mix(color.rgb,nightColor,night);
        if(rain>.001){
          vec2 pixel=uvPoint*resolution;
          float streak=rainLayer(pixel,1.0,380.0)*.55+rainLayer(pixel+vec2(43.0,71.0),.64,260.0)*.75;
          color.rgb=mix(color.rgb,vec3(.43,.59,.73),clamp(streak*rain*.48,0.0,.7));
        }
        gl_FragColor=color;
        #include <colorspace_fragment>
      }`,
  });
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), composite); scene.add(quad);
  let source, scratch, width = 0, height = 0, cache = '', lowGraphics = false;
  const size = new T.Vector2();
  const resolution = new T.Vector2();
  function resize() {
    renderer.getSize(size);
    // Match the canvas's bounded drawing buffer, including its device-pixel ratio.
    // A lightly blurred city should not be enlarged from a coarse thumbnail.
    renderer.getDrawingBufferSize(resolution);
    const scale = lowGraphics ? .5 : 1;
    const nextWidth = Math.max(1, Math.floor(resolution.x * scale)), nextHeight = Math.max(1, Math.floor(resolution.y * scale));
    if (width === nextWidth && height === nextHeight) return;
    width = nextWidth; height = nextHeight; cache = '';
    if (!source) {
      source = new T.WebGLRenderTarget(width, height);
      scratch = new T.WebGLRenderTarget(width, height, { depthBuffer: false });
      source.texture.name = 'blurred-city'; scratch.texture.name = 'city-blur-horizontal';
      source.texture.colorSpace = scratch.texture.colorSpace = T.LinearSRGBColorSpace;
      composite.uniforms.source.value = source.texture;
    } else { source.setSize(width, height); scratch.setSize(width, height); }
    composite.uniforms.resolution.value.copy(size);
  }
  return {
    render(world, view, amount, beforeBackground, beforeForeground) {
      resize(); view.updateMatrixWorld();
      const key = `${view.matrixWorld.elements}:${view.projectionMatrix.elements}:${amount.toFixed(5)}`;
      const previousTarget = renderer.getRenderTarget(), autoClear = renderer.autoClear;
      const visibility = [...backgrounds, ...foregrounds].map(root => root.visible);
      try {
        renderer.autoClear = true;
        if (key !== cache) {
          beforeBackground();
          backgrounds.forEach(root => { root.visible = true; });
          foregrounds.forEach(root => { root.visible = false; });
          renderer.setRenderTarget(source); renderer.render(world, view);
          if (!lowGraphics) {
            quad.material = blur;
            blur.uniforms.source.value = source.texture;
            // Densely sampled gentle defocus, with spacing in CSS pixels.
            blur.uniforms.step.value.set(amount / size.x, 0);
            renderer.setRenderTarget(scratch); renderer.render(scene, camera);
            blur.uniforms.source.value = scratch.texture;
            blur.uniforms.step.value.set(0, amount / size.y);
            renderer.setRenderTarget(source); renderer.render(scene, camera);
          }
          cache = key;
        }
        quad.material = composite;
        renderer.setRenderTarget(previousTarget); renderer.render(scene, camera);
        [...backgrounds, ...foregrounds].forEach((root, i) => { root.visible = visibility[i]; });
        backgrounds.forEach(root => { root.visible = false; });
        beforeForeground();
        renderer.autoClear = false; renderer.clearDepth(); renderer.render(world, view);
      } finally {
        [...backgrounds, ...foregrounds].forEach((root, i) => { root.visible = visibility[i]; });
        renderer.setRenderTarget(previousTarget); renderer.autoClear = autoClear;
      }
    },
    setLowGraphics(value) { if (lowGraphics !== value) { lowGraphics = value; cache = ''; } },
    setWeather({rain=false,night=0}={}){
      const amount=rain?1:0,darkness=Number.isFinite(night)?T.MathUtils.clamp(night,0,1):0;
      const changed=composite.uniforms.rain.value!==amount||composite.uniforms.night.value!==darkness;
      composite.uniforms.rain.value=amount;composite.uniforms.night.value=darkness;
      return changed;
    },
    setWeatherTime(seconds){composite.uniforms.time.value=Number.isFinite(seconds)?seconds:0;},
    weatherState(){return {rain:composite.uniforms.rain.value===1,night:composite.uniforms.night.value,time:composite.uniforms.time.value};},
    metrics() { return { width, height, blurPasses: lowGraphics ? 0 : 2 }; },
    invalidate() { cache=''; },
    dispose() { source?.dispose(); scratch?.dispose(); quad.geometry.dispose(); blur.dispose(); composite.dispose(); },
  };
}
