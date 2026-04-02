import { useMemo } from 'react';
import { TempoMap } from '@staves/audio-engine';
import { useProjectStore } from '@/stores/projectStore';

/**
 * Derives a TempoMap instance from the project store's tempo
 * and time-signature events.  Memoised so the same object is
 * returned until the events actually change.
 */
export function useTempoMap(): TempoMap {
  const tempoEvents = useProjectStore((s) => s.tempoEvents);
  const timeSigEvents = useProjectStore((s) => s.timeSignatureEvents);

  return useMemo(
    () => new TempoMap(tempoEvents, timeSigEvents),
    [tempoEvents, timeSigEvents],
  );
}
