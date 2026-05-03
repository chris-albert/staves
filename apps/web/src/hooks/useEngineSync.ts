import { useEffect, useRef } from 'react';
import { AudioEngine, TrackNode, TempoMap } from '@staves/audio-engine';
import type { ScheduledClip, ScheduledDrumClip, ScheduledDrumHit } from '@staves/audio-engine';
import { audioBlobStore } from '@staves/storage';
import { useProjectStore } from '@/stores/projectStore';
import type { Clip, DrumPattern } from '@staves/storage';

/**
 * Wires the project store to the AudioEngine:
 * - Creates/removes TrackNodes for each track
 * - Decodes audio blobs and builds ScheduledClips for the transport
 * - Builds ScheduledDrumClips from drum patterns
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
    engine.transport.setClipScheduler(({ clips, drumClips, fromBeat, toBeat, beatToContextTime }) => {
      // Schedule audio clips
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

      // Schedule drum hits
      for (const dc of drumClips) {
        const clipEndBeat = dc.startBeat + dc.durationBeats;
        if (dc.startBeat >= toBeat || clipEndBeat <= fromBeat) continue;

        for (const hit of dc.hits) {
          if (hit.beat >= fromBeat && hit.beat < toBeat) {
            const hitKey = `drum:${dc.clipId}:${hit.beat}:${hit.sampleKey}`;
            if (scheduledInSession.has(hitKey)) continue;
            scheduledInSession.add(hitKey);

            const trackNode = trackNodes.get(dc.trackId);
            const destination = trackNode ? trackNode.input : engine.masterBus.input;
            engine.drumSampler.scheduleHit(
              hit.sampleKey,
              destination,
              beatToContextTime(hit.beat),
              hit.velocity,
            );
          }
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
      const { tracks, clips, drumPatterns, tempoEvents, timeSignatureEvents } = state;

      // Sync TempoMap to engine when tempo/timeSig events change
      if (tempoEvents !== prevState.tempoEvents || timeSignatureEvents !== prevState.timeSignatureEvents) {
        engine.setTempoMap(new TempoMap(tempoEvents, timeSignatureEvents));
      }

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

      // Rebuild scheduled clips when clips or drum patterns change
      if (clips !== prevState.clips || drumPatterns !== prevState.drumPatterns) {
        rebuildClips(clips, drumPatterns);
      }
    });

    // Initial clip build
    const { clips: initialClips, drumPatterns: initialPatterns } = useProjectStore.getState();
    if (initialClips.length > 0 || initialPatterns.length > 0) {
      rebuildClips(initialClips, initialPatterns);
    }

    // Preload drum samples from initial patterns
    preloadDrumSamples(initialPatterns);

    async function preloadDrumSamples(patterns: DrumPattern[]) {
      for (const pattern of patterns) {
        for (const pad of pattern.pads) {
          if (pad.sampleUrl && !engine.drumSampler.getBuffer(pad.sampleUrl)) {
            engine.drumSampler.loadSample(pad.sampleUrl);
          }
        }
      }
    }

    async function rebuildClips(clips: Clip[], drumPatterns: DrumPattern[]) {
      // Decode any new audio blobs (only for audio clips)
      const decodePromises: Promise<void>[] = [];
      for (const clip of clips) {
        if (clip.drumPatternId) continue; // skip drum clips
        if (!clip.audioBlobId) continue;
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

      // Build ScheduledClip array (audio clips only)
      const scheduled: ScheduledClip[] = [];
      for (const clip of clips) {
        if (clip.drumPatternId) continue;
        if (!clip.audioBlobId) continue;
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

      // Build ScheduledDrumClip array
      const patternMap = new Map(drumPatterns.map((p) => [p.id, p]));
      const scheduledDrum: ScheduledDrumClip[] = [];

      // Preload any new samples
      preloadDrumSamples(drumPatterns);

      for (const clip of clips) {
        if (!clip.drumPatternId) continue;
        const pattern = patternMap.get(clip.drumPatternId);
        if (!pattern) continue;

        const hits: ScheduledDrumHit[] = [];
        const beatPerStep = 1 / pattern.stepsPerBeat;
        for (const step of pattern.activeSteps) {
          const pad = pattern.pads[step.padIndex];
          if (!pad) continue;
          hits.push({
            beat: clip.startBeat + step.step * beatPerStep,
            sampleKey: pad.sampleUrl,
            velocity: step.velocity,
          });
        }

        scheduledDrum.push({
          clipId: clip.id,
          trackId: clip.trackId,
          startBeat: clip.startBeat,
          durationBeats: clip.durationBeats,
          hits,
        });
      }
      engine.transport.setDrumClips(scheduledDrum);
    }

    return () => {
      unsub();
      engine.transport.play = originalPlay;
      engine.transport.record = originalRecord;
      engine.transport.stop = originalStop;
      engine.transport.setClipScheduler(() => {});
      engine.transport.setClips([]);
      engine.transport.setDrumClips([]);
      for (const [, node] of trackNodes) {
        node.disconnect();
      }
      trackNodes.clear();
    };
  }, []);

  return { trackNodesRef };
}
