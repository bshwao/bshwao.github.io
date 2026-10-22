import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as T from '../assets/vendor/three.module.min.js';
import { palette, sectionColors } from '../assets/color-theme.js';
import { createTowerModel } from '../assets/tower-model.js';
import { applyDistrictDepth } from '../assets/district-style.js';
import { createFloorPlan } from '../assets/floor-plans.js';
import { JSDOM } from 'jsdom';
import { simulateVision, visionMatrices } from './vision-simulation.js';

const luminance = hex => {
  const linear = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
};
const contrast = (a, b) => { const values = [luminance(a), luminance(b)].sort((a, b) => b - a); return (values[0] + .05) / (values[1] + .05); };

test('reading and interactive ink retain text contrast on paper and section fills', () => {
  for (const ink of [palette.ink, palette.muted, ...Object.values(sectionColors).map(theme => theme.ink)]) {
    for (const paper of [palette.paper, palette.raised, ...Object.values(sectionColors).map(theme => theme.tint)]) {
      assert.ok(contrast(ink, paper) >= 4.5, `${ink} on ${paper}: ${contrast(ink, paper).toFixed(2)}`);
    }
  }
});

test('both script-free entry documents include the generated palette and shared color system', async () => {
  for (const file of ['index.html', 'reading.html']) {
    const html = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.ok(html.includes('href="./assets/theme.css"'));
    assert.ok(html.includes('href="./assets/color-system.css"'));
    assert.ok(html.includes(`name="theme-color" content="${palette.paper}"`));
  }
});

test('facade and cut-plan colors survive compact detail without extra geometry or draws', () => {
  const model = createTowerModel();
  for (const module of model.modules) {
    assert.equal(typeof module.theme, 'string', 'Material colors preserve the accessible section description');
    assert.equal(module.colors, sectionColors[module.id]);
    const colors = module.mesh.geometry.attributes.color;
    assert.equal(colors.count, module.mesh.geometry.attributes.position.count);
    const swatches = new Set();
    for (let i = 0; i < colors.count; i++) swatches.add(new T.Color().fromBufferAttribute(colors, i).getHexString());
    assert.ok(swatches.has(palette.teal.slice(1)) && swatches.has(palette.structure.slice(1)));
    assert.ok(swatches.size >= 3, 'Facade includes glazing, structure and warm detail');
    const body = module.mesh.geometry, plate = module.base.geometry, original = [...colors.array];
    model.setCompact(true); model.setCompact(false);
    assert.equal(module.mesh.geometry, body); assert.equal(module.base.geometry, plate);
    assert.deepEqual([...colors.array], original, 'Quality changes preserve facade colors');
    assert.equal(module.capPlans.group.children.length, 2, 'Colored plans retain two draws');
    const furniture = module.capPlans.group.children[1].geometry.attributes.color;
    assert.ok(furniture.count > 0);
    assert.ok(module.interior.rooms.every(room => room.surfaces.length <= 4), 'Rooms retain four batched surface draws');
    const roomColors = new Set(module.interior.rooms.flatMap(room => room.surfaces.map(surface => surface.color.getHexString())));
    assert.ok(roomColors.has(palette.timber.slice(1)) && roomColors.has(palette.coral.slice(1)) && roomColors.has(palette.glass.slice(1)));
  }
});

test('district shaders fade toward the same paper used by the website and canvas', () => {
  const material = applyDistrictDepth(new T.MeshBasicMaterial());
  const shader = { uniforms: {}, vertexShader: '#include <project_vertex>', fragmentShader: '#include <tonemapping_fragment>' };
  material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.districtPaper.value.getHexString(), palette.paper.slice(1));
  assert.ok(shader.fragmentShader.includes('mix(gl_FragColor.rgb, districtPaper, districtFade)'));
});

test('every reading plan resolves its palette into valid SVG colors', () => {
  for (const id of Object.keys(sectionColors)) {
    const source = createFloorPlan(id);
    assert.ok(!source.includes('${'), `${id}: no unevaluated color placeholders`);
    const dom = new JSDOM(source, { contentType: 'image/svg+xml' });
    for (const node of dom.window.document.querySelectorAll('[fill], [stroke]')) {
      for (const attribute of ['fill', 'stroke']) {
        const value = node.getAttribute(attribute);
        if (value) assert.match(value, /^(#[a-f0-9]{6}|none|url\(#[\w-]+\))$/i);
      }
    }
    dom.window.close();
  }
});

test('essential text inks keep contrast under diagnostic grayscale and color-vision transforms', () => {
  const luminance = rgb => rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  for (const mode of Object.keys(visionMatrices)) {
    for (const ink of [palette.ink, palette.muted, ...Object.values(sectionColors).map(theme => theme.ink)]) {
      for (const paper of [palette.paper, palette.raised, ...Object.values(sectionColors).map(theme => theme.tint)]) {
        const values = [ink, paper].map(hex => luminance(simulateVision(hex, mode))).sort((a, b) => b - a);
        const ratio = (values[0] + .05) / (values[1] + .05);
        assert.ok(ratio >= 4.5, `${mode}: ${ink} on ${paper} = ${ratio.toFixed(2)}`);
      }
    }
  }
});
