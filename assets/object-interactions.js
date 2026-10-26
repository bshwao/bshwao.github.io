import * as T from './vendor/three.module.min.js';

const smooth = t => t * t * (3 - 2 * t);
const duration = 900;

/** Animate ranges in the existing room batches, keeping their raycast faces intact. */
export function createObjectInteractions(objects) {
  let hovered = null, reduced = false;
  const active = new Set();
  const dirtyBounds = new Set();
  const matrix = new T.Matrix4(), rotation = new T.Matrix4(), normalMatrix = new T.Matrix3();
  const tilt = new T.Matrix4(), origin = new T.Matrix4(), scale = new T.Vector3();
  const point = new T.Vector3(), normal = new T.Vector3();
  const highlight = new T.Color('#ffe1a3');
  for (const object of objects) {
    object.bounds = new T.Box3();
    for (const part of object.parts) {
      const positions = part.geometry.attributes.position;
      part.rest = positions.array.slice(part.start * 3, (part.start + part.count) * 3);
      part.normals = part.geometry.attributes.normal?.array.slice(part.start * 3, (part.start + part.count) * 3);
      for (let i = 0; i < part.rest.length; i += 3) object.bounds.expandByPoint(point.fromArray(part.rest, i));
    }
    object.pivot = object.bounds.getCenter(new T.Vector3());
    object.pivot.y = object.bounds.min.y;
    object.geometries = new Set(object.parts.map(part => part.geometry));
    object.hover = 0;
    object.illumination = 0;
    object.pulse = 0; object.wave = 0; object.progress = 1;
    object.lastTime = null;
    object.clickedAt = null;
  }
  function paint(object, hover, pulse, wave, progress=1) {
    object.pulse = pulse; object.wave = wave; object.progress = progress;
    const pivot = object.pivot;
    let lift = 0, turn = 0, lean = 0, scaleY = 1;
    if (!reduced) {
      if (object.kind === 'plant') lean = hover * .025 + wave * .11;
      if (object.kind === 'seat') turn = wave * .12;
      if (object.kind === 'sofa') scaleY = 1 - pulse * .065;
      if (object.kind === 'paper') lift = hover * .04 + pulse * .22;
      if (object.kind === 'display') turn = wave * .09;
      if (object.kind === 'spin') turn = progress<1 ? Math.PI*2*smooth(progress) : 0;
      if (object.kind === 'bounce') {lift=pulse*.45;turn=wave*.14;}
      if (object.kind === 'telescope') {turn=wave*.35;lean=wave*.07;}
    }
    rotation.makeRotationY(turn).multiply(tilt.makeRotationZ(lean));
    matrix.makeTranslation(pivot.x, pivot.y + lift, pivot.z).multiply(rotation)
      .scale(scale.set(1, scaleY, 1)).multiply(origin.makeTranslation(-pivot.x, -pivot.y, -pivot.z));
    normalMatrix.getNormalMatrix(matrix);
    const strength = Math.min(1, hover * .42 + pulse * .85);
    for (const part of object.parts) {
      const { position, normal: normals, color } = part.geometry.attributes;
      const keyDip = !reduced && part.key !== undefined ? pulse * .065 * (.6 + .4 * Math.sin(part.key * 1.7 + wave * 3)) : 0;
      for (let i = 0; i < part.count; i++) {
        const offset = i * 3, vertex = part.start + i;
        point.fromArray(part.rest, offset).applyMatrix4(matrix); point.y -= keyDip;
        position.setXYZ(vertex, point.x, point.y, point.z);
        if (normals) { normal.fromArray(part.normals, offset).applyNormalMatrix(normalMatrix); normals.setXYZ(vertex, normal.x, normal.y, normal.z); }
        // Persistent warm lamp color composes with the temporary highlight.
        // It is vertex data in the existing batches, not a light or render loop.
        color.setXYZ(vertex,
          (1 + (highlight.r - 1) * strength) * (1 + object.illumination * 1.4),
          (1 + (highlight.g - 1) * strength) * (1 + object.illumination * .7),
          (1 + (highlight.b - 1) * strength) * (1 + object.illumination * .08));
      }
      for (const attribute of [position, normals, color]) if (attribute) {
        attribute.addUpdateRange(part.start * 3, part.count * 3); attribute.needsUpdate = true;
      }
    }
    for (const geometry of object.geometries) dirtyBounds.add(geometry);
  }
  function updateBounds() {
    // Several responding objects can share a batch; scan each batch once.
    for (const geometry of dirtyBounds) {
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    }
    dirtyBounds.clear();
  }
  return {
    objects,
    resolve(hit) {
      if (!hit || hit.faceIndex == null) return null;
      const vertex = hit.faceIndex * 3;
      return hit.object.userData.objectRanges?.find(range => vertex >= range.start && vertex < range.start + range.count)?.target ?? null;
    },
    hover(object) {
      if (object === hovered) return;
      if (hovered) active.add(hovered);
      hovered = object;
      if (object) { object.lastTime = null; active.add(object); }
    },
    activate(object, time) {
      if (!object) return;
      object.clickedAt = time; object.lastTime = null; active.add(object);
    },
    update(time) {
      const changed = active.size > 0;
      for (const object of active) {
        const target = object === hovered ? 1 : 0;
        const elapsed = object.lastTime === null ? 16 : Math.max(0, time - object.lastTime);
        object.lastTime = time;
        object.hover = reduced ? target : T.MathUtils.damp(object.hover, target, 18, elapsed / 1000);
        if (Math.abs(object.hover - target) < .002) object.hover = target;
        const progress = object.clickedAt === null ? 1 : T.MathUtils.clamp((time - object.clickedAt) / duration, 0, 1);
        // A single, eased response; holding the pointer never starts an idle loop.
        const pulse = smooth(Math.sin(Math.PI * progress));
        const wave = Math.sin(progress * Math.PI * 3) * (1 - progress);
        paint(object, object.hover, pulse, wave, progress);
        if (progress === 1) object.clickedAt = null;
        if (object.hover === target && object.clickedAt === null) { active.delete(object); object.lastTime = null; }
      }
      updateBounds();
      return { changed, moving: active.size > 0 };
    },
    setReducedMotion(value) { reduced = value; if (hovered) active.add(hovered); },
    setIllumination(predicate, value) {
      const amount = value === true ? 1 : Number.isFinite(value) ? T.MathUtils.clamp(value, 0, 1) : 0;
      const matches = typeof predicate === 'function' ? predicate : object => object.name === predicate;
      let changed = false;
      for (const object of objects) {
        if (!matches(object) || object.illumination === amount) continue;
        object.illumination = amount;
        paint(object, object.hover, object.pulse, object.wave, object.progress);
        changed = true;
      }
      updateBounds();
      return changed;
    },
    reset() {
      hovered = null;
      for (const object of objects) if (object.hover || object.clickedAt !== null || active.has(object)) {
        paint(object, 0, 0, 0); object.hover = 0; object.clickedAt = null; object.lastTime = null;
      }
      updateBounds();
      active.clear();
    },
  };
}
