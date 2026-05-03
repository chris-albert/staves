import { create } from 'zustand';

interface PeerCursor {
  clientId: number;
  name: string;
  color: string;
  beat: number | null;
}

interface UiState {
  zoom: number; // pixels per beat
  scrollLeft: number; // in pixels
  scrollTop: number;
  selectedClipIds: Set<string>;
  selectedTrackId: string | null;
  dragState: null | {
    type: 'move' | 'trim-left' | 'trim-right';
    clipId: string;
    startX: number;
    startBeat: number;
  };
  peerCursors: PeerCursor[];
  snapEnabled: boolean;
  snapDivision: number; // beats (e.g. 1 = snap to beat, 0.25 = snap to 16th)
  editingDrumClipId: string | null;
}

interface UiActions {
  setZoom: (zoom: number) => void;
  setScrollLeft: (px: number) => void;
  setScrollTop: (px: number) => void;
  selectClip: (id: string, additive?: boolean) => void;
  deselectAll: () => void;
  setSelectedTrackId: (id: string | null) => void;
  setDragState: (state: UiState['dragState']) => void;
  setPeerCursors: (cursors: PeerCursor[]) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setSnapDivision: (division: number) => void;
  setEditingDrumClipId: (id: string | null) => void;
}

export const useUiStore = create<UiState & UiActions>()((set) => ({
  zoom: 50,
  scrollLeft: 0,
  scrollTop: 0,
  selectedClipIds: new Set<string>(),
  selectedTrackId: null,
  dragState: null,
  peerCursors: [],
  snapEnabled: true,
  snapDivision: 1,
  editingDrumClipId: null,

  setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(200, zoom)) }),
  setScrollLeft: (scrollLeft) => set({ scrollLeft: Math.max(0, scrollLeft) }),
  setScrollTop: (scrollTop) => set({ scrollTop: Math.max(0, scrollTop) }),

  selectClip: (id, additive = false) =>
    set((s) => {
      const next = additive ? new Set(s.selectedClipIds) : new Set<string>();
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedClipIds: next };
    }),

  deselectAll: () => set({ selectedClipIds: new Set() }),
  setSelectedTrackId: (selectedTrackId) => set({ selectedTrackId }),
  setDragState: (dragState) => set({ dragState }),
  setPeerCursors: (peerCursors) => set({ peerCursors }),
  setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
  setSnapDivision: (snapDivision) => set({ snapDivision }),
  setEditingDrumClipId: (editingDrumClipId) => set({ editingDrumClipId }),
}));
