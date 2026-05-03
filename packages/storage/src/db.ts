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

export type TrackType = 'audio' | 'drum';

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

export { db };
