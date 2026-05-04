import type { SynthPatch } from '@staves/storage';

export const DEFAULT_SYNTH_PATCH: SynthPatch = {
  oscillator: { waveform: 'sawtooth', detune: 0, octaveOffset: 0 },
  filter: { type: 'lowpass', cutoff: 2000, resonance: 1 },
  ampEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3 },
  filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.3, amount: 2000 },
};

interface Voice {
  osc: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  releaseTime: number;
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Polyphonic synth engine.
 * Each scheduleNote creates a voice: OscillatorNode → BiquadFilterNode → GainNode → destination.
 * ADSR envelopes for both amplitude and filter cutoff.
 */
export class Synth {
  private context: AudioContext;
  private voices: Voice[] = [];

  constructor(context: AudioContext) {
    this.context = context;
  }

  /**
   * Schedule a synth note at a specific AudioContext time.
   * Returns the voice for potential early release.
   */
  scheduleNote(
    pitch: number,
    velocity: number,
    startTime: number,
    duration: number,
    patch: SynthPatch,
    destination: AudioNode,
  ): void {
    const ctx = this.context;
    const freq = midiToFrequency(pitch + patch.oscillator.octaveOffset * 12);

    // Create voice nodes
    const osc = ctx.createOscillator();
    osc.type = patch.oscillator.waveform;
    osc.frequency.value = freq;
    osc.detune.value = patch.oscillator.detune;

    const filter = ctx.createBiquadFilter();
    filter.type = patch.filter.type;
    filter.Q.value = patch.filter.resonance;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    // Amp envelope
    const { attack, decay, sustain, release } = patch.ampEnvelope;
    const peakLevel = velocity;
    const sustainLevel = peakLevel * sustain;
    const noteOff = startTime + duration;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peakLevel, startTime + attack);
    gain.gain.linearRampToValueAtTime(sustainLevel, startTime + attack + decay);
    // Hold sustain until note off
    gain.gain.setValueAtTime(sustainLevel, noteOff);
    gain.gain.linearRampToValueAtTime(0, noteOff + release);

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
    osc.start(startTime);
    const stopTime = noteOff + release + 0.05;
    osc.stop(stopTime);

    const voice: Voice = { osc, filter, gain, releaseTime: stopTime };
    this.voices.push(voice);

    osc.onended = () => {
      gain.disconnect();
      filter.disconnect();
      osc.disconnect();
      const idx = this.voices.indexOf(voice);
      if (idx >= 0) this.voices.splice(idx, 1);
    };
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
    const freq = midiToFrequency(pitch + patch.oscillator.octaveOffset * 12);
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = patch.oscillator.waveform;
    osc.frequency.value = freq;
    osc.detune.value = patch.oscillator.detune;

    const filter = ctx.createBiquadFilter();
    filter.type = patch.filter.type;
    filter.Q.value = patch.filter.resonance;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    const { attack, decay, sustain } = patch.ampEnvelope;
    const peakLevel = velocity;
    const sustainLevel = peakLevel * sustain;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakLevel, now + attack);
    gain.gain.linearRampToValueAtTime(sustainLevel, now + attack + decay);

    const baseCutoff = patch.filter.cutoff;
    const peakCutoff = baseCutoff + patch.filterEnvelope.amount;
    const sustainCutoff = baseCutoff + patch.filterEnvelope.amount * patch.filterEnvelope.sustain;

    filter.frequency.setValueAtTime(baseCutoff, now);
    filter.frequency.linearRampToValueAtTime(peakCutoff, now + patch.filterEnvelope.attack);
    filter.frequency.linearRampToValueAtTime(sustainCutoff, now + patch.filterEnvelope.attack + patch.filterEnvelope.decay);

    osc.start(now);

    const voice: Voice = { osc, filter, gain, releaseTime: 0 };
    this.voices.push(voice);

    return () => {
      const releaseNow = ctx.currentTime;
      const { release } = patch.ampEnvelope;
      gain.gain.cancelScheduledValues(releaseNow);
      gain.gain.setValueAtTime(gain.gain.value, releaseNow);
      gain.gain.linearRampToValueAtTime(0, releaseNow + release);

      filter.frequency.cancelScheduledValues(releaseNow);
      filter.frequency.setValueAtTime(filter.frequency.value, releaseNow);
      filter.frequency.linearRampToValueAtTime(patch.filter.cutoff, releaseNow + patch.filterEnvelope.release);

      const stopTime = releaseNow + release + 0.05;
      osc.stop(stopTime);
      voice.releaseTime = stopTime;
    };
  }

  /** Release all active voices immediately (e.g. on transport stop). */
  releaseAll(): void {
    const now = this.context.currentTime;
    for (const voice of [...this.voices]) {
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(0, now);
        voice.osc.stop(now + 0.01);
      } catch {
        // Voice may already be stopped
      }
    }
    this.voices = [];
  }
}
