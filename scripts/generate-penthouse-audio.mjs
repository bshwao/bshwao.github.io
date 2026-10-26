/**
 * Reproducible, original instrumental loops for the portfolio.
 * Run: node scripts/generate-penthouse-audio.mjs
 * No samples, recordings, dependencies, network, or external sound banks.
 * The generated scores and WAV recordings are dedicated to CC0; see
 * assets/audio/penthouse/LICENSE.md. Original synthesis created for this portfolio.
 */
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

export const SAMPLE_RATE = 22050;
const TAU = Math.PI * 2;
const midiFrequency = note => 440 * 2 ** ((note - 69) / 12);

// Each four-bar harmonic phrase is developed across three passes. MIDI notes,
// timing, velocities, seeds, and arrangements are authored here from scratch.
export const penthouseScores = [
  {
    id: 'window-light', bpm: 72, bars: 12, seed: 0x77696e64, swing: .075, warmth: 4700,
    chords: [[50, 57, 61, 64, 66], [47, 54, 57, 61, 62], [43, 54, 57, 59, 62], [45, 55, 59, 62, 66]],
    roots: [38, 35, 31, 33],
    melody: [[1.5, 73, .55], [2.75, 76, .7], [5.5, 69, .75], [7, 66, .6], [9.75, 71, .65], [10.5, 69, .6], [13.5, 66, .9], [15, 64, .6]],
    kick: [0, 2.5], brush: [1.04, 3.03],
  },
  {
    id: 'night-bus', bpm: 76, bars: 12, seed: 0x62757321, swing: .105, warmth: 4200,
    chords: [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [50, 57, 60, 64, 65], [52, 59, 62, 65, 68]],
    roots: [33, 29, 38, 40],
    melody: [[.75, 76, .65], [2, 74, .75], [3.5, 71, .5], [6.5, 72, 1], [8.75, 69, .6], [10.25, 72, .75], [13.5, 71, .75], [14.75, 68, .65]],
    kick: [0, 1.75, 2.5], brush: [1.055, 3.055],
  },
  {
    id: 'soft-circuit', bpm: 68, bars: 12, seed: 0x736f6674, swing: .055, warmth: 3900,
    chords: [[48, 55, 58, 62, 63], [44, 55, 58, 60, 63], [51, 58, 62, 65, 67], [46, 56, 60, 63, 67]],
    roots: [36, 32, 39, 34],
    melody: [[1, 70, .9], [3, 74, .75], [5.75, 72, .6], [7, 67, .8], [9.5, 70, .8], [11, 65, .75], [13.75, 67, 1], [15.25, 65, .6]],
    kick: [0, 2.75], brush: [1.07, 3.06],
  },
];

export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const noise = random => random() * 2 - 1;
function addLoop(buffer, index, value) {
  buffer[((index % buffer.length) + buffer.length) % buffer.length] += value;
}

/** Rounded, slightly detuned electric-piano tone with decaying bell partials. */
function electricPiano(buffer, start, note, duration, velocity, random) {
  const frequency = midiFrequency(note), offset = Math.round(start * SAMPLE_RATE), count = Math.round(duration * SAMPLE_RATE);
  const phase = random() * TAU, detune = .00065 + random() * .00035;
  for (let i = 0; i < count; i++) {
    const t = i / SAMPLE_RATE, p = TAU * frequency * t;
    const attack = 1 - Math.exp(-t / .013), release = Math.min(1, (duration - t) / .28);
    const body = Math.exp(-t / 1.65), bell = Math.exp(-t / .37);
    const tone = .66 * Math.sin(p + phase) + .24 * Math.sin(p * (1 + detune) + phase) + .1 * Math.sin(p * (1 - detune) + phase);
    const partials = .22 * Math.sin(p * 2.002 + phase * .7) * bell + .055 * Math.sin(p * 3.01) * Math.exp(-t / .2);
    const value = (tone * body + partials) * attack * release * velocity;
    addLoop(buffer, offset + i, value);
  }
}

function mellowBass(buffer, start, note, duration, velocity) {
  const frequency = midiFrequency(note), offset = Math.round(start * SAMPLE_RATE), count = Math.round(duration * SAMPLE_RATE);
  for (let i = 0; i < count; i++) {
    const t = i / SAMPLE_RATE, p = TAU * frequency * t;
    const envelope = (1 - Math.exp(-t / .024)) * Math.exp(-t / 1.1) * Math.min(1, (duration - t) / .2);
    const value = (Math.sin(p) + .2 * Math.sin(p * 2) + .055 * Math.sin(p * 3)) * envelope * velocity;
    addLoop(buffer, offset + i, value);
  }
}

