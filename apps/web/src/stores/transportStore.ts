import { create } from 'zustand';

interface TransportState {
  isPlaying: boolean;
  isRecording: boolean;
  recordingStartBeat: number;
  recordingTrackId: string | null;
  playOrigin: number;
  currentBeat: number;
  bpm: number;
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;
  metronomeEnabled: boolean;
}

interface TransportActions {
  setPlaying: (playing: boolean) => void;
  setRecording: (recording: boolean) => void;
  setRecordingInfo: (startBeat: number, trackId: string) => void;
  setPlayOrigin: (beat: number) => void;
  setCurrentBeat: (beat: number) => void;
  setBpm: (bpm: number) => void;
  setLoopEnabled: (enabled: boolean) => void;
  setLoopRegion: (start: number, end: number) => void;
  setMetronomeEnabled: (enabled: boolean) => void;
  reset: () => void;
}

const initialState: TransportState = {
  isPlaying: false,
  isRecording: false,
  recordingStartBeat: 0,
  recordingTrackId: null,
  playOrigin: 0,
  currentBeat: 0,
  bpm: 120,
  loopEnabled: false,
  loopStart: 0,
  loopEnd: 16,
  metronomeEnabled: false,
};

export const useTransportStore = create<TransportState & TransportActions>()((set) => ({
  ...initialState,

  setPlaying: (isPlaying) => set({ isPlaying }),
  setRecording: (isRecording) => set(isRecording ? { isRecording } : { isRecording, recordingStartBeat: 0, recordingTrackId: null }),
  setRecordingInfo: (recordingStartBeat, recordingTrackId) => set({ recordingStartBeat, recordingTrackId }),
  setPlayOrigin: (playOrigin) => set({ playOrigin }),
  setCurrentBeat: (currentBeat) => set({ currentBeat }),
  setBpm: (bpm) => set({ bpm }),
  setLoopEnabled: (loopEnabled) => set({ loopEnabled }),
  setLoopRegion: (start, end) => set({ loopStart: start, loopEnd: end }),
  setMetronomeEnabled: (metronomeEnabled) => set({ metronomeEnabled }),
  reset: () => set(initialState),
}));
