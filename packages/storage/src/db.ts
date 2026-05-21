import Dexie, { type EntityTable } from 'dexie';

export interface TempoEventData {
  id: string;
  beat: number;
  bpm: number;
  curveType: 'constant' | 'linear';
}

export interface TimeSignatureEventData {
  id: string;
  beat: number;
  numerator: number;
  denominator: number;
}

export interface Project {
  id: string;
  name: string;
  bpm: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  sampleRate: number;
  createdAt: number;
  updatedAt: number;
  tempoEvents?: TempoEventData[];
  timeSignatureEvents?: TimeSignatureEventData[];
}

export type TrackType = 'audio' | 'drum' | 'midi';

export interface Track {
  id: string;
  projectId: string;
  name: string;
  order: number;
  volume: number;
  pan: number;
  isMuted: boolean;
  isSolo: boolean;
  isArmed: boolean;
  color: string;
  inputDeviceId: string; // '' = system default
  inputChannel: number; // -1 = all channels (stereo), 0 = ch 1, 1 = ch 2, etc.
  type: TrackType;
}

export interface Clip {
  id: string;
  trackId: string;
  projectId: string;
  audioBlobId: string;
  name: string;
  startBeat: number;
  durationBeats: number;
  offsetBeats: number;
  gainDb: number;
  /** Fade-in duration in beats (default 0). */
  fadeInBeats: number;
  /** Fade-out duration in beats (default 0). */
  fadeOutBeats: number;
  /** Total duration of the source audio in beats (for non-destructive trim). */
  sourceDurationBeats: number;
  /** References DrumPattern.id for drum clips. When set, audioBlobId is ''. */
  drumPatternId?: string;
  /** References MidiPattern.id for MIDI clips. When set, audioBlobId is ''. */
  midiPatternId?: string;
}

export interface DrumStep {
  /** Which drum pad this step belongs to (index 0-11). */
  padIndex: number;
  /** Step position (0-based) within the pattern. */
  step: number;
  /** Velocity 0-1 (default 1). */
  velocity: number;
}

export interface DrumPadConfig {
  /** Index 0-11. */
  index: number;
  /** Display name (e.g. "Kick", "Snare"). */
  name: string;
  /** Sample URL relative to public/ (e.g. "/drums/kick.wav"). */
  sampleUrl: string;
}

export interface DrumPattern {
  id: string;
  projectId: string;
  /** Number of steps in the pattern (default 16). */
  steps: number;
  /** Step subdivision: how many steps per beat (default 4 = sixteenth notes). */
  stepsPerBeat: number;
  /** The active steps. Sparse — only "on" steps are stored. */
  activeSteps: DrumStep[];
  /** Pad configuration (12 pads). */
  pads: DrumPadConfig[];
  /** Track module chain (MIDI generators, effects, etc.). */
  modules?: TrackModule[];
}

export type OscillatorWaveform = 'sine' | 'sawtooth' | 'square' | 'triangle';
export type FilterType = 'lowpass' | 'highpass' | 'bandpass';

export interface ADSREnvelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface OscillatorConfig {
  waveform: OscillatorWaveform;
  detune: number;
  octaveOffset: number;
}

export type NoiseType = 'white' | 'pink' | 'brown';

export interface NoiseConfig {
  type: NoiseType;
}

export interface SynthMixer {
  osc1: number;
  osc2: number;
  osc3: number;
  noise: number;
}

export interface SynthPatch {
  oscillator: OscillatorConfig;
  osc2?: OscillatorConfig;
  osc3?: OscillatorConfig;
  noise?: NoiseConfig;
  mixer?: SynthMixer;
  filter: {
    type: FilterType;
    cutoff: number;
    resonance: number;
  };
  ampEnvelope: ADSREnvelope;
  filterEnvelope: ADSREnvelope & { amount: number };
}

/* ---- Track Module System ---- */

