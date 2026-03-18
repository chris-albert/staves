import { useEffect, useRef } from 'react';
import { AudioEngine } from '@staves/audio-engine';

/** Initializes the AudioEngine singleton on mount and tears it down on unmount. */
export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    engineRef.current = AudioEngine.getInstance();

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  return engineRef;
}
