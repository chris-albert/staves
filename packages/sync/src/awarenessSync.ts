import type { PeerState } from './types';

type Awareness = {
  setLocalStateField: (field: string, value: unknown) => void;
  getLocalState: () => Record<string, unknown> | null;
  getStates: () => Map<number, Record<string, unknown>>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback: (...args: unknown[]) => void) => void;
};

const PEER_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

/**
 * Manages local awareness state (cursor, selection, recording status)
 * and provides access to remote peers' awareness.
 */
export const awarenessSync = {
  /** Set up local awareness state. */
  initLocal(awareness: Awareness, name: string): void {
    const clientId = (awareness.getLocalState() as Record<string, unknown>)?.['clientID'] as number ?? 0;
    const color = PEER_COLORS[clientId % PEER_COLORS.length]!;
    awareness.setLocalStateField('user', {
      name,
      color,
      cursorBeat: null,
      selection: null,
      recordingTrackId: null,
    } satisfies Omit<PeerState, 'clientId'>);
  },

  /** Update cursor beat position. */
  setCursorBeat(awareness: Awareness, beat: number | null): void {
    const user = awareness.getLocalState()?.['user'] as Omit<PeerState, 'clientId'> | undefined;
    if (!user) return;
    awareness.setLocalStateField('user', { ...user, cursorBeat: beat });
  },

  /** Update selection range. */
  setSelection(
    awareness: Awareness,
    selection: PeerState['selection'],
  ): void {
    const user = awareness.getLocalState()?.['user'] as Omit<PeerState, 'clientId'> | undefined;
    if (!user) return;
    awareness.setLocalStateField('user', { ...user, selection });
  },

  /** Update recording track indicator. */
  setRecordingTrack(awareness: Awareness, trackId: string | null): void {
    const user = awareness.getLocalState()?.['user'] as Omit<PeerState, 'clientId'> | undefined;
    if (!user) return;
    awareness.setLocalStateField('user', { ...user, recordingTrackId: trackId });
  },

  /** Get all remote peers' state. */
  getPeers(awareness: Awareness): PeerState[] {
    const states = awareness.getStates();
    const localId = (awareness.getLocalState() as Record<string, unknown>)?.['clientID'] as number;
    const peers: PeerState[] = [];

    for (const [clientId, state] of states) {
      if (clientId === localId) continue;
      const user = state['user'] as Omit<PeerState, 'clientId'> | undefined;
      if (user) {
        peers.push({ clientId, ...user });
      }
    }

    return peers;
  },

  /** Subscribe to awareness changes. */
  onPeersChange(
    awareness: Awareness,
    callback: (peers: PeerState[]) => void,
  ): () => void {
    const handler = () => callback(awarenessSync.getPeers(awareness));
    awareness.on('change', handler);
    return () => awareness.off('change', handler);
  },
};
