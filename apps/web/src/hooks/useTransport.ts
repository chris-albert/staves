import { useCallback } from 'react';
import { AudioEngine } from '@staves/audio-engine';
import { useTransportStore } from '@/stores/transportStore';

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
  }, []);

  const setBpm = useCallback((newBpm: number) => {
    const engine = AudioEngine.getInstance();
    engine.clock.bpm = newBpm;
    useTransportStore.getState().setBpm(newBpm);
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
