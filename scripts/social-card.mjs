// Deterministic vector projection for sharing artwork, independent of WebGL.
// Pipe to render-social.py to rasterize. This is artwork, not browser QA evidence.
import * as T from '../assets/vendor/three.module.min.js';
import { createTowerModel } from '../assets/tower-model.js';
import { outdoorCameraPose } from '../assets/camera-framing.js';
import { palette } from '../assets/color-theme.js';
const model = createTowerModel(); model.setCompact(true); model.root.updateMatrixWorld(true);
const pose = outdoorCameraPose('tower', 800, 720);
const camera = new T.PerspectiveCamera(34, 800 / 720, .02, 2000);
camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld();
const primitives = [], world = new T.Vector3(), projected = new T.Vector3();
const point = (position, index, matrix) => {
  world.fromBufferAttribute(position, index).applyMatrix4(matrix);
  const depth = world.clone().applyMatrix4(camera.matrixWorldInverse).z;
  projected.copy(world).project(camera);
  return { x: 480 + (projected.x + 1) * 400, y: (1 - projected.y) * 360, depth };
};
model.root.traverseVisible(object => {
  if (!object.geometry || !object.material) return;
  const material = object.material, geometry = object.geometry, position = geometry.attributes.position, colors = geometry.attributes.color;
  const indices = geometry.index, count = indices?.count ?? position.count;
  const step = object.isMesh ? 3 : object.isLineSegments ? 2 : 1;
  const normal = new T.Vector3(), normalMatrix = new T.Matrix3().getNormalMatrix(object.matrixWorld);
  for (let index = 0; index < count - (step === 1 ? 1 : 0); index += step) {
    const ids = Array.from({ length: step === 1 ? 2 : step }, (_, offset) => indices ? indices.getX(index + offset) : index + offset);
    const points = ids.map(id => point(position, id, object.matrixWorld));
    if (points.some(p => !Number.isFinite(p.x + p.y) || p.x < 440 || p.x > 1320 || p.y < -100 || p.y > 820)) continue;
    const color = material.color.clone();
    if (colors && material.vertexColors) color.multiply(new T.Color().fromBufferAttribute(colors, ids[0]));
    if (object.isMesh && geometry.attributes.normal && !material.isMeshBasicMaterial) {
      normal.fromBufferAttribute(geometry.attributes.normal, ids[0]).applyMatrix3(normalMatrix).normalize();
      color.multiplyScalar(.86 + Math.max(0, normal.dot(new T.Vector3(.3, .85, .4).normalize())) * .2);
    }
    primitives.push({ points: points.map(p => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]), depth: points.reduce((sum, p) => sum + p.depth, 0) / points.length, order: object.renderOrder, color: `#${color.getHexString()}`, alpha: material.opacity, polygon: Boolean(object.isMesh) });
  }
});
primitives.sort((a, b) => a.order - b.order || a.depth - b.depth);
process.stdout.write(JSON.stringify({ palette, primitives }));
