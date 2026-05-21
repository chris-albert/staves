import type { ArpeggiatorModule, ArpRate } from '@staves/storage';
import type { ScheduledMidiNote } from './Transport';

export const DEFAULT_ARPEGGIATOR: ArpeggiatorModule = {
  type: 'arpeggiator',
  id: '',
  enabled: true,
  mode: 'up',
  rate: '1/16',
  octaves: 1,
  gateLength: 0.5,
  swing: 0,
  patternLength: 0,
  velocityCurve: 'flat',
};

/** Beats per step for each rate value. */
function rateToBeatsPerStep(rate: ArpRate): number {
  switch (rate) {
    case '1/4':   return 1;
    case '1/8':   return 0.5;
    case '1/8T':  return 1 / 3;
    case '1/16':  return 0.25;
    case '1/16T': return 1 / 6;
    case '1/32':  return 0.125;
  }
}

/**
 * Build the ordered pitch sequence from input notes, expanded across octaves.
 * Returns pitches in the order they should be cycled through.
 */
function buildPitchSequence(
  inputPitches: number[],
  mode: ArpeggiatorModule['mode'],
  octaves: number,
): number[] {
  if (inputPitches.length === 0) return [];

  const sorted = [...inputPitches].sort((a, b) => a - b);

  // Expand across octave range
  const expanded: number[] = [];
  for (let oct = 0; oct < octaves; oct++) {
    for (const pitch of sorted) {
      expanded.push(pitch + oct * 12);
    }
  }

  switch (mode) {
    case 'up':
      return expanded;
    case 'down':
      return [...expanded].reverse();
    case 'up-down': {
      if (expanded.length <= 1) return expanded;
      // Go up, then back down excluding the endpoints to avoid repeats
      const down = [...expanded].reverse();
      return [...expanded, ...down.slice(1, -1)];
    }
    case 'random':
      // Return the expanded array — we'll shuffle per-cycle during generation
      return expanded;
  }
}

/**
 * Pure function: transforms pattern notes into arpeggiated notes.
 *
 * Takes the original MIDI notes (already positioned in absolute timeline beats)
 * and replaces them with arpeggiated steps that span the clip duration.
 */
export function arpeggiate(
  notes: ScheduledMidiNote[],
  config: ArpeggiatorModule,
  clipStartBeat: number,
  clipDurationBeats: number,
): ScheduledMidiNote[] {
  if (notes.length === 0 || !config.enabled) return notes;

  // Collect unique pitches from the original notes (use the raw pitches)
  const uniquePitches = [...new Set(notes.map((n) => n.pitch))];
  if (uniquePitches.length === 0) return notes;

  const sequence = buildPitchSequence(uniquePitches, config.mode, config.octaves);
  if (sequence.length === 0) return notes;

  const beatsPerStep = rateToBeatsPerStep(config.rate);
  const gateDuration = beatsPerStep * config.gateLength;
  const totalSteps = Math.floor(clipDurationBeats / beatsPerStep);
  if (totalSteps === 0) return notes;

  // If patternLength is set, the sequence wraps at that length
  const cycleLength = config.patternLength > 0
    ? Math.min(config.patternLength, sequence.length)
    : sequence.length;

  // Use average velocity from input notes as the base
  const avgVelocity = notes.reduce((sum, n) => sum + n.velocity, 0) / notes.length;

  // Seeded pseudo-random for 'random' mode (deterministic per clip position)
  let randomState = Math.round(clipStartBeat * 1000) + uniquePitches.length;
  const nextRandom = () => {
    randomState = (randomState * 1664525 + 1013904223) & 0x7fffffff;
    return randomState / 0x7fffffff;
  };

  // For random mode, pre-shuffle a working copy per cycle
  let randomSequence: number[] = [];
  const getRandomSequence = () => {
    randomSequence = [...sequence];
    for (let i = randomSequence.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom() * (i + 1));
      [randomSequence[i]!, randomSequence[j]!] = [randomSequence[j]!, randomSequence[i]!];
    }
    return randomSequence;
  };

  const result: ScheduledMidiNote[] = [];
  let currentRandomCycle = -1;

  for (let step = 0; step < totalSteps; step++) {
    const stepBeat = clipStartBeat + step * beatsPerStep;

    // Apply swing: offset even-numbered steps (0-indexed, so odd steps get swung)
    let actualBeat = stepBeat;
    if (config.swing > 0 && step % 2 === 1) {
      actualBeat += beatsPerStep * config.swing * 0.5;
    }

    // Determine pitch
    const cycleIndex = step % cycleLength;
    let pitch: number;
    if (config.mode === 'random') {
      const cycleNum = Math.floor(step / cycleLength);
      if (cycleNum !== currentRandomCycle) {
        getRandomSequence();
        currentRandomCycle = cycleNum;
      }
      pitch = randomSequence[cycleIndex % randomSequence.length]!;
    } else {
      pitch = sequence[cycleIndex]!;
    }

    // Velocity curve
    let velocity = avgVelocity;
    switch (config.velocityCurve) {
      case 'flat':
        break;
      case 'accent-first':
        velocity = cycleIndex === 0 ? avgVelocity : avgVelocity * 0.6;
        break;
      case 'crescendo':
        velocity = avgVelocity * (0.4 + 0.6 * (cycleIndex / Math.max(1, cycleLength - 1)));
        break;
      case 'decrescendo':
        velocity = avgVelocity * (1.0 - 0.6 * (cycleIndex / Math.max(1, cycleLength - 1)));
        break;
    }

    result.push({
      beat: actualBeat,
      durationBeats: gateDuration,
      pitch,
      velocity: Math.max(0, Math.min(1, velocity)),
    });
  }

  return result;
}
