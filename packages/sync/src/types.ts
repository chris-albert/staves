export interface PeerState {
  clientId: number;
  name: string;
  color: string;
  cursorBeat: number | null;
  selection: { startBeat: number; endBeat: number; trackId: string } | null;
  recordingTrackId: string | null;
}

export interface TransportCommand {
  type: 'play' | 'stop' | 'seek' | 'record';
  beat?: number;
  timestamp: number;
}

export interface AudioChunk {
  blobId: string;
  chunkIndex: number;
  totalChunks: number;
  data: ArrayBuffer;
  format: 'webm-opus' | 'mp4-aac';
  sampleRate: number;
  durationSeconds: number;
  projectId: string;
}
