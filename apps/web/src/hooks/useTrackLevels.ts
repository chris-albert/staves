import { useEffect, useRef, useState } from 'react';
import type { TrackNode } from '@staves/audio-engine';

export type StereoLevel = [number, number];

/**
 * Polls stereo RMS levels for all track nodes at ~60fps.
 * Returns a map of trackId → [leftLevel, rightLevel].
 */
export function useTrackLevels(trackNodeMap: React.RefObject<Map<string, TrackNode> | null>) {
  const [levels, setLevels] = useState<Map<string, StereoLevel>>(new Map());
  const rafRef = useRef(0);

  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      const map = trackNodeMap.current;
      if (map && map.size > 0) {
        const next = new Map<string, StereoLevel>();
        for (const [id, node] of map) {
          next.set(id, node.getStereoLevel());
        }
        setLevels(next);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [trackNodeMap]);

  return levels;
}
