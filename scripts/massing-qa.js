import * as T from '../assets/vendor/three.module.min.js';
import { createTowerModel } from '../assets/tower-model.js';
import { floorProfiles, towerHeight } from '../assets/tower-geometry.js';

// This is the production shell, with its facade and context removed for review.
const model = createTowerModel();
const scene = new T.Scene();
scene.add(new T.HemisphereLight('#ffffff', '#a9aba8', 2));
const light = new T.DirectionalLight('#ffffff', 2.1); light.position.set(80, 130, 90); scene.add(light);
const solid = new T.MeshLambertMaterial({ color: '#c9ceca', side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const ink = new T.LineBasicMaterial({ color: '#68726c', transparent: true, opacity: .7 });
const shell = new T.Group(); scene.add(shell);
for (const module of model.modules) for (const source of [module.mesh, ...module.caps,...module.antennas]) {
  const mesh = new T.Mesh(source.geometry, solid);
  mesh.position.copy(source.position); mesh.position.y += module.low;
  shell.add(mesh);
  const edges = new T.LineSegments(new T.EdgesGeometry(source.geometry, 12), ink);
  edges.position.copy(mesh.position); shell.add(edges);
}
const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setScissorTest(true); renderer.setClearColor('#f7f8f6', 1);
document.body.append(renderer.domElement);
const bounds = new T.Box3().setFromObject(shell);
const corners = [];
for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(new T.Vector3(x, y, z));
const poses = { top: [0, 1, 0], front: [0, 0, 1], side: [1, 0, 0], perspective: [.8, .57, 1] };
function render() {
  renderer.setSize(innerWidth, innerHeight);
  for (const element of document.querySelectorAll('.view')) {
    const rect = element.getBoundingClientRect();
    const camera = new T.OrthographicCamera(-1, 1, 1, -1, .1, 1000);
    const center = bounds.getCenter(new T.Vector3());
    if (element.dataset.view === 'top') camera.up.set(0, 0, -1);
    const direction = new T.Vector3(...poses[element.dataset.view]).normalize();
    camera.position.copy(center).addScaledVector(direction, 300); camera.lookAt(center); camera.updateMatrixWorld();
    const local = corners.map(point => point.clone().applyMatrix4(camera.matrixWorldInverse));
    const extentX = Math.max(...local.map(point => Math.abs(point.x)));
    const extentY = Math.max(...local.map(point => Math.abs(point.y)));
    const aspect = rect.width / rect.height;
    const halfY = Math.max(extentY, extentX / aspect) * 1.13;
    camera.left = -halfY * aspect; camera.right = halfY * aspect; camera.top = halfY; camera.bottom = -halfY; camera.updateProjectionMatrix();
    renderer.setViewport(rect.left, innerHeight - rect.bottom, rect.width, rect.height);
    renderer.setScissor(rect.left, innerHeight - rect.bottom, rect.width, rect.height);
    renderer.render(scene, camera);
  }
  document.querySelector('#status').textContent = `READY · ${floorProfiles.length} deliberate profiles · ${towerHeight} world units high · four views of the actual closed shell`;
  window.massingStudy = { ready: true, profiles: floorProfiles.map(({ height, polygon }) => ({ height, polygon })), geometry: renderer.info.memory.geometries };
}
render();
addEventListener('resize', render);
