/**
 * Synthesize drum sample WAV files for multiple drum kits.
 * Uses basic waveform math — no external audio dependencies needed.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SAMPLE_RATE = 44100;
const BASE = join(import.meta.dirname, '..', 'apps', 'web', 'public', 'drums');

// --- WAV writer ---
function writeWav(path, samples) {
  const numSamples = samples.length;
  const dataSize = numSamples * 2; // 16-bit
  const buf = Buffer.alloc(44 + dataSize);
  // RIFF header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  // fmt chunk
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  // data chunk
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  writeFileSync(path, buf);
}

// --- Helpers ---
function env(t, attack, decay) {
  if (t < attack) return t / attack;
  return Math.exp(-(t - attack) / decay);
}

function noise() { return Math.random() * 2 - 1; }

function sine(phase) { return Math.sin(2 * Math.PI * phase); }

function generateSamples(durationSec, fn) {
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    out[i] = fn(t, i);
  }
  return out;
}

// ===== 808 Kit =====
function make808() {
  const dir = join(BASE, '808');
  mkdirSync(dir, { recursive: true });

  // 808 Kick — long sine sweep
  writeWav(join(dir, 'kick.wav'), generateSamples(0.8, (t) => {
    const freq = 55 + 200 * Math.exp(-t * 15);
    const phase = 55 * t + (200 / 15) * (1 - Math.exp(-t * 15));
    return sine(phase) * env(t, 0.001, 0.4) * 0.95;
  }));

  // 808 Snare — sine body + noise snap
  writeWav(join(dir, 'snare.wav'), generateSamples(0.3, (t) => {
    const body = sine(180 * t) * env(t, 0.001, 0.1) * 0.6;
    const snap = noise() * env(t, 0.001, 0.05) * 0.5;
    return body + snap;
  }));

  // 808 Closed HH — filtered noise, short
  writeWav(join(dir, 'closed-hh.wav'), generateSamples(0.08, (t) => {
    return noise() * env(t, 0.001, 0.02) * 0.4;
  }));

  // 808 Open HH — filtered noise, longer
  writeWav(join(dir, 'open-hh.wav'), generateSamples(0.35, (t) => {
    return noise() * env(t, 0.001, 0.12) * 0.4;
  }));

  // 808 Tom 1
  writeWav(join(dir, 'tom1.wav'), generateSamples(0.4, (t) => {
    const freq = 200 + 100 * Math.exp(-t * 20);
    const phase = 200 * t + (100 / 20) * (1 - Math.exp(-t * 20));
    return sine(phase) * env(t, 0.001, 0.2) * 0.7;
  }));

  // 808 Tom 2
  writeWav(join(dir, 'tom2.wav'), generateSamples(0.4, (t) => {
    const freq = 160 + 80 * Math.exp(-t * 20);
    const phase = 160 * t + (80 / 20) * (1 - Math.exp(-t * 20));
    return sine(phase) * env(t, 0.001, 0.2) * 0.7;
  }));

  // 808 Tom 3
  writeWav(join(dir, 'tom3.wav'), generateSamples(0.4, (t) => {
    const freq = 120 + 60 * Math.exp(-t * 20);
    const phase = 120 * t + (60 / 20) * (1 - Math.exp(-t * 20));
    return sine(phase) * env(t, 0.001, 0.25) * 0.7;
  }));

  // 808 Clap — layered noise bursts
  writeWav(join(dir, 'clap.wav'), generateSamples(0.2, (t) => {
    let v = 0;
    for (let b = 0; b < 3; b++) {
      const bt = t - b * 0.012;
      if (bt >= 0) v += noise() * env(bt, 0.001, 0.015) * 0.25;
    }
    v += noise() * env(Math.max(0, t - 0.04), 0.001, 0.06) * 0.4;
    return v;
  }));

  // 808 Rimshot
  writeWav(join(dir, 'rimshot.wav'), generateSamples(0.1, (t) => {
    return (sine(800 * t) * 0.4 + noise() * 0.3) * env(t, 0.001, 0.02) * 0.7;
  }));

  // 808 Cowbell — two detuned squares
  writeWav(join(dir, 'cowbell.wav'), generateSamples(0.3, (t) => {
    const sq1 = Math.sign(sine(587 * t));
    const sq2 = Math.sign(sine(845 * t));
    return (sq1 + sq2) * 0.15 * env(t, 0.001, 0.08);
  }));

  // 808 Cymbal
  writeWav(join(dir, 'cymbal.wav'), generateSamples(0.6, (t) => {
    return noise() * env(t, 0.005, 0.25) * 0.3;
  }));

  // 808 Maracas
  writeWav(join(dir, 'maracas.wav'), generateSamples(0.06, (t) => {
    return noise() * env(t, 0.001, 0.015) * 0.35;
  }));
}

// ===== 909 Kit =====
function make909() {
  const dir = join(BASE, '909');
  mkdirSync(dir, { recursive: true });

  // 909 Kick — punchy with click
  writeWav(join(dir, 'kick.wav'), generateSamples(0.5, (t) => {
    const click = noise() * env(t, 0.0001, 0.003) * 0.6;
    const freq = 50 + 300 * Math.exp(-t * 30);
    const phase = 50 * t + (300 / 30) * (1 - Math.exp(-t * 30));
    return (sine(phase) * env(t, 0.001, 0.2) * 0.9 + click);
  }));

  // 909 Snare — bright with more noise
  writeWav(join(dir, 'snare.wav'), generateSamples(0.25, (t) => {
    const body = sine(200 * t) * env(t, 0.001, 0.06) * 0.5;
    const snap = noise() * env(t, 0.001, 0.08) * 0.6;
    return body + snap;
  }));

  // 909 Closed HH — metallic
  writeWav(join(dir, 'closed-hh.wav'), generateSamples(0.06, (t) => {
    const metal = sine(6000 * t) * 0.3 + sine(8000 * t) * 0.2 + noise() * 0.3;
    return metal * env(t, 0.0005, 0.015) * 0.5;
  }));

  // 909 Open HH
  writeWav(join(dir, 'open-hh.wav'), generateSamples(0.4, (t) => {
    const metal = sine(6000 * t) * 0.3 + sine(8000 * t) * 0.2 + noise() * 0.3;
    return metal * env(t, 0.001, 0.15) * 0.45;
  }));

  // 909 Tom 1
  writeWav(join(dir, 'tom1.wav'), generateSamples(0.3, (t) => {
    const phase = 240 * t + (150 / 25) * (1 - Math.exp(-t * 25));
    return sine(phase) * env(t, 0.001, 0.12) * 0.7;
  }));

  // 909 Tom 2
  writeWav(join(dir, 'tom2.wav'), generateSamples(0.3, (t) => {
    const phase = 180 * t + (120 / 25) * (1 - Math.exp(-t * 25));
    return sine(phase) * env(t, 0.001, 0.14) * 0.7;
  }));

  // 909 Tom 3
  writeWav(join(dir, 'tom3.wav'), generateSamples(0.35, (t) => {
    const phase = 130 * t + (80 / 25) * (1 - Math.exp(-t * 25));
    return sine(phase) * env(t, 0.001, 0.16) * 0.7;
  }));

  // 909 Clap
  writeWav(join(dir, 'clap.wav'), generateSamples(0.25, (t) => {
    let v = 0;
    for (let b = 0; b < 4; b++) {
      const bt = t - b * 0.01;
      if (bt >= 0) v += noise() * env(bt, 0.001, 0.01) * 0.2;
    }
    v += noise() * env(Math.max(0, t - 0.05), 0.001, 0.07) * 0.5;
    return v;
  }));

  // 909 Ride
  writeWav(join(dir, 'ride.wav'), generateSamples(0.8, (t) => {
    const metal = sine(5000 * t) * 0.2 + sine(7500 * t) * 0.15 + noise() * 0.2;
    return metal * env(t, 0.002, 0.3) * 0.35;
  }));

  // 909 Crash
  writeWav(join(dir, 'crash.wav'), generateSamples(1.2, (t) => {
    const metal = sine(4000 * t) * 0.15 + sine(6000 * t) * 0.1 + noise() * 0.35;
    return metal * env(t, 0.005, 0.5) * 0.4;
  }));

  // 909 Rimshot
  writeWav(join(dir, 'rimshot.wav'), generateSamples(0.08, (t) => {
    return (sine(1000 * t) * 0.5 + noise() * 0.3) * env(t, 0.0005, 0.015) * 0.7;
  }));

  // 909 Hi Conga
  writeWav(join(dir, 'conga.wav'), generateSamples(0.25, (t) => {
    const phase = 300 * t + (100 / 20) * (1 - Math.exp(-t * 20));
    return sine(phase) * env(t, 0.001, 0.1) * 0.6;
  }));
}

// ===== Lo-Fi Kit =====
function makeLoFi() {
  const dir = join(BASE, 'lofi');
  mkdirSync(dir, { recursive: true });

  // Lo-fi Kick — soft, round
  writeWav(join(dir, 'kick.wav'), generateSamples(0.5, (t) => {
    const phase = 45 * t + (150 / 12) * (1 - Math.exp(-t * 12));
    return sine(phase) * env(t, 0.002, 0.25) * 0.8;
  }));

  // Lo-fi Snare — muffled
  writeWav(join(dir, 'snare.wav'), generateSamples(0.2, (t) => {
    const body = sine(160 * t) * env(t, 0.001, 0.08) * 0.5;
    const n = noise() * env(t, 0.002, 0.04) * 0.3;
    return (body + n) * 0.8;
  }));

  // Lo-fi Closed HH — dusty
  writeWav(join(dir, 'closed-hh.wav'), generateSamples(0.05, (t) => {
    return noise() * env(t, 0.001, 0.012) * 0.3;
  }));

  // Lo-fi Open HH
  writeWav(join(dir, 'open-hh.wav'), generateSamples(0.2, (t) => {
    return noise() * env(t, 0.002, 0.08) * 0.3;
  }));

  // Lo-fi shaker
  writeWav(join(dir, 'shaker.wav'), generateSamples(0.1, (t) => {
    return noise() * env(t, 0.005, 0.035) * 0.25;
  }));

  // Lo-fi Rim
  writeWav(join(dir, 'rim.wav'), generateSamples(0.06, (t) => {
    return (sine(700 * t) * 0.4 + noise() * 0.2) * env(t, 0.001, 0.012) * 0.6;
  }));

  // Lo-fi Tom
  writeWav(join(dir, 'tom.wav'), generateSamples(0.35, (t) => {
    const phase = 140 * t + (80 / 15) * (1 - Math.exp(-t * 15));
    return sine(phase) * env(t, 0.002, 0.15) * 0.6;
  }));

  // Lo-fi Snap
  writeWav(join(dir, 'snap.wav'), generateSamples(0.08, (t) => {
    return noise() * env(t, 0.0005, 0.01) * 0.5;
  }));

  // Lo-fi Vinyl crackle hit
  writeWav(join(dir, 'crackle.wav'), generateSamples(0.15, (t) => {
    const clicks = (Math.random() < 0.1 ? noise() * 0.5 : 0);
    return (noise() * 0.1 + clicks) * env(t, 0.01, 0.06);
  }));

  // Lo-fi Clap — soft
  writeWav(join(dir, 'clap.wav'), generateSamples(0.15, (t) => {
    return noise() * env(t, 0.003, 0.05) * 0.35;
  }));

  // Lo-fi Sub bass hit
  writeWav(join(dir, 'sub.wav'), generateSamples(0.6, (t) => {
    return sine(40 * t) * env(t, 0.003, 0.3) * 0.7;
  }));

  // Lo-fi Brush
  writeWav(join(dir, 'brush.wav'), generateSamples(0.12, (t) => {
    return noise() * env(t, 0.005, 0.04) * 0.2;
  }));
}

// ===== Percussion Kit =====
function makePercussion() {
  const dir = join(BASE, 'perc');
  mkdirSync(dir, { recursive: true });

  // Clave
  writeWav(join(dir, 'clave.wav'), generateSamples(0.1, (t) => {
    return sine(2500 * t) * env(t, 0.0005, 0.015) * 0.6;
  }));

  // Woodblock high
  writeWav(join(dir, 'woodblock-hi.wav'), generateSamples(0.08, (t) => {
    return sine(1800 * t) * env(t, 0.0005, 0.012) * 0.55;
  }));

  // Woodblock low
  writeWav(join(dir, 'woodblock-lo.wav'), generateSamples(0.1, (t) => {
    return sine(1200 * t) * env(t, 0.0005, 0.018) * 0.55;
  }));

  // Bongo high
  writeWav(join(dir, 'bongo-hi.wav'), generateSamples(0.2, (t) => {
    const phase = 400 * t + (200 / 30) * (1 - Math.exp(-t * 30));
    return sine(phase) * env(t, 0.001, 0.06) * 0.6;
  }));

  // Bongo low
  writeWav(join(dir, 'bongo-lo.wav'), generateSamples(0.25, (t) => {
    const phase = 250 * t + (150 / 25) * (1 - Math.exp(-t * 25));
    return sine(phase) * env(t, 0.001, 0.08) * 0.6;
  }));

  // Conga high
  writeWav(join(dir, 'conga-hi.wav'), generateSamples(0.25, (t) => {
    const phase = 350 * t + (130 / 22) * (1 - Math.exp(-t * 22));
    return sine(phase) * env(t, 0.001, 0.09) * 0.6;
  }));

  // Conga low
  writeWav(join(dir, 'conga-lo.wav'), generateSamples(0.3, (t) => {
    const phase = 200 * t + (100 / 20) * (1 - Math.exp(-t * 20));
    return sine(phase) * env(t, 0.001, 0.12) * 0.6;
  }));

  // Tambourine
  writeWav(join(dir, 'tambourine.wav'), generateSamples(0.15, (t) => {
    const jingle = sine(8000 * t) * 0.2 + sine(10000 * t) * 0.15 + noise() * 0.25;
    return jingle * env(t, 0.001, 0.04) * 0.4;
  }));

  // Shaker
  writeWav(join(dir, 'shaker.wav'), generateSamples(0.1, (t) => {
    return noise() * env(t, 0.005, 0.03) * 0.3;
  }));

  // Guiro (scraping sound — fast noise bursts)
  writeWav(join(dir, 'guiro.wav'), generateSamples(0.2, (t) => {
    const scrape = Math.sin(t * 150 * Math.PI) > 0 ? noise() * 0.3 : 0;
    return scrape * env(t, 0.005, 0.1);
  }));

  // Triangle
  writeWav(join(dir, 'triangle.wav'), generateSamples(0.8, (t) => {
    return sine(4000 * t) * env(t, 0.001, 0.35) * 0.3;
  }));

  // Agogo bell
  writeWav(join(dir, 'agogo.wav'), generateSamples(0.3, (t) => {
    return (sine(700 * t) + sine(1100 * t) * 0.5) * env(t, 0.001, 0.1) * 0.35;
  }));
}

// ===== Generate all =====
console.log('Generating 808 kit...');
make808();
console.log('Generating 909 kit...');
make909();
console.log('Generating Lo-Fi kit...');
makeLoFi();
console.log('Generating Percussion kit...');
makePercussion();
console.log('Done! Generated drum samples in apps/web/public/drums/');
