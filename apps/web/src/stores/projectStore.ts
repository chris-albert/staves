import { create } from 'zustand';
import type { Project, Track, Clip } from '@staves/storage';

interface ProjectState {
  project: Project | null;
  tracks: Track[];
  clips: Clip[];
}

interface ProjectActions {
  setProject: (project: Project | null) => void;
  updateProject: (changes: Partial<Project>) => void;
  setTracks: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  updateTrack: (id: string, changes: Partial<Track>) => void;
  removeTrack: (id: string) => void;
  setClips: (clips: Clip[]) => void;
  addClip: (clip: Clip) => void;
  updateClip: (id: string, changes: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  reset: () => void;
}

const initialState: ProjectState = {
  project: null,
  tracks: [],
  clips: [],
};

export const useProjectStore = create<ProjectState & ProjectActions>()((set) => ({
  ...initialState,

  setProject: (project) => set({ project }),

  updateProject: (changes) =>
    set((s) => ({
      project: s.project ? { ...s.project, ...changes, updatedAt: Date.now() } : null,
    })),

  setTracks: (tracks) => set({ tracks }),

  addTrack: (track) => set((s) => ({ tracks: [...s.tracks, track] })),

  updateTrack: (id, changes) =>
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === id ? { ...t, ...changes } : t)),
    })),

  removeTrack: (id) =>
    set((s) => ({
      tracks: s.tracks.filter((t) => t.id !== id),
      clips: s.clips.filter((c) => c.trackId !== id),
    })),

  setClips: (clips) => set({ clips }),

  addClip: (clip) => set((s) => ({ clips: [...s.clips, clip] })),

  updateClip: (id, changes) =>
    set((s) => ({
      clips: s.clips.map((c) => (c.id === id ? { ...c, ...changes } : c)),
    })),

  removeClip: (id) => set((s) => ({ clips: s.clips.filter((c) => c.id !== id) })),

  reset: () => set(initialState),
}));
