import { useEffect, useState, useCallback, useRef } from 'react';
import { AudioEngine, MidiInput } from '@staves/audio-engine';
import type { TrackNode } from '@staves/audio-engine';
import { useProjectStore } from '@/stores/projectStore';
import { useUiStore } from '@/stores/uiStore';

const STORAGE_KEY = 'staves:midiInputId';

/**
 * Manages a MIDI controller connection and routes incoming notes to the
 * focused synth track (piano roll open) or drum track (step sequencer open).
 */
export function useMidiInput(trackNodesRef: React.RefObject<Map<string, TrackNode>>) {
  const [midiSupported, setMidiSupported] = useState(false);
  const [midiInputs, setMidiInputs] = useState<{ id: string; name: string }[]>([]);
  const [selectedMidiInputId, setSelectedMidiInputId] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? '',
  );

  const midiRef = useRef<MidiInput | null>(null);
  const noteStopFns = useRef(new Map<number, () => void>());

  // Initialize Web MIDI
  useEffect(() => {
    const midi = new MidiInput();
    midiRef.current = midi;

    midi.init().then((supported) => {
      setMidiSupported(supported);
      if (supported) {
        setMidiInputs(midi.getInputs());

        // Restore persisted device
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const available = midi.getInputs();
          if (available.some((d) => d.id === saved)) {
            midi.selectInput(saved);
          }
        }
      }
    });

    return () => {
      // Release any held notes
      for (const stop of noteStopFns.current.values()) {
        stop();
      }
      noteStopFns.current.clear();
      midi.dispose();
      midiRef.current = null;
    };
  }, []);

  // Wire note-on / note-off callbacks — re-attach whenever dependencies change
  useEffect(() => {
    const midi = midiRef.current;
    if (!midi) return;

    midi.onNoteOn = (note: number, velocity: number) => {
      const editingMidiClipId = useUiStore.getState().editingMidiClipId;
      const editingDrumClipId = useUiStore.getState().editingDrumClipId;

      let engine: AudioEngine;
      try {
        engine = AudioEngine.getInstance();
      } catch {
        return;
      }

      if (editingMidiClipId) {
        // Route to synth
        const clips = useProjectStore.getState().clips;
        const midiPatterns = useProjectStore.getState().midiPatterns;
        const clip = clips.find((c) => c.id === editingMidiClipId);
        if (!clip?.midiPatternId) return;
        const pattern = midiPatterns.find((p) => p.id === clip.midiPatternId);
        if (!pattern) return;

        const trackNode = trackNodesRef.current?.get(clip.trackId);
        const destination = trackNode ? trackNode.input : engine.masterBus.input;
        const stopFn = engine.synth.previewNote(note, velocity, pattern.synthPatch, destination);
        noteStopFns.current.set(note, stopFn);
      } else if (editingDrumClipId) {
        // Route to drum sampler
        const clips = useProjectStore.getState().clips;
        const drumPatterns = useProjectStore.getState().drumPatterns;
        const clip = clips.find((c) => c.id === editingDrumClipId);
        if (!clip?.drumPatternId) return;
        const pattern = drumPatterns.find((p) => p.id === clip.drumPatternId);
        if (!pattern) return;

        // Find the pad whose midiNote matches
        // Pads don't store midiNote directly — we need to look up from the DrumKit sounds.
        // However the pad's sampleUrl is the key into the sampler. We match by checking
        // the DEFAULT_DRUM_KIT / ALL_DRUM_SOUNDS for a sound with the incoming MIDI note.
        const pad = findPadByMidiNote(pattern.pads, note);
        if (!pad?.sampleUrl) return;

        const trackNode = trackNodesRef.current?.get(clip.trackId);
        const destination = trackNode ? trackNode.input : engine.masterBus.input;
        engine.drumSampler.scheduleHit(pad.sampleUrl, destination, engine.context.currentTime, velocity);
      }
    };

    midi.onNoteOff = (note: number) => {
      const stopFn = noteStopFns.current.get(note);
      if (stopFn) {
        stopFn();
        noteStopFns.current.delete(note);
      }
    };

    return () => {
      if (midi) {
        midi.onNoteOn = null;
        midi.onNoteOff = null;
      }
    };
  }, [trackNodesRef]);

  // Refresh the input list periodically (handles hotplug)
  useEffect(() => {
    if (!midiSupported) return;
    const interval = setInterval(() => {
      const midi = midiRef.current;
      if (midi) setMidiInputs(midi.getInputs());
    }, 2000);
    return () => clearInterval(interval);
  }, [midiSupported]);

  const selectMidiInput = useCallback((id: string) => {
    setSelectedMidiInputId(id);
    localStorage.setItem(STORAGE_KEY, id);
    midiRef.current?.selectInput(id);
  }, []);

  return { midiSupported, midiInputs, selectedMidiInputId, selectMidiInput };
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Map from sample URL → MIDI note number, built from the drum kit constants. */
import { ALL_DRUM_SOUNDS } from '@staves/audio-engine';

const sampleUrlToMidiNote = new Map<string, number>();
for (const sound of ALL_DRUM_SOUNDS) {
  // Only set if not already mapped (first kit wins for shared URLs)
  if (!sampleUrlToMidiNote.has(sound.url)) {
    sampleUrlToMidiNote.set(sound.url, sound.midiNote);
  }
}

function findPadByMidiNote(
  pads: { index: number; name: string; sampleUrl: string }[],
  midiNote: number,
) {
  // First try to match via the known drum sound MIDI note mappings
  for (const pad of pads) {
    const padMidiNote = sampleUrlToMidiNote.get(pad.sampleUrl);
    if (padMidiNote === midiNote) return pad;
  }
  return undefined;
}