function brushedDrum(buffer, start, kind, velocity, random) {
  const duration = kind === 'kick' ? .4 : kind === 'brush' ? .29 : .085;
  const offset = Math.round(start * SAMPLE_RATE), count = Math.round(duration * SAMPLE_RATE);
  let low = 0, slow = 0;
  for (let i = 0; i < count; i++) {
    const t = i / SAMPLE_RATE, white = noise(random);
    let value;
    if (kind === 'kick') {
      const phase = TAU * (43 * t + 42 * .023 * (1 - Math.exp(-t / .023)));
      const envelope = (1 - Math.exp(-t / .006)) * Math.exp(-t / .105);
      value = Math.sin(phase) * envelope;
    } else {
      low += (white - low) * (kind === 'brush' ? .33 : .53);
      slow += (low - slow) * (kind === 'brush' ? .075 : .22);
      const envelope = (1 - Math.exp(-t / (kind === 'brush' ? .014 : .008))) * Math.exp(-t / (kind === 'brush' ? .075 : .021));
      value = (low - slow) * envelope;
      if (kind === 'brush') value += Math.sin(TAU * 178 * t) * Math.exp(-t / .043) * .035;
    }
    addLoop(buffer, offset + i, value * velocity * Math.min(1, (duration - t) / .015));
  }
}

function circularDelay(source, seconds, gain, destination) {
  const offset = Math.round(seconds * SAMPLE_RATE);
  for (let i = 0; i < source.length; i++) addLoop(destination, i + offset, source[i] * gain);
}

export function waveformMetrics(samples, sampleRate = SAMPLE_RATE) {
  let sum = 0, squares = 0, peak = 0, maxStep = 0, changes = 0;
  const rmsWindows = [], windowLength = Math.round(sampleRate / 4);
  let windowSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i];
    sum += value; squares += value * value; peak = Math.max(peak, Math.abs(value)); windowSquares += value * value;
    if (i) { maxStep = Math.max(maxStep, Math.abs(value - samples[i - 1])); if ((value >= 0) !== (samples[i - 1] >= 0)) changes++; }
    if ((i + 1) % windowLength === 0) { rmsWindows.push(Math.sqrt(windowSquares / windowLength)); windowSquares = 0; }
  }
  const sorted = [...rmsWindows].sort((a, b) => a - b);
  return {duration: samples.length / sampleRate, peak, rms: Math.sqrt(squares / samples.length), mean: sum / samples.length, maxStep,
    zeroCrossingsPerSecond: changes / (samples.length / sampleRate), rms10: sorted[Math.floor(sorted.length * .1)], rms90: sorted[Math.floor(sorted.length * .9)]};
}

/** Average Hann-windowed spectra across the recording for objective audio QA. */
export function spectralMetrics(samples, sampleRate = SAMPLE_RATE) {
  const size = 4096, power = new Float64Array(size / 2), windows = 16;
  for (let window = 0; window < windows; window++) {
    const start = Math.floor((samples.length - size) * (window + .5) / windows);
    const real = new Float64Array(size), imaginary = new Float64Array(size);
    for (let i = 0; i < size; i++) real[i] = samples[start + i] * (.5 - .5 * Math.cos(TAU * i / (size - 1)));
    for (let i = 1, j = 0; i < size; i++) {
      let bit = size >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) [real[i], real[j]] = [real[j], real[i]];
    }
    for (let length = 2; length <= size; length *= 2) {
      const half = length / 2, angle = -TAU / length;
      for (let start = 0; start < size; start += length) for (let i = 0; i < half; i++) {
        const cosine = Math.cos(angle * i), sine = Math.sin(angle * i), odd = start + i + half, even = start + i;
        const r = real[odd] * cosine - imaginary[odd] * sine, im = real[odd] * sine + imaginary[odd] * cosine;
        real[odd] = real[even] - r; imaginary[odd] = imaginary[even] - im;
        real[even] += r; imaginary[even] += im;
      }
    }
    for (let i = 1; i < power.length; i++) power[i] += real[i] ** 2 + imaginary[i] ** 2;
  }
  let total = 0, weighted = 0, low = 0, high = 0;
  power.forEach((value, i) => {
    const frequency = i * sampleRate / size;
    total += value; weighted += value * frequency;
    if (frequency < 250) low += value;
    if (frequency > 5000) high += value;
  });
  return {centroidHz: weighted / total, energyBelow250Hz: low / total, energyAbove5000Hz: high / total};
}

