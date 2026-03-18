import { useEffect, useRef } from 'react';
import { AudioEngine, TrackNode } from '@staves/audio-engine';
import type { ScheduledClip } from '@staves/audio-engine';
import { audioBlobStore } from '@staves/storage';
import { useProjectStore } from '@/stores/projectStore';
import type { Clip } from '@staves/storage';

/**
 * Wires the project store to the AudioEngine:
 * - Creates/removes TrackNodes for each track
 * - Decodes audio blobs and builds ScheduledClips for the transport
 * - Sets up the clip scheduler that plays clips at the right time
 */
export function useEngineSync() {
  const trackNodesRef = useRef(new Map<string, TrackNode>());
  const decodingRef = useRef(new Set<string>());

  useEffect(() => {
    const trackNodes = trackNodesRef.current;
    let engine: AudioEngine;
    try {
      engine = AudioEngine.getInstance();
    } catch {
      return;
    }

    // Track which clips have been scheduled in the current play session.
    // Cleared each time transport starts/stops.
    const scheduledInSession = new Set<string>();

    // --- Clip scheduler: called by transport's look-ahead loop ---
    engine.transport.setClipScheduler(({ clips, fromBeat, toBeat, beatToContextTime }) => {
      for (const clip of clips) {
        if (scheduledInSession.has(clip.clipId)) continue;

        const clipEndBeat = clip.startBeat + clip.durationBeats;

        // Clip overlaps the current window or has already started
        if (clip.startBeat < toBeat && clipEndBeat > fromBeat) {
          const trackNode = trackNodes.get(clip.trackId);
          const destination = trackNode ? trackNode.input : engine.masterBus.input;

          if (clip.startBeat >= fromBeat) {
            // Clip starts in the future — schedule at its start beat
            engine.clipPlayer.scheduleClip(clip, destination, beatToContextTime(clip.startBeat));
          } else {
            // Clip already started — play from partway through
            const skippedBeats = fromBeat - clip.startBeat;
            engine.clipPlayer.scheduleClip(
              {
                ...clip,
                offsetBeats: clip.offsetBeats + skippedBeats,
                durationBeats: clip.durationBeats - skippedBeats,
              },
              destination,
              beatToContextTime(fromBeat),
            );
          }
          scheduledInSession.add(clip.clipId);
        }
      }
    });

    // Wrap play/record/stop to clear the scheduled set and stop active sources
    const originalPlay = engine.transport.play.bind(engine.transport);
    const originalRecord = engine.transport.record.bind(engine.transport);
    const originalStop = engine.transport.stop.bind(engine.transport);

    engine.transport.play = () => {
      scheduledInSession.clear();
      engine.clipPlayer.stopAll();
      originalPlay();
    };
    engine.transport.record = () => {
      scheduledInSession.clear();
      engine.clipPlayer.stopAll();
      originalRecord();
    };
    engine.transport.stop = () => {
      scheduledInSession.clear();
      engine.clipPlayer.stopAll();
      originalStop();
    };

    // --- Subscribe to store changes ---
    const unsub = useProjectStore.subscribe((state, prevState) => {
      const { tracks, clips } = state;

      // Determine if any track is soloed
      const anySoloed = tracks.some((t) => t.isSolo);

      // Remove nodes for deleted tracks
      for (const [id, node] of trackNodes) {
        if (!tracks.find((t) => t.id === id)) {
          node.disconnect();
          trackNodes.delete(id);
        }
      }

      // Create/update track nodes
      for (const track of tracks) {
        let node = trackNodes.get(track.id);
        if (!node) {
          node = new TrackNode(engine.context, engine.masterBus.input);
          trackNodes.set(track.id, node);
        }
        node.volume = track.volume;
        node.pan = track.pan;
        node.muted = anySoloed ? !track.isSolo : track.isMuted;
      }

      // Rebuild scheduled clips when clips change
      if (clips !== prevState.clips) {
        rebuildClips(clips);
      }
    });

    // Initial clip build
    const { clips: initialClips } = useProjectStore.getState();
    if (initialClips.length > 0) {
      rebuildClips(initialClips);
    }

    async function rebuildClips(clips: Clip[]) {
      // Decode any new audio blobs
      const decodePromises: Promise<void>[] = [];
      for (const clip of clips) {
        if (!engine.clipPlayer.getBuffer(clip.audioBlobId) && !decodingRef.current.has(clip.audioBlobId)) {
          decodingRef.current.add(clip.audioBlobId);
          decodePromises.push(
            audioBlobStore.get(clip.audioBlobId).then(async (blob) => {
              if (blob) {
                await engine.clipPlayer.decodeBlob(clip.audioBlobId, blob.data);
              }
            }),
          );
        }
      }
      if (decodePromises.length > 0) {
        await Promise.all(decodePromises);
      }

      // Build ScheduledClip array
      const scheduled: ScheduledClip[] = [];
      for (const clip of clips) {
        const buffer = engine.clipPlayer.getBuffer(clip.audioBlobId);
        if (!buffer) continue;
        scheduled.push({
          clipId: clip.id,
          trackId: clip.trackId,
          buffer,
          startBeat: clip.startBeat,
          durationBeats: clip.durationBeats,
          offsetBeats: clip.offsetBeats,
          gainDb: clip.gainDb,
        });
      }
      engine.transport.setClips(scheduled);
    }

    return () => {
      unsub();
      engine.transport.play = originalPlay;
      engine.transport.record = originalRecord;
      engine.transport.stop = originalStop;
      engine.transport.setClipScheduler(() => {});
      engine.transport.setClips([]);
      for (const [, node] of trackNodes) {
        node.disconnect();
      }
      trackNodes.clear();
    };
  }, []);
}
