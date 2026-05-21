/**
 * Pure MIDI note transform functions for the track module system.
 * Each function takes ScheduledMidiNote[] and module config, returns transformed notes.
 */
import type {
  ChordModule,
  ChordQuality,
  HumanizeModule,
  TransposeModule,
  ScaleQuantizeModule,
  ScaleName,
  NoteName,
  StrumModule,
  ProbabilityGateModule,
  VelocityMapModule,
  NoteFilterModule,
  NoteRepeatModule,
  EuclideanRhythmModule,
} from '@staves/storage';
import type { ScheduledMidiNote } from './Transport';

/* ---- Defaults ---- */

export const DEFAULT_CHORD: ChordModule = {
  type: 'chord', id: '', enabled: true,
  quality: 'major', customIntervals: [0, 4, 7], velocityScale: 0.9,
};

export const DEFAULT_HUMANIZE: HumanizeModule = {
  type: 'humanize', id: '', enabled: true,
  timingAmount: 0.015, velocityAmount: 0.1, durationAmount: 0.05,
};

export const DEFAULT_TRANSPOSE: TransposeModule = {
  type: 'transpose', id: '', enabled: true,
  semitones: 0,
};

export const DEFAULT_SCALE_QUANTIZE: ScaleQuantizeModule = {
  type: 'scale-quantize', id: '', enabled: true,
  root: 'C', scale: 'major',
};

export const DEFAULT_STRUM: StrumModule = {
  type: 'strum', id: '', enabled: true,
  delayPerNote: 0.03, direction: 'down',
};

export const DEFAULT_PROBABILITY_GATE: ProbabilityGateModule = {
  type: 'probability-gate', id: '', enabled: true,
  probability: 0.7,
};

export const DEFAULT_VELOCITY_MAP: VelocityMapModule = {
  type: 'velocity-map', id: '', enabled: true,
  curve: 'compress', fixedValue: 0.8, min: 0.3, max: 1.0,
};

export const DEFAULT_NOTE_FILTER: NoteFilterModule = {
  type: 'note-filter', id: '', enabled: true,
  minPitch: 0, maxPitch: 127, minVelocity: 0, maxVelocity: 1,
};

export const DEFAULT_NOTE_REPEAT: NoteRepeatModule = {
  type: 'note-repeat', id: '', enabled: true,
  repeats: 3, interval: 0.25, decay: 0.7,
};

export const DEFAULT_EUCLIDEAN_RHYTHM: EuclideanRhythmModule = {
  type: 'euclidean-rhythm', id: '', enabled: true,
  steps: 16, pulses: 5, rotation: 0,
};

/* ---- Shared utility ---- */

/** Deterministic pseudo-random from a seed. Returns 0-1. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/* ---- Chord ---- */

const CHORD_INTERVALS: Record<Exclude<ChordQuality, 'custom'>, number[]> = {
  major:  [0, 4, 7],
  minor:  [0, 3, 7],
  dim:    [0, 3, 6],
  aug:    [0, 4, 8],
  sus2:   [0, 2, 7],
  sus4:   [0, 5, 7],
  maj7:   [0, 4, 7, 11],
  min7:   [0, 3, 7, 10],
  dom7:   [0, 4, 7, 10],
};

export function applyChord(notes: ScheduledMidiNote[], config: ChordModule): ScheduledMidiNote[] {
  const intervals = config.quality === 'custom'
    ? config.customIntervals
    : CHORD_INTERVALS[config.quality];

  const result: ScheduledMidiNote[] = [];
  for (const note of notes) {
    for (const interval of intervals) {
      result.push({
        ...note,
        pitch: note.pitch + interval,
        velocity: interval === 0 ? note.velocity : note.velocity * config.velocityScale,
      });
    }
  }
  return result;
}

/* ---- Humanize ---- */

export function applyHumanize(notes: ScheduledMidiNote[], config: HumanizeModule): ScheduledMidiNote[] {
  // Seed from note count + first note beat for determinism within a session
  const seed = Math.round((notes[0]?.beat ?? 0) * 10000) + notes.length;
  const rand = seededRandom(seed);

  return notes.map((note) => ({
    ...note,
    beat: note.beat + (rand() * 2 - 1) * config.timingAmount,
    velocity: clamp(note.velocity + (rand() * 2 - 1) * config.velocityAmount, 0, 1),
    durationBeats: Math.max(0.01, note.durationBeats * (1 + (rand() * 2 - 1) * config.durationAmount)),
  }));
}