export function synthesizeTrack(score) {
  const beat = 60 / score.bpm, duration = score.bars * 4 * beat, length = Math.round(duration * SAMPLE_RATE);
  const keys = new Float64Array(length), bass = new Float64Array(length), drums = new Float64Array(length), mixed = new Float64Array(length);
  const random = seededRandom(score.seed);
  for (let bar = 0; bar < score.bars; bar++) {
    const chord = score.chords[bar % 4], root = score.roots[bar % 4], pass = Math.floor(bar / 4), downbeat = bar * 4 * beat;
    chord.forEach((note, i) => electricPiano(keys, downbeat + .014 + i * .018, note, beat * 3.65, .074 + random() * .008, random));
    // A quiet, syncopated answer: alternate upper voicings rather than repeating the whole chord.
    chord.slice(2).forEach((note, i) => electricPiano(keys, downbeat + beat * (2.58 + pass * .025) + i * .012, note, beat * 1.55, .027, random));
    mellowBass(bass, downbeat + .02, root, beat * 2.65, .155);
    mellowBass(bass, downbeat + beat * 2.85, root + (bar % 2 ? 7 : 12), beat * .82, .071);
    for (const hit of score.kick) brushedDrum(drums, downbeat + hit * beat + (hit ? .008 : 0), 'kick', .18, random);
    for (const hit of score.brush) brushedDrum(drums, downbeat + hit * beat, 'brush', .15, random);
    for (let eighth = 0; eighth < 8; eighth++) {
      const swing = eighth % 2 ? score.swing : 0;
      brushedDrum(drums, downbeat + (eighth * .5 + swing) * beat, 'hat', eighth % 2 ? .027 : .037, random);
    }
    if (pass === 1 && bar % 2) brushedDrum(drums, downbeat + beat * 3.72, 'brush', .04, random);
  }
  for (let pass = 0; pass < 3; pass++) {
    for (const [position, note, noteLength] of score.melody) {
      const variation = pass === 2 && position > 12 ? -12 : 0;
      electricPiano(keys, (pass * 16 + position) * beat + .022, note + variation, (noteLength + .65) * beat, pass === 1 ? .055 : .044, random);
    }
  }
  for (let i = 0; i < length; i++) mixed[i] = keys[i] + bass[i] + drums[i];
  circularDelay(keys, beat * .75, .16, mixed);
  circularDelay(keys, beat * 1.5, .055, mixed);
  circularDelay(keys, .137, .045, mixed);
  circularDelay(keys, .293, .03, mixed);

  // Warm band-limited room texture, not an imported vinyl recording.
  let texture = 0;
  for (let i = 0; i < length; i++) { texture += (noise(random) - texture) * .15; mixed[i] += texture * .0014; }

  // Warm the whole mix. Two passes establish periodic filter state before the
  // captured pass, so held notes and delay tails wrap naturally across the seam.
  const lowAlpha = 1 - Math.exp(-TAU * score.warmth / SAMPLE_RATE), highAlpha = Math.exp(-TAU * 24 / SAMPLE_RATE);
  const samples = new Float64Array(length);
  let low = 0, high = 0, previous = 0;
  for (let pass = 0; pass < 3; pass++) for (let i = 0; i < length; i++) {
    high = highAlpha * (high + mixed[i] - previous); previous = mixed[i];
    low += (high - low) * lowAlpha;
    if (pass === 2) samples[i] = Math.tanh(low * 1.15);
  }
  // A very short soft edge avoids a PCM discontinuity even in players that
  // restart the file without preserving their output filter state.
  const fade = Math.round(.018 * SAMPLE_RATE);
  for (let i = 0; i < fade; i++) {
    const gain = Math.sin((i / (fade - 1)) * Math.PI / 2) ** 2;
    samples[i] *= gain; samples[length - 1 - i] *= gain;
  }
  const metrics = waveformMetrics(samples), gain = Math.min(.72 / metrics.peak, .135 / metrics.rms);
  for (let i = 0; i < length; i++) samples[i] *= gain;
  return samples;
}

export function encodeMonoWav(samples, sampleRate = SAMPLE_RATE) {
  const dataBytes = samples.length * 2, wav = Buffer.alloc(44 + dataBytes);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + dataBytes, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return wav;
}

export async function generatePenthouseAudio() {
  const output = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/audio/penthouse');
  await mkdir(output, {recursive: true});
  const results = [];
  for (const score of penthouseScores) {
    const samples = synthesizeTrack(score), wav = encodeMonoWav(samples);
    await writeFile(resolve(output, `${score.id}.wav`), wav);
    const metrics = waveformMetrics(samples);
    results.push({id: score.id, bytes: wav.length, ...metrics, ...spectralMetrics(samples)});
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const result of await generatePenthouseAudio()) console.log(JSON.stringify(result));
}
