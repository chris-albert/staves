import { useEffect, useRef } from 'react';
import { projectRepository } from '@staves/storage';
import { useProjectStore } from '@/stores/projectStore';

const DEBOUNCE_MS = 1000;

/**
 * Debounced auto-save: persists projectStore changes to IndexedDB.
 * Runs whenever project, tracks, clips, or tempo/timeSig events change.
 */
export function useAutoSave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = useProjectStore.subscribe((state, prev) => {
      if (!state.project) return;

      const projectChanged = state.project !== prev.project;
      const tracksChanged = state.tracks !== prev.tracks;
      const clipsChanged = state.clips !== prev.clips;
      const tempoChanged = state.tempoEvents !== prev.tempoEvents;
      const timeSigChanged = state.timeSignatureEvents !== prev.timeSignatureEvents;
      const drumPatternsChanged = state.drumPatterns !== prev.drumPatterns;
      const midiPatternsChanged = state.midiPatterns !== prev.midiPatterns;
      const markersChanged = state.markers !== prev.markers;

      if (!projectChanged && !tracksChanged && !clipsChanged && !tempoChanged && !timeSigChanged && !drumPatternsChanged && !midiPatternsChanged && !markersChanged) return;

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        const { project, tracks, clips, tempoEvents, timeSignatureEvents, drumPatterns, midiPatterns, markers } = useProjectStore.getState();
        if (!project) return;

        try {
          await projectRepository.updateProject(project.id, {
            name: project.name,
            bpm: project.bpm,
            timeSignatureNumerator: project.timeSignatureNumerator,
            timeSignatureDenominator: project.timeSignatureDenominator,
            tempoEvents,
            timeSignatureEvents,
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

          for (const pattern of drumPatterns) {
            await projectRepository.updateDrumPattern(pattern.id, {
              steps: pattern.steps,
              stepsPerBeat: pattern.stepsPerBeat,
              activeSteps: pattern.activeSteps,
              pads: pattern.pads,
            });
          }

          for (const pattern of midiPatterns) {
            await projectRepository.updateMidiPattern(pattern.id, {
              durationBeats: pattern.durationBeats,
              notes: pattern.notes,
              synthPatch: pattern.synthPatch,
            });
          }

          for (const marker of markers) {
            await projectRepository.updateMarker(marker.id, {
              beat: marker.beat,
              name: marker.name,
              color: marker.color,
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
