import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeViewPreferences, readViewPreferences, saveViewPreferences, shouldReduceMotion, viewPreferencesKey } from '../assets/view-preferences.js';
import { renderBudget } from '../assets/render-budget.js';
import { projects } from '../assets/content.js';
import { floorContent } from '../assets/floor-content.js';
import { renderProjectSummary } from '../assets/project-story.js';
import { readFile } from 'node:fs/promises';

test('view preferences survive a reload and tolerate unavailable or corrupted storage', () => {
  const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  assert.deepEqual(readViewPreferences(storage), { motion: 'system', graphics: 'standard', controlsSeen: false });
  const saved = saveViewPreferences(storage, { motion: 'reduced', graphics: 'low', controlsSeen: true });
  assert.deepEqual(readViewPreferences(storage), saved);
  values.set(viewPreferencesKey, '{broken');
  assert.deepEqual(readViewPreferences(storage), normalizeViewPreferences());
  values.set(viewPreferencesKey, 'null');
  assert.deepEqual(readViewPreferences(storage), normalizeViewPreferences());
  assert.deepEqual(normalizeViewPreferences({ motion: 'unexpected', graphics: 'high', controlsSeen: 'true' }), normalizeViewPreferences());
  const denied = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.deepEqual(readViewPreferences(denied), normalizeViewPreferences());
  assert.deepEqual(saveViewPreferences(denied, saved), saved, 'Controls remain usable for the session when persistence is denied');
});

test('manual motion preferences override the device setting while system mode follows it', () => {
  for (const system of [false, true]) {
    assert.equal(shouldReduceMotion('system', system), system);
    assert.equal(shouldReduceMotion('reduced', system), true);
    assert.equal(shouldReduceMotion('full', system), false);
  }
});

test('low graphics always reduces raster work on ordinary desktop and phone displays', () => {
  for (const [width, height] of [[1280, 720], [390, 844], [844, 390], [1920, 1080], [3840, 2160]]) for (const dpr of [1, 2, 3]) {
    const standard = renderBudget(width, height, dpr), low = renderBudget(width, height, dpr, 'low');
    assert.ok(low.compact);
    assert.ok(low.pixelRatio <= .85);
    assert.ok(width * height * low.pixelRatio ** 2 <= 900_001);
    assert.ok(low.pixelRatio ** 2 <= standard.pixelRatio ** 2 * .73, 'At least 27% fewer raster pixels at every tested viewport');
  }
});

test('every project shares a built/contribution/result summary in its room and static case study', async () => {
  const reading = await readFile(new URL('../reading.html', import.meta.url), 'utf8');
  for (const project of projects) {
    const room = floorContent.projects.rooms.find(room => room.projectId === project.id);
    assert.equal(room.summary, project.summary);
    assert.ok(Object.values(project.summary).every(text => text.length > 30));
    const summary = renderProjectSummary(project.summary);
    for (const label of ['What I built', 'My contribution', 'Result']) assert.ok(summary.includes(`<dt>${label}</dt>`));
    assert.ok(reading.includes(summary));
    assert.ok(room.links.some(link => link.href === project.url), 'Each project retains its real source link');
    if (project.status === 'ongoing') assert.match(project.summary.result, /^Ongoing:/);
  }
  assert.ok(renderProjectSummary({ built: '<script>', contribution: '&', result: '"' }).includes('&lt;script&gt;'));
});
