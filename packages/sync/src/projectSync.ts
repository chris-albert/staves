import * as Y from 'yjs';
import type { WebrtcProvider } from 'y-webrtc';
import type { Project, Track, Clip, TempoEventData, TimeSignatureEventData } from '@staves/storage';

/** Fields on the Project object that are synced as separate Yjs arrays (not in the project map). */
const ARRAY_SYNCED_KEYS = new Set(['tempoEvents', 'timeSignatureEvents']);

interface ProjectStoreState {
  project: Project | null;
  tracks: Track[];
  clips: Clip[];
  tempoEvents: TempoEventData[];
  timeSignatureEvents: TimeSignatureEventData[];
}

interface ProjectStoreActions {
  setProject: (p: Project) => void;
  setTracks: (t: Track[]) => void;
  setClips: (c: Clip[]) => void;
  setTempoEvents: (e: TempoEventData[]) => void;
  setTimeSignatureEvents: (e: TimeSignatureEventData[]) => void;
}

type ProjectStore = ProjectStoreState & ProjectStoreActions;

export interface ProjectSyncOptions {
  /** True when this peer is joining an existing session (doesn't own the data). */
  isJoining?: boolean;
  /** The WebRTC provider, used to listen for the 'synced' event. */
  provider?: WebrtcProvider;
}

/**
 * Bidirectional binding between Yjs shared types and the project Zustand store.
 * Yjs → Store: observe Yjs changes, update store.
 * Store → Yjs: subscribe to store, update Yjs doc.
 *
 * When `isJoining` is true, Store→Yjs writes are suppressed until the first
 * remote update arrives via Yjs. This prevents the joining peer's empty/skeleton
 * state from overwriting the host's data.
 */
