import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {penthouseTracks} from '../assets/penthouse-tracks.js';
import {SAMPLE_RATE, penthouseScores, seededRandom, synthesizeTrack, encodeMonoWav, waveformMetrics, spectralMetrics} from './generate-penthouse-audio.mjs';

function decodeWav(wav) {
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF'); assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt32LE(4), wav.length - 8);
  assert.equal(wav.toString('ascii', 12, 16), 'fmt '); assert.equal(wav.readUInt32LE(16), 16);
  assert.equal(wav.readUInt16LE(20), 1, 'Uncompressed PCM'); assert.equal(wav.readUInt16LE(22), 1, 'Mono');
  assert.equal(wav.readUInt32LE(24), SAMPLE_RATE); assert.equal(wav.readUInt32LE(28), SAMPLE_RATE * 2);
  assert.equal(wav.readUInt16LE(32), 2); assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.toString('ascii', 36, 40), 'data'); assert.equal(wav.readUInt32LE(40), wav.length - 44);
  const samples = new Float64Array((wav.length - 44) / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = wav.readInt16LE(44 + i * 2) / 32767;
  return samples;
}

test('Three original tracks have distinct deterministic scores and local, licensed metadata', async () => {
  assert.deepEqual(penthouseTracks.map(track => track.title), ['Window Light', 'Night Bus', 'Soft Circuit']);
  assert.equal(new Set(penthouseScores.map(score => JSON.stringify(score.chords))).size, 3);
  assert.equal(new Set(penthouseScores.map(score => JSON.stringify(score.melody))).size, 3);
  assert.equal(new Set(penthouseScores.map(score => score.seed)).size, 3);
  for (const track of penthouseTracks) {
    assert.match(track.src, /^\.\/assets\/audio\/penthouse\/[a-z-]+\.wav$/);
    assert.equal(track.license, './assets/audio/penthouse/LICENSE.md');
    assert.ok(track.duration >= 35 && track.duration <= 50); assert.ok(track.subtitle);
    assert.ok(penthouseScores.find(score => score.id === track.id));
  }
  const license = await readFile(new URL('../assets/audio/penthouse/LICENSE.md', import.meta.url), 'utf8');
  assert.match(license, /Original synthesis created for this portfolio/);
  assert.match(license, /https:\/\/creativecommons.org\/publicdomain\/zero\/1.0\//);
  const first = seededRandom(123), second = seededRandom(123);
  assert.deepEqual(Array.from({length: 12}, first), Array.from({length: 12}, second));
});

test('WAVs are PCM16 mono at 22050 Hz, dynamic, unclipped, distinct, and softly joined at the loop boundary', async () => {
  let totalBytes = 0;
  const hashes = new Set();
  for (const track of penthouseTracks) {
    const wav = await readFile(new URL(`../${track.src.slice(2)}`, import.meta.url)), samples = decodeWav(wav);
    const metrics = waveformMetrics(samples);
    const spectrum = spectralMetrics(samples);
    totalBytes += wav.length; hashes.add(createHash('sha256').update(wav).digest('hex'));
    assert.ok(Math.abs(metrics.duration - track.duration) < 1 / SAMPLE_RATE, `${track.id}: duration`);
    assert.ok(metrics.peak > .3 && metrics.peak < .73, `${track.id}: comfortable headroom`);
    assert.ok(metrics.rms > .065 && metrics.rms < .15, `${track.id}: audible, moderate average level`);
    assert.ok(Math.abs(metrics.mean) < .001, `${track.id}: no material DC offset`);
    assert.ok(metrics.rms90 > metrics.rms10 * 1.25, `${track.id}: musical dynamics`);
    assert.ok(metrics.maxStep < .22, `${track.id}: no abrupt full-scale transients`);
    assert.ok(metrics.zeroCrossingsPerSecond > 100 && metrics.zeroCrossingsPerSecond < 2500, `${track.id}: tonal rather than silent or white noise`);
    assert.ok(spectrum.centroidHz > 100 && spectrum.centroidHz < 1600, `${track.id}: mellow tonal spectrum`);
    assert.ok(spectrum.energyAbove5000Hz < .02, `${track.id}: restrained high-frequency energy`);
    assert.equal(samples[0], 0); assert.equal(samples.at(-1), 0);
    assert.ok(Math.abs(samples[1]) < .0001 && Math.abs(samples.at(-2)) < .0001, `${track.id}: soft loop seam`);
    assert.ok(new Set(samples.subarray(SAMPLE_RATE, SAMPLE_RATE + 4000)).size > 2000, `${track.id}: varied waveform`);
  }
  assert.equal(hashes.size, 3); assert.ok(totalBytes < 7_000_000, `Combined audio ${totalBytes} bytes`);
});

test('The reusable WAV encoder rounds PCM values and safely bounds its output', () => {
  const wav = encodeMonoWav(new Float64Array([-2, -1, -.5, 0, .5, 1, 2]));
  assert.equal(wav.readInt16LE(44), -32767); assert.equal(wav.readInt16LE(56), 32767);
  assert.equal(wav.readInt16LE(50), 0);
});

test('The authored score reproduces the committed Window Light recording byte for byte', async () => {
  const expected = await readFile(new URL('../assets/audio/penthouse/window-light.wav', import.meta.url));
  const regenerated = encodeMonoWav(synthesizeTrack(penthouseScores[0]));
  assert.equal(createHash('sha256').update(regenerated).digest('hex'), createHash('sha256').update(expected).digest('hex'));
});