/* ---- Transpose ---- */

export function applyTranspose(notes: ScheduledMidiNote[], config: TransposeModule): ScheduledMidiNote[] {
  return notes.map((note) => ({
    ...note,
    pitch: note.pitch + config.semitones,
  }));
}

/* ---- Scale Quantize ---- */

const SCALE_INTERVALS: Record<ScaleName, number[]> = {
  'major':            [0, 2, 4, 5, 7, 9, 11],
  'minor':            [0, 2, 3, 5, 7, 8, 10],
  'dorian':           [0, 2, 3, 5, 7, 9, 10],
  'mixolydian':       [0, 2, 4, 5, 7, 9, 10],
  'pentatonic-major': [0, 2, 4, 7, 9],
  'pentatonic-minor': [0, 3, 5, 7, 10],
  'blues':            [0, 3, 5, 6, 7, 10],
  'harmonic-minor':   [0, 2, 3, 5, 7, 8, 11],
  'melodic-minor':    [0, 2, 3, 5, 7, 9, 11],
  'chromatic':        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

const NOTE_OFFSETS: Record<NoteName, number> = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
};

function quantizePitchToScale(pitch: number, rootOffset: number, scaleIntervals: number[]): number {
  const noteInOctave = ((pitch - rootOffset) % 12 + 12) % 12;
  const octave = Math.floor((pitch - rootOffset) / 12);

  // Find nearest scale degree
  let bestInterval = scaleIntervals[0]!;
  let bestDist = 12;
  for (const interval of scaleIntervals) {
    const dist = Math.min(Math.abs(noteInOctave - interval), 12 - Math.abs(noteInOctave - interval));
    if (dist < bestDist) {
      bestDist = dist;
      bestInterval = interval;
    }
  }

  return rootOffset + octave * 12 + bestInterval;
}

export function applyScaleQuantize(notes: ScheduledMidiNote[], config: ScaleQuantizeModule): ScheduledMidiNote[] {
  const rootOffset = NOTE_OFFSETS[config.root];
  const intervals = SCALE_INTERVALS[config.scale];

  return notes.map((note) => ({
    ...note,
    pitch: quantizePitchToScale(note.pitch, rootOffset, intervals),
  }));
}

/* ---- Strum ---- */

export function applyStrum(notes: ScheduledMidiNote[], config: StrumModule): ScheduledMidiNote[] {
  // Group notes by their start beat (notes at same time = a chord)
  const groups = new Map<number, ScheduledMidiNote[]>();
  for (const note of notes) {
    const key = Math.round(note.beat * 10000); // avoid float key issues
    const group = groups.get(key) ?? [];
    group.push(note);
    groups.set(key, group);
  }

  const result: ScheduledMidiNote[] = [];
  let chordIndex = 0;

  for (const [, group] of groups) {
    if (group.length <= 1) {
      result.push(...group);
      chordIndex++;
      continue;
    }

    // Sort by pitch for strum ordering
    const sorted = [...group].sort((a, b) => a.pitch - b.pitch);

    let direction: 'down' | 'up';
    if (config.direction === 'alternate') {
      direction = chordIndex % 2 === 0 ? 'down' : 'up';
    } else {
      direction = config.direction;
    }

    const ordered = direction === 'up' ? sorted : [...sorted].reverse();

    for (let i = 0; i < ordered.length; i++) {
      result.push({
        ...ordered[i]!,
        beat: ordered[i]!.beat + i * config.delayPerNote,
      });
    }
    chordIndex++;
  }

  return result;
}

/* ---- Probability Gate ---- */

export function applyProbabilityGate(notes: ScheduledMidiNote[], config: ProbabilityGateModule): ScheduledMidiNote[] {
  const seed = Math.round((notes[0]?.beat ?? 0) * 10000) + notes.length * 7;
  const rand = seededRandom(seed);

  return notes.filter(() => rand() < config.probability);
}

/* ---- Velocity Map ---- */

