import { useEffect, useRef } from 'react';
import { projectRepository } from '@staves/storage';
import { useProjectStore } from '@/stores/projectStore';

const DEBOUNCE_MS = 1000;

/**
 * Debounced auto-save: persists projectStore changes to IndexedDB.
 * Runs whenever project, tracks, or clips change.
 */
export function useAutoSave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = useProjectStore.subscribe((state, prev) => {
      if (!state.project) return;

      const projectChanged = state.project !== prev.project;
      const tracksChanged = state.tracks !== prev.tracks;
      const clipsChanged = state.clips !== prev.clips;

      if (!projectChanged && !tracksChanged && !clipsChanged) return;

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        const { project, tracks, clips } = useProjectStore.getState();
        if (!project) return;

        try {
          await projectRepository.updateProject(project.id, {
            name: project.name,
            bpm: project.bpm,
            timeSignatureNumerator: project.timeSignatureNumerator,
            timeSignatureDenominator: project.timeSignatureDenominator,
          });

          for (const track of tracks) {
            await projectRepository.updateTrack(track.id, {
              name: track.name,
              order: track.order,
              volume: track.volume,
              pan: track.pan,
              isMuted: track.isMuted,
              isSolo: track.isSolo,
              isArmed: track.isArmed,
              color: track.color,
            });
          }

          for (const clip of clips) {
            await projectRepository.updateClip(clip.id, {
              trackId: clip.trackId,
              startBeat: clip.startBeat,
              durationBeats: clip.durationBeats,
              offsetBeats: clip.offsetBeats,
              gainDb: clip.gainDb,
              name: clip.name,
            });
          }
        } catch (e) {
          console.error('Auto-save failed:', e);
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
