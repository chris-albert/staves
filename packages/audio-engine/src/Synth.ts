import type { SynthPatch, OscillatorConfig, NoiseConfig, SynthMixer } from '@staves/storage';

const DEFAULT_MIXER: SynthMixer = { osc1: 1, osc2: 0, osc3: 0, noise: 0 };
const DEFAULT_OSC2: OscillatorConfig = { waveform: 'square', detune: 0, octaveOffset: 0 };
const DEFAULT_OSC3: OscillatorConfig = { waveform: 'triangle', detune: 0, octaveOffset: 0 };
const DEFAULT_NOISE: NoiseConfig = { type: 'white' };

export const DEFAULT_SYNTH_PATCH: SynthPatch = {
  oscillator: { waveform: 'sawtooth', detune: 0, octaveOffset: 0 },
  osc2: DEFAULT_OSC2,
  osc3: DEFAULT_OSC3,
  noise: DEFAULT_NOISE,
  mixer: DEFAULT_MIXER,
  filter: { type: 'lowpass', cutoff: 2000, resonance: 1 },
  ampEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3 },
  filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.3, amount: 2000 },
};

interface Voice {
  oscs: OscillatorNode[];
  noiseSource: AudioBufferSourceNode | null;
  gains: GainNode[]; // per-source mixer gains
  filter: BiquadFilterNode;
  ampGain: GainNode;
  releaseTime: number;
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Cache noise buffers per context so we only generate them once. */
const noiseBufferCache = new WeakMap<AudioContext, Record<string, AudioBuffer>>();

function getNoiseBuffer(ctx: AudioContext, type: string): AudioBuffer {
  let cache = noiseBufferCache.get(ctx);
  if (!cache) {
    cache = {};
    noiseBufferCache.set(ctx, cache);
  }
  if (cache[type]) return cache[type];

  const sampleRate = ctx.sampleRate;
  const length = sampleRate * 2; // 2 seconds, looped
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else if (type === 'pink') {
    // Voss-McCartney approximation
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else {
    // Brown noise (integrated white)
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }

  cache[type] = buffer;
  return buffer;
}

/**
 * Polyphonic synth engine.
 * Each voice: up to 3 oscillators + noise → per-source gains (mixer) → BiquadFilter → amp GainNode → destination.
 * ADSR envelopes for both amplitude and filter cutoff.
 */
export class Synth {
  private context: AudioContext;
  private voices: Voice[] = [];

  constructor(context: AudioContext) {
    this.context = context;
  }

  private getMixer(patch: SynthPatch): SynthMixer {
    return patch.mixer ?? DEFAULT_MIXER;
  }

  private createVoiceNodes(
    pitch: number,
    patch: SynthPatch,
    destination: AudioNode,
  ): { voice: Voice; filter: BiquadFilterNode; ampGain: GainNode } {
    const ctx = this.context;
    const mixer = this.getMixer(patch);

    const filter = ctx.createBiquadFilter();
    filter.type = patch.filter.type;
    filter.Q.value = patch.filter.resonance;

    const ampGain = ctx.createGain();
    ampGain.gain.value = 0;

    filter.connect(ampGain);
    ampGain.connect(destination);

    const oscs: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    let noiseSource: AudioBufferSourceNode | null = null;

    // Helper: create an oscillator with its mixer gain
    const addOsc = (config: OscillatorConfig, level: number) => {
      if (level <= 0) return;
      const freq = midiToFrequency(pitch + config.octaveOffset * 12);
      const osc = ctx.createOscillator();
      osc.type = config.waveform;
      osc.frequency.value = freq;
      osc.detune.value = config.detune;

      const gain = ctx.createGain();
      gain.gain.value = level;

      osc.connect(gain);
      gain.connect(filter);
      oscs.push(osc);
      gains.push(gain);
    };

    addOsc(patch.oscillator, mixer.osc1);

    if (patch.osc2 && mixer.osc2 > 0) {
      addOsc(patch.osc2, mixer.osc2);
    }
    if (patch.osc3 && mixer.osc3 > 0) {
      addOsc(patch.osc3, mixer.osc3);
    }

    // Noise channel
    if (patch.noise && mixer.noise > 0) {
      const noiseBuffer = getNoiseBuffer(ctx, patch.noise.type);
      noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const noiseGain = ctx.createGain();
      noiseGain.gain.value = mixer.noise;

      noiseSource.connect(noiseGain);
      noiseGain.connect(filter);
      gains.push(noiseGain);
    }

    const voice: Voice = { oscs, noiseSource, gains, filter, ampGain, releaseTime: 0 };
    return { voice, filter, ampGain };
  }

  /**
   * Schedule a synth note at a specific AudioContext time.
   */
  scheduleNote(
    pitch: number,
    velocity: number,
    startTime: number,
    duration: number,
    patch: SynthPatch,
    destination: AudioNode,
  ): void {
    const { voice, filter, ampGain } = this.createVoiceNodes(pitch, patch, destination);

    // Amp envelope
    const { attack, decay, sustain, release } = patch.ampEnvelope;
    const peakLevel = velocity;
    const sustainLevel = peakLevel * sustain;
    const noteOff = startTime + duration;

    ampGain.gain.setValueAtTime(0, startTime);
    ampGain.gain.linearRampToValueAtTime(peakLevel, startTime + attack);
    ampGain.gain.linearRampToValueAtTime(sustainLevel, startTime + attack + decay);
    ampGain.gain.setValueAtTime(sustainLevel, noteOff);
    ampGain.gain.linearRampToValueAtTime(0, noteOff + release);

    // Filter envelope
    const fEnv = patch.filterEnvelope;
    const baseCutoff = patch.filter.cutoff;
    const peakCutoff = baseCutoff + fEnv.amount;
    const sustainCutoff = baseCutoff + fEnv.amount * fEnv.sustain;

    filter.frequency.setValueAtTime(baseCutoff, startTime);
    filter.frequency.linearRampToValueAtTime(peakCutoff, startTime + fEnv.attack);
    filter.frequency.linearRampToValueAtTime(sustainCutoff, startTime + fEnv.attack + fEnv.decay);
    filter.frequency.setValueAtTime(sustainCutoff, noteOff);
    filter.frequency.linearRampToValueAtTime(baseCutoff, noteOff + fEnv.release);

    // Start and auto-stop
    const stopTime = noteOff + release + 0.05;
    for (const osc of voice.oscs) {
      osc.start(startTime);
      osc.stop(stopTime);
    }
    if (voice.noiseSource) {
      voice.noiseSource.start(startTime);
      voice.noiseSource.stop(stopTime);
    }

    voice.releaseTime = stopTime;
    this.voices.push(voice);

    // Cleanup on end (use first osc or noiseSource)
    const cleanupNode = voice.oscs[0] ?? voice.noiseSource;
    if (cleanupNode) {
      cleanupNode.onended = () => {
        for (const g of voice.gains) g.disconnect();
        voice.filter.disconnect();
        voice.ampGain.disconnect();
        for (const o of voice.oscs) o.disconnect();
        voice.noiseSource?.disconnect();
        const idx = this.voices.indexOf(voice);
        if (idx >= 0) this.voices.splice(idx, 1);
      };
    }
  }

  /**
   * Preview a note immediately (for the piano roll keyboard).
   * Returns a stop function to call when the key is released.
   */
  previewNote(
    pitch: number,
    velocity: number,
    patch: SynthPatch,
    destination: AudioNode,
  ): () => void {
    const ctx = this.context;
    const now = ctx.currentTime;
    const { voice, filter, ampGain } = this.createVoiceNodes(pitch, patch, destination);

    const { attack, decay, sustain } = patch.ampEnvelope;
    const peakLevel = velocity;
    const sustainLevel = peakLevel * sustain;

    ampGain.gain.setValueAtTime(0, now);
    ampGain.gain.linearRampToValueAtTime(peakLevel, now + attack);
    ampGain.gain.linearRampToValueAtTime(sustainLevel, now + attack + decay);

    const baseCutoff = patch.filter.cutoff;
    const peakCutoff = baseCutoff + patch.filterEnvelope.amount;
    const sustainCutoff = baseCutoff + patch.filterEnvelope.amount * patch.filterEnvelope.sustain;

    filter.frequency.setValueAtTime(baseCutoff, now);
    filter.frequency.linearRampToValueAtTime(peakCutoff, now + patch.filterEnvelope.attack);
    filter.frequency.linearRampToValueAtTime(sustainCutoff, now + patch.filterEnvelope.attack + patch.filterEnvelope.decay);

    for (const osc of voice.oscs) osc.start(now);
    if (voice.noiseSource) voice.noiseSource.start(now);

    this.voices.push(voice);

    return () => {
      const releaseNow = ctx.currentTime;
      const { release } = patch.ampEnvelope;

      ampGain.gain.cancelScheduledValues(releaseNow);
      ampGain.gain.setValueAtTime(ampGain.gain.value, releaseNow);
      ampGain.gain.linearRampToValueAtTime(0, releaseNow + release);

      filter.frequency.cancelScheduledValues(releaseNow);
      filter.frequency.setValueAtTime(filter.frequency.value, releaseNow);
      filter.frequency.linearRampToValueAtTime(patch.filter.cutoff, releaseNow + patch.filterEnvelope.release);

      const stopTime = releaseNow + release + 0.05;
      for (const osc of voice.oscs) {
        try { osc.stop(stopTime); } catch { /* already stopped */ }
      }
      if (voice.noiseSource) {
        try { voice.noiseSource.stop(stopTime); } catch { /* already stopped */ }
      }
      voice.releaseTime = stopTime;
    };
  }

  /** Release all active voices immediately (e.g. on transport stop). */
  releaseAll(): void {
    this.releaseAllAt(this.context.currentTime);
  }

  /** Release all active voices at a specific AudioContext time. */
  releaseAllAt(time: number): void {
    for (const voice of [...this.voices]) {
      try {
        voice.ampGain.gain.cancelScheduledValues(time);
        voice.ampGain.gain.setValueAtTime(0, time);
        for (const osc of voice.oscs) {
          try { osc.stop(time + 0.01); } catch { /* already stopped */ }
        }
        if (voice.noiseSource) {
          try { voice.noiseSource.stop(time + 0.01); } catch { /* already stopped */ }
        }
      } catch {
        // Voice may already be stopped
      }
    }
    this.voices = [];
  }
}
