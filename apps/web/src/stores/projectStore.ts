import { create } from 'zustand';
import type { Project, Track, Clip, TempoEventData, TimeSignatureEventData, DrumPattern } from '@staves/storage';

interface ProjectState {
  project: Project | null;
  tracks: Track[];
  clips: Clip[];
  tempoEvents: TempoEventData[];
  timeSignatureEvents: TimeSignatureEventData[];
  drumPatterns: DrumPattern[];
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
  setTempoEvents: (events: TempoEventData[]) => void;
  addTempoEvent: (event: TempoEventData) => void;
  updateTempoEvent: (id: string, changes: Partial<TempoEventData>) => void;
  removeTempoEvent: (id: string) => void;
  setTimeSignatureEvents: (events: TimeSignatureEventData[]) => void;
  addTimeSignatureEvent: (event: TimeSignatureEventData) => void;
  updateTimeSignatureEvent: (id: string, changes: Partial<TimeSignatureEventData>) => void;
  removeTimeSignatureEvent: (id: string) => void;
  setDrumPatterns: (patterns: DrumPattern[]) => void;
  addDrumPattern: (pattern: DrumPattern) => void;
  updateDrumPattern: (id: string, changes: Partial<DrumPattern>) => void;
  removeDrumPattern: (id: string) => void;
  reset: () => void;
}

const defaultTempoEvents: TempoEventData[] = [
  { id: '_default', beat: 0, bpm: 120, curveType: 'constant' },
];
const defaultTimeSigEvents: TimeSignatureEventData[] = [
  { id: '_default', beat: 0, numerator: 4, denominator: 4 },
];

const initialState: ProjectState = {
  project: null,
  tracks: [],
  clips: [],
  tempoEvents: defaultTempoEvents,
  timeSignatureEvents: defaultTimeSigEvents,
  drumPatterns: [],
};

export const useProjectStore = create<ProjectState & ProjectActions>()((set) => ({
  ...initialState,

  setProject: (project) => set({
    project,
    tempoEvents: project?.tempoEvents ?? defaultTempoEvents,
    timeSignatureEvents: project?.timeSignatureEvents ?? defaultTimeSigEvents,
  }),

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

  // Tempo events
  setTempoEvents: (tempoEvents) => set({ tempoEvents }),

  addTempoEvent: (event) =>
    set((s) => ({ tempoEvents: [...s.tempoEvents, event] })),

  updateTempoEvent: (id, changes) =>
    set((s) => ({
      tempoEvents: s.tempoEvents.map((e) => (e.id === id ? { ...e, ...changes } : e)),
    })),

  removeTempoEvent: (id) =>
    set((s) => {
      const filtered = s.tempoEvents.filter((e) => e.id !== id);
      // Never remove the beat-0 event
      if (filtered.length === 0) return s;
      const sorted = [...filtered].sort((a, b) => a.beat - b.beat);
      if (sorted[0]!.beat !== 0) return s;
      return { tempoEvents: filtered };
    }),

  // Time signature events
  setTimeSignatureEvents: (timeSignatureEvents) => set({ timeSignatureEvents }),

  addTimeSignatureEvent: (event) =>
    set((s) => ({ timeSignatureEvents: [...s.timeSignatureEvents, event] })),

  updateTimeSignatureEvent: (id, changes) =>
    set((s) => ({
      timeSignatureEvents: s.timeSignatureEvents.map((e) =>
        e.id === id ? { ...e, ...changes } : e,
      ),
    })),

  removeTimeSignatureEvent: (id) =>
    set((s) => {
      const filtered = s.timeSignatureEvents.filter((e) => e.id !== id);
      if (filtered.length === 0) return s;
      const sorted = [...filtered].sort((a, b) => a.beat - b.beat);
      if (sorted[0]!.beat !== 0) return s;
      return { timeSignatureEvents: filtered };
    }),

  // Drum patterns
  setDrumPatterns: (drumPatterns) => set({ drumPatterns }),

  addDrumPattern: (pattern) =>
    set((s) => ({ drumPatterns: [...s.drumPatterns, pattern] })),

  updateDrumPattern: (id, changes) =>
    set((s) => ({
      drumPatterns: s.drumPatterns.map((p) => (p.id === id ? { ...p, ...changes } : p)),
    })),

  removeDrumPattern: (id) =>
    set((s) => ({ drumPatterns: s.drumPatterns.filter((p) => p.id !== id) })),

  reset: () => set(initialState),
}));
