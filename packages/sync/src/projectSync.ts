import * as Y from 'yjs';
import type { Project, Track, Clip } from '@staves/storage';

interface ProjectStoreState {
  project: Project | null;
  tracks: Track[];
  clips: Clip[];
}

interface ProjectStoreActions {
  setProject: (p: Project) => void;
  setTracks: (t: Track[]) => void;
  setClips: (c: Clip[]) => void;
}

type ProjectStore = ProjectStoreState & ProjectStoreActions;

/**
 * Bidirectional binding between Yjs shared types and the project Zustand store.
 * Yjs → Store: observe Yjs changes, update store.
 * Store → Yjs: subscribe to store, update Yjs doc.
 */
export function projectSync(
  doc: Y.Doc,
  getState: () => ProjectStore,
  subscribe: (listener: (state: ProjectStore) => void) => () => void,
) {
  const yProject = doc.getMap('project');
  const yTracks = doc.getArray<Y.Map<unknown>>('tracks');
  const yClips = doc.getArray<Y.Map<unknown>>('clips');

  let isSyncing = false;

  // --- Yjs → Store ---

  yProject.observe(() => {
    if (isSyncing) return;
    isSyncing = true;
    const data = yProject.toJSON() as Record<string, unknown>;
    if (data['id']) {
      getState().setProject(data as unknown as Project);
    }
    isSyncing = false;
  });

  yTracks.observe(() => {
    if (isSyncing) return;
    isSyncing = true;
    const tracks = yTracks.toArray().map((m) => m.toJSON() as unknown as Track);
    getState().setTracks(tracks);
    isSyncing = false;
  });

  yClips.observe(() => {
    if (isSyncing) return;
    isSyncing = true;
    const clips = yClips.toArray().map((m) => m.toJSON() as unknown as Clip);
    getState().setClips(clips);
    isSyncing = false;
  });

  // --- Store → Yjs ---

  const unsubscribe = subscribe((state) => {
    if (isSyncing) return;
    isSyncing = true;

    doc.transact(() => {
      // Sync project
      if (state.project) {
        for (const [key, value] of Object.entries(state.project)) {
          if (yProject.get(key) !== value) {
            yProject.set(key, value);
          }
        }
      }

      // Sync tracks
      syncArray(yTracks, state.tracks as unknown as Record<string, unknown>[], 'id');

      // Sync clips
      syncArray(yClips, state.clips as unknown as Record<string, unknown>[], 'id');
    });

    isSyncing = false;
  });

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