export type ArpMode = 'up' | 'down' | 'up-down' | 'random';
export type ArpRate = '1/4' | '1/8' | '1/8T' | '1/16' | '1/16T' | '1/32';

export interface ArpeggiatorModule {
  type: 'arpeggiator';
  id: string;
  enabled: boolean;
  mode: ArpMode;
  rate: ArpRate;
  /** Number of octaves to span (1-4). */
  octaves: number;
  /** Note duration as fraction of step length (0.01-1.0). */
  gateLength: number;
  /** Swing amount (0 = none, 1 = full triplet swing). */
  swing: number;
  /** 0 = auto (use all input notes), 1-32 = fixed step count before repeating. */
  patternLength: number;
  velocityCurve: 'flat' | 'accent-first' | 'crescendo' | 'decrescendo';
}

export type ChordQuality = 'major' | 'minor' | 'dim' | 'aug' | 'sus2' | 'sus4' | 'maj7' | 'min7' | 'dom7' | 'custom';

export interface ChordModule {
  type: 'chord';
  id: string;
  enabled: boolean;
  quality: ChordQuality;
  /** Custom intervals in semitones from root (used when quality === 'custom'). */
  customIntervals: number[];
  /** Velocity scaling for added notes (0-1, 1 = same as root). */
  velocityScale: number;
}

export interface HumanizeModule {
  type: 'humanize';
  id: string;
  enabled: boolean;
  /** Max random timing offset in beats (e.g. 0.02 = ~30ms at 120bpm). */
  timingAmount: number;
  /** Max random velocity offset (0-1 range, e.g. 0.1 = ±10%). */
  velocityAmount: number;
  /** Max random duration offset as fraction (e.g. 0.1 = ±10%). */
  durationAmount: number;
}

export interface TransposeModule {
  type: 'transpose';
  id: string;
  enabled: boolean;
  /** Semitones to shift (-48 to 48). */
  semitones: number;
}

export type ScaleName = 'major' | 'minor' | 'dorian' | 'mixolydian' | 'pentatonic-major' | 'pentatonic-minor' | 'blues' | 'harmonic-minor' | 'melodic-minor' | 'chromatic';
export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export interface ScaleQuantizeModule {
  type: 'scale-quantize';
  id: string;
  enabled: boolean;
  root: NoteName;
  scale: ScaleName;
}

export type StrumDirection = 'down' | 'up' | 'alternate';

export interface StrumModule {
  type: 'strum';
  id: string;
  enabled: boolean;
  /** Delay between each note in beats. */
  delayPerNote: number;
  direction: StrumDirection;
}

export interface ProbabilityGateModule {
  type: 'probability-gate';
  id: string;
  enabled: boolean;
  /** Probability each note plays (0-1). */
  probability: number;
}

export type VelocityCurveType = 'compress' | 'expand' | 'fixed' | 'random-range';

export interface VelocityMapModule {
  type: 'velocity-map';
  id: string;
  enabled: boolean;
  curve: VelocityCurveType;
  /** Fixed velocity value (used when curve === 'fixed', 0-1). */
  fixedValue: number;
  /** Min velocity for random-range (0-1). */
  min: number;
  /** Max velocity for random-range (0-1). */
  max: number;
}

export interface NoteFilterModule {
  type: 'note-filter';
  id: string;
  enabled: boolean;
  /** Minimum MIDI pitch to pass (0-127). */
  minPitch: number;
  /** Maximum MIDI pitch to pass (0-127). */
  maxPitch: number;
  /** Minimum velocity to pass (0-1). */
  minVelocity: number;
  /** Maximum velocity to pass (0-1). */
  maxVelocity: number;
}

export interface NoteRepeatModule {
  type: 'note-repeat';
  id: string;
  enabled: boolean;
  /** Number of repeats (1-8). */
  repeats: number;
  /** Interval between repeats in beats. */
  interval: number;
  /** Velocity decay per repeat (0-1, e.g. 0.8 = each repeat is 80% of previous). */
  decay: number;
}

