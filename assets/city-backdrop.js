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
  const composite = new T.MeshBasicMaterial({ depthTest: false, depthWrite: false, toneMapped: false });
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
      composite.map = source.texture; composite.needsUpdate = true;
    } else { source.setSize(width, height); scratch.setSize(width, height); }
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
    metrics() { return { width, height, blurPasses: lowGraphics ? 0 : 2 }; },
    invalidate() { cache=''; },
    dispose() { source?.dispose(); scratch?.dispose(); quad.geometry.dispose(); blur.dispose(); composite.dispose(); },
  };
}
