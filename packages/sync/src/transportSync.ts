import * as Y from 'yjs';

interface TransportStoreState {
  isPlaying: boolean;
  isRecording: boolean;
  bpm: number;
}

interface TransportStoreActions {
  setPlaying: (playing: boolean) => void;
  setRecording: (recording: boolean) => void;
  setBpm: (bpm: number) => void;
}

type TransportStore = TransportStoreState & TransportStoreActions;

export interface TransportSyncCallbacks {
  onRemotePlay: (startBeat: number) => void;
  onRemoteStop: () => void;
  onRemoteRecord: (startBeat: number) => void;
}

/**
 * Bidirectional binding between Yjs shared map and transport store.
 * Transport commands (play/stop/record) sync between all peers.
 * Each peer runs its own local audio engine — only the command is synced.
 */
export function transportSync(
  doc: Y.Doc,
  getState: () => TransportStore,
  subscribe: (listener: (state: TransportStore) => void) => () => void,
  callbacks: TransportSyncCallbacks,
) {
  const yTransport = doc.getMap('transport');
  let isSyncing = false;

  // --- Yjs → Store (remote peer changed transport state) ---
  yTransport.observe(() => {
    if (isSyncing) return;
    isSyncing = true;

    const isPlaying = yTransport.get('isPlaying') as boolean | undefined;
    const isRecording = yTransport.get('isRecording') as boolean | undefined;
    const startBeat = (yTransport.get('startBeat') as number) ?? 0;
    const bpm = yTransport.get('bpm') as number | undefined;
    const state = getState();

    if (bpm !== undefined && bpm !== state.bpm) {
      state.setBpm(bpm);
    }

    if (isRecording && !state.isRecording && !state.isPlaying) {
      // Remote peer started recording — we just play along
      state.setPlaying(true);
      callbacks.onRemoteRecord(startBeat);
    } else if (isPlaying && !state.isPlaying) {
      state.setPlaying(true);
      callbacks.onRemotePlay(startBeat);
    } else if (isPlaying === false && state.isPlaying) {
      state.setPlaying(false);
      state.setRecording(false);
      callbacks.onRemoteStop();
    }

    isSyncing = false;
  });

  // --- Store → Yjs (local peer changed transport state) ---
  const unsubscribe = subscribe((state) => {
    if (isSyncing) return;
    isSyncing = true;

    doc.transact(() => {
      if (yTransport.get('isPlaying') !== state.isPlaying) {
        yTransport.set('isPlaying', state.isPlaying);
      }
      if (yTransport.get('isRecording') !== state.isRecording) {
        yTransport.set('isRecording', state.isRecording);
      }
      if (yTransport.get('bpm') !== state.bpm) {
        yTransport.set('bpm', state.bpm);
      }
    });

    isSyncing = false;
  });

  return unsubscribe;
}