export interface EuclideanRhythmModule {
  type: 'euclidean-rhythm';
  id: string;
  enabled: boolean;
  /** Total number of steps in the pattern (2-32). */
  steps: number;
  /** Number of pulses/hits to distribute (1-steps). */
  pulses: number;
  /** Rotation offset (0 to steps-1). */
  rotation: number;
}

/** Discriminated union — grows as new module types are added. */
export type TrackModule =
  | ArpeggiatorModule
  | ChordModule
  | HumanizeModule
  | TransposeModule
  | ScaleQuantizeModule
  | StrumModule
  | ProbabilityGateModule
  | VelocityMapModule
  | NoteFilterModule
  | NoteRepeatModule
  | EuclideanRhythmModule;

export interface MidiNote {
  id: string;
  pitch: number;
  startBeat: number;
  durationBeats: number;
  velocity: number;
}

export interface MidiPattern {
  id: string;
  projectId: string;
  durationBeats: number;
  notes: MidiNote[];
  synthPatch: SynthPatch;
  /** Track module chain (MIDI generators, effects, etc.). */
  modules?: TrackModule[];
}

export interface Marker {
  id: string;
  projectId: string;
  beat: number;
  name: string;
  color: string;
}

export interface AudioBlob {
  id: string;
  projectId: string;
  data: Blob;
  format: 'webm-opus' | 'mp4-aac';
  sampleRate: number;
  durationSeconds: number;
  createdAt: number;
}

export interface WaveformCache {
  audioBlobId: string;
  peaks: Float32Array;
  samplesPerPeak: number;
}

const db = new Dexie('staves') as Dexie & {
  projects: EntityTable<Project, 'id'>;
  tracks: EntityTable<Track, 'id'>;
  clips: EntityTable<Clip, 'id'>;
  audioBlobs: EntityTable<AudioBlob, 'id'>;
  waveformCache: EntityTable<WaveformCache, 'audioBlobId'>;
  drumPatterns: EntityTable<DrumPattern, 'id'>;
  midiPatterns: EntityTable<MidiPattern, 'id'>;
  markers: EntityTable<Marker, 'id'>;
};

db.version(1).stores({
  projects: 'id, updatedAt',
  tracks: 'id, projectId, order',
  clips: 'id, trackId, projectId, audioBlobId',
  audioBlobs: 'id, projectId',
  waveformCache: 'audioBlobId',
});

db.version(2).stores({
  projects: 'id, updatedAt',
  tracks: 'id, projectId, order',
  clips: 'id, trackId, projectId, audioBlobId',
  audioBlobs: 'id, projectId',
  waveformCache: 'audioBlobId',
}).upgrade((tx) => {
  return tx.table('tracks').toCollection().modify((track) => {
    if (track.inputDeviceId === undefined) {
      track.inputDeviceId = '';
    }
  });
});

db.version(3).stores({
  projects: 'id, updatedAt',
  tracks: 'id, projectId, order',
  clips: 'id, trackId, projectId, audioBlobId',
  audioBlobs: 'id, projectId',
  waveformCache: 'audioBlobId',
}).upgrade((tx) => {
  return tx.table('tracks').toCollection().modify((track) => {
    if (track.inputChannel === undefined) {
      track.inputChannel = -1;
    }
  });
});

// Migrate existing projects to include tempo/time-signature event arrays
db.version(4).stores({
  projects: 'id, updatedAt',
  tracks: 'id, projectId, order',
  clips: 'id, trackId, projectId, audioBlobId',
  audioBlobs: 'id, projectId',
  waveformCache: 'audioBlobId',
}).upgrade((tx) => {
  return tx.table('projects').toCollection().modify((project) => {
    if (!project.tempoEvents) {
      project.tempoEvents = [{
        id: crypto.randomUUID(),
        beat: 0,
        bpm: project.bpm || 120,
        curveType: 'constant',
      }];
    }
    if (!project.timeSignatureEvents) {
      project.timeSignatureEvents = [{
        id: crypto.randomUUID(),
        beat: 0,
        numerator: project.timeSignatureNumerator || 4,
        denominator: project.timeSignatureDenominator || 4,
      }];
    }
  });
});

