import * as T from './vendor/three.module.min.js';
import { footprint } from './tower-geometry.js';

/** Camera-relative atmospheric depth, confined to the decorative city. */
export function applyDistrictDepth(material, strength = .68) {
  const reference = { value: 400 };
  material.userData.districtDepth = reference;
  material.onBeforeCompile = shader => {
    shader.uniforms.districtReference = reference;
    shader.vertexShader = `varying float vDistrictDepth;\n${shader.vertexShader}`.replace(
      '#include <project_vertex>', '#include <project_vertex>\nvDistrictDepth = -mvPosition.z;');
    shader.fragmentShader = `uniform float districtReference;\nvarying float vDistrictDepth;\n${shader.fragmentShader}`.replace(
      '#include <tonemapping_fragment>',
      `float districtFade = smoothstep(districtReference - 65.0, districtReference + 125.0, vDistrictDepth) * ${strength.toFixed(3)};
       gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), districtFade);
       #include <tonemapping_fragment>`);
  };
  material.customProgramCacheKey = () => `district-depth-v1-${strength}`;
  return material;
}

/** Bake a restrained blue wash into faces; no shadow maps or extra lights. */
export function shadeDistrictGeometry(geometry, color) {
  geometry.computeVertexNormals();
  const normals = geometry.attributes.normal;
  const paper = new T.Color(color), shade = new T.Color('#b8cee6');
  const sun = new T.Vector3(50, 120, 80).normalize();
  const normal = new T.Vector3(), ink = new T.Color(), colors = [];
  for (let i = 0; i < normals.count; i++) {
    normal.fromBufferAttribute(normals, i);
    const wash = (1 - Math.max(0, normal.dot(sun))) * .3;
    colors.push(...ink.copy(paper).lerp(shade, wash).toArray());
  }
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  return geometry;
}

/** Soft contact washes, all baked into a single translucent ground mesh. */
export function createDistrictShadows(buildings, features) {
  const root = new T.Group(); root.name = 'district-contact-shadows';
  const positions = [], colors = [];
  const y = -.26;
  function triangle(a, b, c, alphaA, alphaB, alphaC) {
    for (const [point, alpha] of [[a, alphaA], [b, alphaB], [c, alphaC]]) {
      positions.push(point[0], y, point[1]); colors.push(1, 1, 1, alpha);
    }
  }
  function wash(polygon, softness, opacity) {
    const center = polygon.reduce((point, vertex) => point.add(new T.Vector2(...vertex)), new T.Vector2()).divideScalar(polygon.length);
    const outer = polygon.map(([x, z]) => {
      const offset = new T.Vector2(x, z).sub(center).normalize().multiplyScalar(softness);
      return [x + offset.x - softness * .14, z + offset.y - softness * .22];
    });
    for (let i = 0; i < polygon.length; i++) {
      const next = (i + 1) % polygon.length, a = polygon[i], b = polygon[next];
      // Reverse the plan winding so the ground wash faces upward.
      triangle(center.toArray(), b, a, opacity, opacity, opacity);
      triangle(a, b, outer[next], opacity, opacity, 0);
      triangle(a, outer[next], outer[i], opacity, 0, 0);
    }
  }
  const rectangle = (x, z, width, depth) => [[x - width / 2, z - depth / 2], [x + width / 2, z - depth / 2], [x + width / 2, z + depth / 2], [x - width / 2, z + depth / 2]];
  for (const building of buildings) for (const part of building.parts) wash(rectangle(part.x, part.z, part.width, part.depth), 2.2, .14);
  for (const feature of features.filter(feature => feature.kind === 'tree')) {
    const center = feature.bounds.getCenter(new T.Vector3());
    const radius = Math.min(1.5, (feature.bounds.max.x - feature.bounds.min.x) * .32);
    wash(Array.from({ length: 12 }, (_, i) => [center.x + Math.cos(i / 6 * Math.PI) * radius, center.z + Math.sin(i / 6 * Math.PI) * radius]), .65, .1);
  }
  // Footprint order is opposite to the rectangular parcels.
  const tower = footprint(0, 48);
  const signedArea = tower.reduce((sum, a, i) => { const b = tower[(i + 1) % tower.length]; return sum + a[0] * b[1] - b[0] * a[1]; }, 0);
  wash(signedArea > 0 ? tower : tower.reverse(), 2.4, .18);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 4));
  const material = applyDistrictDepth(new T.MeshBasicMaterial({ color: '#6f94bf', vertexColors: true, transparent: true, depthWrite: false }));
  const mesh = new T.Mesh(geometry, material); mesh.name = 'contact-washes'; mesh.renderOrder = -4; root.add(mesh);
  return {
    root,
    setPresentation(expansion, reveal) {
      material.opacity = (1 - T.MathUtils.clamp(reveal, 0, 1)) * (1 - T.MathUtils.clamp(expansion, 0, 1) * .8);
      root.visible = material.opacity > .005;
    },
  };
}
