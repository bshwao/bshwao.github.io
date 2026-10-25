import test from 'node:test';
import assert from 'node:assert/strict';
import { viewportLayout, roomMarkerLayout, outdoorViewLayout, towerLabelLayout } from '../assets/spatial-layout.js';
import { outdoorCameraPose, outdoorFramingPoints, cameraDepthRange, cameraZoomLimits, islandZoomLimit } from '../assets/camera-framing.js';
import * as T from '../assets/vendor/three.module.min.js';
import { renderBudget } from '../assets/render-budget.js';

test('camera depth precision separates thin architectural layers through the zoom range', () => {
  for (const distance of [5, 25, 80, 200, 400, 650, 1600]) {
    const {near,far} = cameraDepthRange(distance);
    assert.ok(near > 0 && near <= Math.max(.1,distance * .02));
    assert.ok(far >= distance + 500);
    const camera = new T.PerspectiveCamera(34,1,near,far);
    const depth = distance + (distance >= 80 ? 180 : 0);
    const quantized = z => Math.floor((new T.Vector3(0,0,-z).applyMatrix4(camera.projectionMatrix).z * .5 + .5) * (2 ** 24 - 1));
    assert.ok(quantized(depth + .025) - quantized(depth) >= 2, `Roof/face layers retain depth separation at distance ${distance}`);
  }
});

test('zoom limits contain the fitted view and keep each scene at a useful scale',()=>{
  for(const [width,height]of [[1280,720],[390,844],[650,390],[1920,1080]]){
    for(const mode of ['tower','explore']){
      const pose=outdoorCameraPose(mode,width,height),fitDistance=pose.position.distanceTo(pose.target);
      const bounds=cameraZoomLimits({mode,width,height,fitDistance});
      assert.ok(Number.isFinite(bounds.min)&&Number.isFinite(bounds.max)&&bounds.min>0);
      assert.ok(bounds.min<fitDistance&&bounds.max>fitDistance,'Reset framing is always inside both hard stops');
      if(mode==='tower')assert.ok(bounds.max<=islandZoomLimit(width,height)*1.01,'City zoom-out stops at the island overview');
      else assert.ok(bounds.max<=fitDistance*2.21,'Expanded floors cannot shrink to a distant dot');
    }
    for(const focusedRoom of [false,true])for(const fitDistance of [20,80,250]){
      const bounds=cameraZoomLimits({mode:'section',width,height,fitDistance,radius:fitDistance*.3,focusedRoom});
      assert.ok(bounds.min>=fitDistance*.6&&bounds.min<fitDistance);
      assert.ok(bounds.max>fitDistance&&bounds.max<=fitDistance*2,'Floors and rooms retain a bounded close-up range');
    }
  }
});

test('phone and large-screen raster budgets stay bounded without changing navigation regions', () => {
  for (const [width, height, ratio] of [[390, 844, 3], [844, 390, 3], [1440, 900, 2], [3840, 2160, 2]]) {
    const budget = renderBudget(width, height, ratio);
    assert.ok(width * height * budget.pixelRatio ** 2 <= 2_400_001);
    assert.ok(budget.pixelRatio > 0 && budget.pixelRatio <= ratio);
    assert.equal(budget.compact, Math.min(width, height) <= 480);
  }
});

test('outdoor cameras fit the district or tower inside the space reserved for controls', () => {
  for (const [width, height] of [[1440, 900], [1280, 720], [844, 390], [650, 390], [520, 360], [390, 844], [390, 600], [320, 568]]) {
    for (const mode of ['tower', 'explore']) {
      const { position, target, layout } = outdoorCameraPose(mode, width, height);
      const camera = new T.PerspectiveCamera(34, width / height, .02, 2000);
      camera.position.copy(position); camera.lookAt(target);
      camera.setViewOffset(width, height, width / 2 - layout.centerX, height / 2 - layout.centerY, width, height);
      camera.updateMatrixWorld();
      for (const point of outdoorFramingPoints(mode, width, height)) {
        const p = point.clone().project(camera);
        const x = (p.x + 1) * width / 2, y = (1 - p.y) * height / 2;
        assert.ok(x >= layout.rect.left - 1 && x <= layout.rect.right + 1 && y >= layout.rect.top - 1 && y <= layout.rect.bottom + 1,
          `${mode} at ${width}x${height}: (${x.toFixed(1)},${y.toFixed(1)}) stays within the model region`);
      }
      assert.ok(position.toArray().every(Number.isFinite));
    }
  }
});