export function applyVelocityMap(notes: ScheduledMidiNote[], config: VelocityMapModule): ScheduledMidiNote[] {
  const seed = Math.round((notes[0]?.beat ?? 0) * 10000) + notes.length * 13;
  const rand = seededRandom(seed);

  return notes.map((note) => {
    let velocity: number;
    switch (config.curve) {
      case 'compress':
        // Push toward 0.5
        velocity = 0.5 + (note.velocity - 0.5) * 0.5;
        break;
      case 'expand':
        // Push away from 0.5
        velocity = note.velocity < 0.5
          ? note.velocity * note.velocity * 2
          : 1 - (1 - note.velocity) * (1 - note.velocity) * 2;
        break;
      case 'fixed':
        velocity = config.fixedValue;
        break;
      case 'random-range':
        velocity = config.min + rand() * (config.max - config.min);
        break;
    }
    return { ...note, velocity: clamp(velocity, 0, 1) };
  });
}

/* ---- Note Filter ---- */

export function applyNoteFilter(notes: ScheduledMidiNote[], config: NoteFilterModule): ScheduledMidiNote[] {
  return notes.filter((note) =>
    note.pitch >= config.minPitch &&
    note.pitch <= config.maxPitch &&
    note.velocity >= config.minVelocity &&
    note.velocity <= config.maxVelocity
  );
}

/* ---- Note Repeat ---- */

export function applyNoteRepeat(notes: ScheduledMidiNote[], config: NoteRepeatModule): ScheduledMidiNote[] {
  const result: ScheduledMidiNote[] = [];
  for (const note of notes) {
    result.push(note);
    let vel = note.velocity;
    for (let r = 1; r <= config.repeats; r++) {
      vel *= config.decay;
      result.push({
        ...note,
        beat: note.beat + r * config.interval,
        velocity: clamp(vel, 0, 1),
      });
    }
  }
  return result;
}

/* ---- Euclidean Rhythm ---- */

function euclideanPattern(steps: number, pulses: number, rotation: number): boolean[] {
  // Bjorklund's algorithm
  const safePulses = Math.min(pulses, steps);
  const pattern: boolean[] = new Array(steps).fill(false);

  if (safePulses === 0) return pattern;
  if (safePulses === steps) return new Array(steps).fill(true);

  let level = 0;
  const counts: number[] = [];
  const remainders: number[] = [];

  let divisor = steps - safePulses;
  remainders.push(safePulses);

  while (remainders[level]! > 1) {
    counts.push(Math.floor(divisor / remainders[level]!));
    const newRemainder = divisor % remainders[level]!;
    divisor = remainders[level]!;
    remainders.push(newRemainder);
    level++;
  }
  counts.push(divisor);

  // Build the pattern
  function build(lev: number): boolean[] {
    if (lev === -1) return [false];
    if (lev === -2) return [true];
    const seq: boolean[] = [];
    for (let i = 0; i < counts[lev]!; i++) {
      seq.push(...build(lev - 1));
    }
    if (remainders[lev]! > 0) {
      seq.push(...build(lev - 2));
    }
    return seq;
  }

  const built = build(level);
  // Apply rotation
  for (let i = 0; i < steps; i++) {
    pattern[i] = built[(i + rotation) % steps] ?? false;
  }
  return pattern;
}

export function applyEuclideanRhythm(
  notes: ScheduledMidiNote[],
  config: EuclideanRhythmModule,
  clipStartBeat: number,
  clipDurationBeats: number,
): ScheduledMidiNote[] {
  if (notes.length === 0) return notes;

  const pattern = euclideanPattern(config.steps, config.pulses, config.rotation);
  const beatsPerStep = clipDurationBeats / config.steps;

  // Build a set of "active" time slots based on the euclidean pattern
  const activeBeats = new Set<number>();
  for (let i = 0; i < config.steps; i++) {
    if (pattern[i]) {
      activeBeats.add(i);
    }
  }

  // For each note, check if it falls on an active step
  return notes.filter((note) => {
    const relBeat = note.beat - clipStartBeat;
    const stepIndex = Math.floor(relBeat / beatsPerStep) % config.steps;
    return activeBeats.has(stepIndex);
  });
}
