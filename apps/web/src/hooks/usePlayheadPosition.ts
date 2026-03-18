import { useEffect } from 'react';
import { AudioEngine } from '@staves/audio-engine';
import { useTransportStore } from '@/stores/transportStore';

/**
 * Syncs the transport store's currentBeat with the AudioEngine via rAF.
 * Only runs while playing.
 */
export function usePlayheadPosition() {
  const isPlaying = useTransportStore((s) => s.isPlaying);

  useEffect(() => {
    if (!isPlaying) return;

    let raf: number;
    const tick = () => {
      try {
        const engine = AudioEngine.getInstance();
        useTransportStore.getState().setCurrentBeat(engine.transport.currentBeat);
      } catch {
        // Engine not ready
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  return useTransportStore((s) => s.currentBeat);
}