test('section labels stay spaced and accessible when their projected anchors collide or leave the screen', () => {
  for (const [width, height] of [[1280, 800], [844, 390], [650, 390], [520, 360], [390, 844], [320, 568]]) {
    const points = Array.from({ length: 5 }, (_, index) => ({ id: String(index), side: index % 2 ? -1 : 1, x: index === 0 ? -300 : width / 2, y: 200, visible: index !== 4 }));
    const result = towerLabelLayout(points, width, height);
    assert.equal(result.points.filter(point => point.shown).length, 5, 'Offscreen floors retain a navigation control');
    assert.equal(result.layout, outdoorViewLayout(width, height, 'explore').labelLayout);
    if (result.layout === 'dock') continue;
    for (const item of result.points) {
      const left = item.side < 0 ? item.x - item.labelWidth : item.x;
      assert.ok(left >= 16 && left + item.labelWidth <= width - 16);
      assert.ok(item.y - item.labelHeight / 2 >= 92 && item.y + item.labelHeight / 2 < height - 100);
      for (const other of result.points) if (item !== other && item.side === other.side) {
        assert.ok(Math.abs(item.y - other.y) >= (item.labelHeight + other.labelHeight) / 2 + 7);
      }
    }
  }
});

test('camera regions reserve headers and reading panels across phone orientations', () => {
  for (const [width, height] of [[1280, 800], [844, 390], [650, 390], [390, 844], [390, 600], [320, 568]]) {
    const layout = viewportLayout(width, height);
    assert.ok(layout.rect.right <= width - 24);
    assert.ok(layout.rect.bottom < height);
    assert.ok(layout.rect.bottom - layout.rect.top >= 80);
    assert.ok(layout.centerY >= layout.rect.top);
    if (layout.stacked) assert.ok(layout.rect.bottom < height * .56);
    else assert.ok(layout.rect.right < width - layout.panelWidth);
  }
  assert.equal(viewportLayout(650, 390).stacked, false);
  assert.equal(viewportLayout(390, 650).stacked, true);
});

test('room markers avoid collisions and keep the selected room available', () => {
  const layout = viewportLayout(390, 844);
  const points = [0, 1, 2, 3].map(id => ({ id: String(id), x: 195, y: 260, visible: true }));
  const output = roomMarkerLayout(points, layout, 2);
  assert.equal(output[2].shown, true);
  const shown = output.filter(item => item.shown);
  for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) {
    assert.ok(Math.hypot(shown[i].x - shown[j].x, shown[i].y - shown[j].y) >= 54);
  }
});

test('markers outside the scene are hidden instead of piling up at its edges', () => {
  const layout = viewportLayout(1280, 800);
  const points = [
    { id: '0', x: 440, y: 300, visible: true },
    { id: '1', x: -100, y: 300, visible: true },
    { id: '2', x: 1100, y: 300, visible: true },
    { id: '3', x: 440, y: 300, visible: false },
  ];
  assert.deepEqual(roomMarkerLayout(points, layout, 0).map(item => item.shown), [true, false, false, false]);
});

test('a room target stays available when a long caption cannot fit beside the reading panel', () => {
  const layout = viewportLayout(390, 844);
  const points = [{ id: '0', x: layout.rect.right - 23, y: 260, visible: true, captionWidth: 180 }];
  const [marker] = roomMarkerLayout(points, layout, 0);
  assert.equal(marker.shown, true);
  assert.equal(marker.captionShown, false);
});

test('room captions reserve their full width and height against other numbered targets', () => {
  const layout = viewportLayout(1280, 800);
  const points = [
    { id: '0', x: 400, y: 260, visible: true, captionWidth: 170, captionHeight: 36 },
    { id: '1', x: 465, y: 318, visible: true },
    { id: '2', x: 700, y: 400, visible: true, captionWidth: 150, captionHeight: 34 },
  ];
  const output = roomMarkerLayout(points, layout, 0, 2);
  assert.equal(output[0].shown, true);
  assert.equal(output[0].captionShown, false, 'A caption may not cover the next room target');
  assert.equal(output[2].captionShown, true, 'A hovered room may show its explore cue when space permits');
  const hovered = output[2];
  assert.ok(hovered.x + hovered.captionWidth / 2 <= layout.rect.right);
  assert.ok(hovered.y + 29 + hovered.captionHeight <= layout.rect.bottom);
});

test('captions near the bottom edge are hidden without shrinking the 44px target', () => {
  const layout = viewportLayout(650, 390);
  const [marker] = roomMarkerLayout([{ id: '0', x: 150, y: layout.rect.bottom - 23, visible: true, captionWidth: 100 }], layout, 0);
  assert.equal(marker.shown, true);
  assert.equal(marker.captionShown, false);
  assert.ok(marker.y + 22 <= layout.rect.bottom);
});
