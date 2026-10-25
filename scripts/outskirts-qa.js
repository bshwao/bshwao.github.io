import * as T from '../assets/vendor/three.module.min.js';
import { createTowerModel } from '../assets/tower-model.js';
import { createCityEnvironment } from '../assets/city-environment.js';
import { readCityTime } from '../assets/city-time.js';
import { islandZoomLimit, cameraDepthRange } from '../assets/camera-framing.js';
import { citySceneryRadius, islandFramingRadius } from '../assets/city-geography.js';
import { renderBudget } from '../assets/render-budget.js';

// Keep one production model, environment and pair of cameras for every review.
const model = createTowerModel(), scene = new T.Scene(), environment = createCityEnvironment();
scene.add(model.root, environment.root);
for (const module of model.modules) {
  module.interior.group.visible = false; module.capPlans.group.visible = false;
  module.caps[0].visible = module.index === 4;
}
const ambient = new T.HemisphereLight(), sun = new T.DirectionalLight(), fill = new T.DirectionalLight();
scene.add(ambient, sun, fill);
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.localClippingEnabled = true; document.body.append(renderer.domElement);
const perspective = new T.PerspectiveCamera(), aerial = new T.OrthographicCamera();
const target = new T.Vector3(), header = document.querySelector('header');
const view = document.querySelector('#view'), hour = document.querySelector('#hour');
const angle = document.querySelector('#angle'), graphics = document.querySelector('#graphics'), status = document.querySelector('#status');

function render() {
  const width = innerWidth, height = Math.max(1, innerHeight - header.getBoundingClientRect().height), aspect = width / height;
  const low = graphics.value === 'low', budget = renderBudget(width, height, devicePixelRatio, graphics.value);
  const time = readCityTime(new Date(2026, 9, 24, Number(hour.value)));
  // The plan camera has parallel rays; use a lit sea backdrop for this
  // diagnostic view. Production perspective views retain the analytic ocean.
  scene.background=view.value==='aerial'?new T.Color(time.haze).lerp(new T.Color('#285c76'),.42).multiplyScalar(.5+time.daylight*.5):null;
  environment.sky.visible=view.value!=='aerial';
  renderer.setPixelRatio(Math.min(budget.pixelRatio, 1.5)); renderer.setSize(width, height);
  model.setCompact(budget.compact); environment.setLowGraphics(low); environment.setTime(time);
  ambient.color.set(time.ambient); ambient.groundColor.set('#6f7974'); ambient.intensity = time.ambientIntensity;
  sun.color.set(time.keyColor); sun.intensity = time.keyIntensity;
  sun.position.fromArray(time.daylight > .1 ? time.sunDirection : time.moonDirection).multiplyScalar(500);
  fill.color.set(time.fill); fill.intensity = .3 + time.daylight * .3; fill.position.set(-80, 30, -60);

  let camera;
  const regional = view.value === 'island' || view.value === 'archipelago';
  angle.disabled = !regional;
  if (view.value === 'aerial') {
    const size = Math.max(920, 920 / aspect);
    Object.assign(aerial, { left: -size * aspect, right: size * aspect, top: size, bottom: -size });
    aerial.up.set(0, 0, -1); aerial.position.set(0, 1500, 0); camera = aerial;
  } else {
    perspective.fov = regional ? 34 : 40; perspective.aspect = aspect;
    if (regional) {
      const radius = view.value === 'archipelago' ? citySceneryRadius / islandFramingRadius : 1;
      const distance = islandZoomLimit(width, height) * .90 * radius;
      // Compass values describe the camera's location: north is -Z, east +X.
      perspective.position.setFromSphericalCoords(distance, .75, Math.PI - T.MathUtils.degToRad(Number(angle.value)));
    } else {
      perspective.position.copy(view.value === 'west' ? new T.Vector3(-1100, 650, 250)
        : view.value === 'rear' ? new T.Vector3(250, 650, -1100) : new T.Vector3(650, 650, 1100));
    }
    camera = perspective;
  }
  const { near, far } = cameraDepthRange(camera.position.distanceTo(target));
  camera.near = near; camera.far = far; camera.lookAt(target); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  environment.update(camera, 1);
  scene.traverse(node => {
    for (const material of node.material ? Array.isArray(node.material) ? node.material : [node.material] : []) {
      if (material.userData.districtDepth) material.userData.districtDepth.value = camera.position.distanceTo(target);
      const refs = material.userData.cityLighting;
      if (refs) { refs.tint.value.set(time.tint); refs.haze.value.set(time.haze); refs.night.value = time.night; }
      if (material.userData.cityNight) material.userData.cityNight.value = time.night;
    }
  });
  renderer.render(scene, camera);
  const direction = regional ? angle.selectedOptions[0].textContent : view.selectedOptions[0].textContent;
  status.textContent = `READY · ${direction} · ${time.phase} · ${graphics.value} · ${renderer.info.render.calls} draws · ${renderer.info.render.triangles.toLocaleString('en-CA')} triangles`;
  Object.assign(status.dataset, { view: view.value, angle: angle.value, graphics: graphics.value,
    calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, near, far });
}
for (const control of [view, hour, angle, graphics]) control.addEventListener('change', render);
addEventListener('resize', render); render();
addEventListener('pagehide', () => {
  const geometries = new Set(environment.terrainGeometries), materials = new Set();
  for (const module of model.modules) { geometries.add(module.lineGeometry); geometries.add(module.coarseLineGeometry); }
  scene.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of node.material ? Array.isArray(node.material) ? node.material : [node.material] : []) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  renderer.dispose();
}, { once: true });