export function projectSync(
  doc: Y.Doc,
  getState: () => ProjectStore,
  subscribe: (listener: (state: ProjectStore) => void) => () => void,
  options: ProjectSyncOptions = {},
) {
  const yProject = doc.getMap('project');
  const yTracks = doc.getArray<Y.Map<unknown>>('tracks');
  const yClips = doc.getArray<Y.Map<unknown>>('clips');
  const yTempoEvents = doc.getArray<Y.Map<unknown>>('tempoEvents');
  const yTimeSignatureEvents = doc.getArray<Y.Map<unknown>>('timeSignatureEvents');

  let isSyncing = false;

  // When joining, suppress Store→Yjs until the first Yjs→Store update arrives.
  // This prevents the joining peer's empty state from wiping the host's data.
  let storeToYjsEnabled = !options.isJoining;

  /** Read the current Yjs state and push it into the store. */
  const hydrateStoreFromYjs = () => {
    isSyncing = true;

    const projectData = yProject.toJSON() as Record<string, unknown>;
    if (projectData['id']) {
      getState().setProject(projectData as unknown as Project);
    }

    if (yTracks.length > 0) {
      getState().setTracks(yTracks.toArray().map((m) => m.toJSON() as unknown as Track));
    }

    if (yClips.length > 0) {
      getState().setClips(yClips.toArray().map((m) => m.toJSON() as unknown as Clip));
    }

    if (yTempoEvents.length > 0) {
      getState().setTempoEvents(yTempoEvents.toArray().map((m) => m.toJSON() as unknown as TempoEventData));
    }

    if (yTimeSignatureEvents.length > 0) {
      getState().setTimeSignatureEvents(yTimeSignatureEvents.toArray().map((m) => m.toJSON() as unknown as TimeSignatureEventData));
    }

    storeToYjsEnabled = true;
    isSyncing = false;
  };

  // --- Yjs → Store ---

  yProject.observe(() => {
    if (isSyncing) return;
    isSyncing = true;
    const data = yProject.toJSON() as Record<string, unknown>;
    if (data['id']) {
      getState().setProject(data as unknown as Project);
      storeToYjsEnabled = true;
    }
    isSyncing = false;
  });

  yTracks.observe(() => {
    if (isSyncing) return;
    isSyncing = true;
    const tracks = yTracks.toArray().map((m) => m.toJSON() as unknown as Track);
    getState().setTracks(tracks);
    storeToYjsEnabled = true;
    isSyncing = false;
  });

  yClips.observe(() => {
    if (isSyncing) return;
    isSyncing = true;
    const clips = yClips.toArray().map((m) => m.toJSON() as unknown as Clip);
    getState().setClips(clips);
    storeToYjsEnabled = true;
    isSyncing = false;
  });

  yTempoEvents.observe(() => {
    if (isSyncing) return;
    isSyncing = true;
    const events = yTempoEvents.toArray().map((m) => m.toJSON() as unknown as TempoEventData);
    getState().setTempoEvents(events);
    storeToYjsEnabled = true;
    isSyncing = false;
  });

  yTimeSignatureEvents.observe(() => {
    if (isSyncing) return;
    isSyncing = true;
    const events = yTimeSignatureEvents.toArray().map((m) => m.toJSON() as unknown as TimeSignatureEventData);
    getState().setTimeSignatureEvents(events);
    storeToYjsEnabled = true;
    isSyncing = false;
  });

  // --- Store → Yjs ---

  const unsubscribe = subscribe((state) => {
    if (isSyncing || !storeToYjsEnabled) return;
    isSyncing = true;

    doc.transact(() => {
      // Sync project (skip array-synced keys — they have their own Yjs arrays)
      if (state.project) {
        for (const [key, value] of Object.entries(state.project)) {
          if (ARRAY_SYNCED_KEYS.has(key)) continue;
          if (yProject.get(key) !== value) {
            yProject.set(key, value);
          }
        }
      }

      // Sync tracks
      syncArray(yTracks, state.tracks as unknown as Record<string, unknown>[], 'id');

      // Sync clips
      syncArray(yClips, state.clips as unknown as Record<string, unknown>[], 'id');

      // Sync tempo events
      syncArray(yTempoEvents, state.tempoEvents as unknown as Record<string, unknown>[], 'id');

      // Sync time signature events
      syncArray(yTimeSignatureEvents, state.timeSignatureEvents as unknown as Record<string, unknown>[], 'id');
    });

    isSyncing = false;
  });

  // --- Initial seeding / hydration ---

  if (options.isJoining && options.provider) {
    // Joining peer: listen for the 'synced' event from y-webrtc.
    // When the initial doc sync completes, read the Yjs state into the store.
    // This is the most reliable way to get the initial state from the host —
    // observers might miss the initial sync if all data arrives in one applyUpdate.
    const onSynced = ({ synced }: { synced: boolean }) => {
      if (synced) {
        hydrateStoreFromYjs();
      }
    };
    options.provider.on('synced', onSynced);

    // Also listen to doc 'update' events for any remote changes that arrive
    // before the 'synced' event (belt and suspenders)
    const onUpdate = (_update: Uint8Array, origin: unknown) => {
      // Only handle remote updates (origin is the provider for remote, null/doc for local)
      if (origin !== doc) {
        hydrateStoreFromYjs();
      }
    };
    doc.on('update', onUpdate);

    // Return an unsubscribe that cleans up both the store subscription and the synced listener
    const origUnsub = unsubscribe;
    return () => {
      origUnsub();
      options.provider!.off('synced', onSynced);
      doc.off('update', onUpdate);
    };
  }

  if (!options.isJoining) {
    // Host peer: push local state into Yjs so joining peers receive it.
    const state = getState();
    if (state.project) {
      isSyncing = true;
      doc.transact(() => {
        for (const [key, value] of Object.entries(state.project!)) {
          if (ARRAY_SYNCED_KEYS.has(key)) continue;
          yProject.set(key, value);
        }
        syncArray(yTracks, state.tracks as unknown as Record<string, unknown>[], 'id');
        syncArray(yClips, state.clips as unknown as Record<string, unknown>[], 'id');
        syncArray(yTempoEvents, state.tempoEvents as unknown as Record<string, unknown>[], 'id');
        syncArray(yTimeSignatureEvents, state.timeSignatureEvents as unknown as Record<string, unknown>[], 'id');
      });
      isSyncing = false;
    }
  }

  return unsubscribe;
}

function syncArray<T extends Record<string, unknown>>(
  yArray: Y.Array<Y.Map<unknown>>,
  items: T[],
  idKey: string,
) {
  const existingIds = new Set<unknown>();

  // Update existing / remove stale
  for (let i = yArray.length - 1; i >= 0; i--) {
    const yMap = yArray.get(i);
    const id = yMap.get(idKey);
    const item = items.find((t) => t[idKey] === id);
    if (!item) {
      yArray.delete(i, 1);
    } else {
      existingIds.add(id);
      for (const [key, value] of Object.entries(item)) {
        if (yMap.get(key) !== value) {
          yMap.set(key, value);
        }
      }
    }
  }

  // Add new items
  for (const item of items) {
    if (!existingIds.has(item[idKey])) {
      const yMap = new Y.Map<unknown>();
      for (const [key, value] of Object.entries(item)) {
        yMap.set(key, value);
      }
      yArray.push([yMap]);
    }
  }
}