// Migrate existing clips to include sourceDurationBeats
db.version(5).stores({
  projects: 'id, updatedAt',
  tracks: 'id, projectId, order',
  clips: 'id, trackId, projectId, audioBlobId',
  audioBlobs: 'id, projectId',
  waveformCache: 'audioBlobId',
}).upgrade((tx) => {
  return tx.table('clips').toCollection().modify((clip) => {
    if (clip.sourceDurationBeats === undefined) {
      // For existing clips, the current offsetBeats + durationBeats represents the full source extent
      clip.sourceDurationBeats = clip.offsetBeats + clip.durationBeats;
    }
  });
});

// Add drum track support: Track.type, DrumPattern table
db.version(6).stores({
  projects: 'id, updatedAt',
  tracks: 'id, projectId, order',
  clips: 'id, trackId, projectId, audioBlobId',
  audioBlobs: 'id, projectId',
  waveformCache: 'audioBlobId',
  drumPatterns: 'id, projectId',
}).upgrade((tx) => {
  return tx.table('tracks').toCollection().modify((track) => {
    if (track.type === undefined) {
      track.type = 'audio';
    }
  });
});

// Add timeline markers / cue points
db.version(7).stores({
  projects: 'id, updatedAt',
  tracks: 'id, projectId, order',
  clips: 'id, trackId, projectId, audioBlobId',
  audioBlobs: 'id, projectId',
  waveformCache: 'audioBlobId',
  drumPatterns: 'id, projectId',
  markers: 'id, projectId, beat',
});

// Migrate existing clips to include fadeInBeats / fadeOutBeats
db.version(8).stores({
  projects: 'id, updatedAt',
  tracks: 'id, projectId, order',
  clips: 'id, trackId, projectId, audioBlobId',
  audioBlobs: 'id, projectId',
  waveformCache: 'audioBlobId',
  drumPatterns: 'id, projectId',
  markers: 'id, projectId, beat',
}).upgrade((tx) => {
  return tx.table('clips').toCollection().modify((clip) => {
    if (clip.fadeInBeats === undefined) clip.fadeInBeats = 0;
    if (clip.fadeOutBeats === undefined) clip.fadeOutBeats = 0;
  });
});

// Add MIDI synth track support: MidiPattern table
db.version(9).stores({
  projects: 'id, updatedAt',
  tracks: 'id, projectId, order',
  clips: 'id, trackId, projectId, audioBlobId',
  audioBlobs: 'id, projectId',
  waveformCache: 'audioBlobId',
  drumPatterns: 'id, projectId',
  midiPatterns: 'id, projectId',
  markers: 'id, projectId, beat',
});

// Add track module system (modules field on patterns)
db.version(10).stores({
  projects: 'id, updatedAt',
  tracks: 'id, projectId, order',
  clips: 'id, trackId, projectId, audioBlobId',
  audioBlobs: 'id, projectId',
  waveformCache: 'audioBlobId',
  drumPatterns: 'id, projectId',
  midiPatterns: 'id, projectId',
  markers: 'id, projectId, beat',
}).upgrade((tx) => {
  // modules is stored inline in the pattern JSON, no index change needed.
  // Just ensure existing records get the field defaulted.
  return Promise.all([
    tx.table('midiPatterns').toCollection().modify((p) => {
      if (!p.modules) p.modules = [];
    }),
    tx.table('drumPatterns').toCollection().modify((p) => {
      if (!p.modules) p.modules = [];
    }),
  ]);
});

export { db };
