import Dexie, { type EntityTable } from 'dexie';

export interface Project {
  id: string;
  name: string;
  bpm: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  sampleRate: number;
  createdAt: number;
  updatedAt: number;
}

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

export { db };
