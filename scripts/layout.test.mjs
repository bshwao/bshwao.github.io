import test from 'node:test';
import assert from 'node:assert/strict';
import { viewportLayout, roomMarkerLayout } from '../assets/spatial-layout.js';

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
