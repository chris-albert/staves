import { useCallback } from 'react';
import { AudioEngine, TempoMap } from '@staves/audio-engine';
import { useTransportStore } from '@/stores/transportStore';
import { useProjectStore } from '@/stores/projectStore';

/** Provides transport controls that sync the Zustand store with the AudioEngine. */
export function useTransport() {
  const { isPlaying, isRecording, bpm, loopEnabled, metronomeEnabled } = useTransportStore();

  const play = useCallback(() => {
    const engine = AudioEngine.getInstance();
    engine.init().then(() => {
      engine.transport.play();
      useTransportStore.getState().setPlaying(true);
    });
  }, []);

  const stop = useCallback(() => {
    const engine = AudioEngine.getInstance();
    engine.transport.stop();
    useTransportStore.getState().setPlaying(false);
    useTransportStore.getState().setRecording(false);
  }, []);

  const seek = useCallback((beat: number) => {
    const engine = AudioEngine.getInstance();
    engine.transport.seek(beat);
    useTransportStore.getState().setCurrentBeat(beat);
    useTransportStore.getState().setPlayOrigin(beat);
  }, []);

  const setBpm = useCallback((newBpm: number) => {
    // Update the beat-0 tempo event (convenience for setting project tempo)
    const store = useProjectStore.getState();
    const events = [...store.tempoEvents];
    const sorted = events.sort((a, b) => a.beat - b.beat);
    const first = sorted[0];
    if (first && first.beat === 0) {
      store.updateTempoEvent(first.id, { bpm: newBpm });
    }
    // Also update project-level bpm for backward compat
    store.updateProject({ bpm: newBpm });
    // Update display
    useTransportStore.getState().setBpm(newBpm);
    // Rebuild engine tempo map
    const engine = AudioEngine.getInstance();
    const updated = useProjectStore.getState();
    engine.setTempoMap(new TempoMap(updated.tempoEvents, updated.timeSignatureEvents));
  }, []);

  const toggleLoop = useCallback(() => {
    const engine = AudioEngine.getInstance();
    const next = !engine.transport.loopEnabled;
    engine.transport.loopEnabled = next;
    useTransportStore.getState().setLoopEnabled(next);
  }, []);

  const toggleMetronome = useCallback(() => {
    const engine = AudioEngine.getInstance();
    const next = !engine.metronome.enabled;
    engine.metronome.enabled = next;
    useTransportStore.getState().setMetronomeEnabled(next);
  }, []);

  return { isPlaying, isRecording, bpm, loopEnabled, metronomeEnabled, play, stop, seek, setBpm, toggleLoop, toggleMetronome };
}
