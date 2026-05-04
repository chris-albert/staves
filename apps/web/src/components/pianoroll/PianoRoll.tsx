import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine, DEFAULT_SYNTH_PATCH } from '@staves/audio-engine';
import type { MidiPattern, MidiNote, Clip } from '@staves/storage';
import { useProjectStore } from '@/stores/projectStore';
import { useUiStore } from '@/stores/uiStore';
import { useTransportStore } from '@/stores/transportStore';

const PANEL_HEIGHT = 400;
const ROW_HEIGHT = 16;
const KEYBOARD_WIDTH = 48;
const MIN_PITCH = 36; // C2
const MAX_PITCH = 96; // C7
const PITCH_RANGE = MAX_PITCH - MIN_PITCH;
const GRID_HEIGHT = PITCH_RANGE * ROW_HEIGHT;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);

function pitchToName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  const note = NOTE_NAMES[pitch % 12]!;
  return `${note}${octave}`;
}

interface PianoRollProps {
  clip: Clip;
  pattern: MidiPattern;
}

export function PianoRoll({ clip, pattern }: PianoRollProps) {
  const updateMidiPattern = useProjectStore((s) => s.updateMidiPattern);
  const setEditingMidiClipId = useUiStore((s) => s.setEditingMidiClipId);
  const currentBeat = useTransportStore((s) => s.currentBeat);
  const isPlaying = useTransportStore((s) => s.isPlaying);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [drawMode, setDrawMode] = useState(true);
  const previewStopRef = useRef<(() => void) | null>(null);

  // Zoom: pixels per beat in the piano roll
  const [rollZoom, setRollZoom] = useState(40);
  const gridWidth = pattern.durationBeats * rollZoom;

  // Snap to 1/16th note
  const snapDiv = 0.25;
  const snap = useCallback((beat: number) => Math.round(beat / snapDiv) * snapDiv, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setEditingMidiClipId(null);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNoteIds.size > 0) {
          const newNotes = pattern.notes.filter((n) => !selectedNoteIds.has(n.id));
          updateMidiPattern(pattern.id, { notes: newNotes });
          setSelectedNoteIds(new Set());
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setEditingMidiClipId, selectedNoteIds, pattern.notes, pattern.id, updateMidiPattern]);

  // Scroll to middle of pitch range on mount
  useEffect(() => {
    if (scrollRef.current) {
      const middlePitch = 60; // Middle C
      const scrollY = (MAX_PITCH - middlePitch) * ROW_HEIGHT - PANEL_HEIGHT / 2;
      scrollRef.current.scrollTop = scrollY;
    }
  }, []);

  // Zoom with wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setRollZoom((z) => Math.max(15, Math.min(120, z - e.deltaY * 0.1)));
    }
  }, []);

  // Preview note on keyboard click
  const previewNote = useCallback((pitch: number) => {
    try {
      const engine = AudioEngine.getInstance();
      const patch = pattern.synthPatch ?? DEFAULT_SYNTH_PATCH;
      const stop = engine.synth.previewNote(pitch, 0.8, patch, engine.masterBus.input);
      previewStopRef.current = stop;
    } catch {
      // engine not ready
    }
  }, [pattern.synthPatch]);

  const stopPreview = useCallback(() => {
    if (previewStopRef.current) {
      previewStopRef.current();
      previewStopRef.current = null;
    }
  }, []);

  // Click on grid to draw a note
  const handleGridPointerDown = useCallback((e: React.PointerEvent) => {
    if (!drawMode) {
      setSelectedNoteIds(new Set());
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0);

    const beat = snap(x / rollZoom);
    const pitch = MAX_PITCH - Math.floor(y / ROW_HEIGHT);

    if (pitch < MIN_PITCH || pitch > MAX_PITCH || beat < 0 || beat >= pattern.durationBeats) return;

    // Check if clicking an existing note
    const existingNote = pattern.notes.find(
      (n) => n.pitch === pitch && beat >= n.startBeat && beat < n.startBeat + n.durationBeats,
    );
    if (existingNote) {
      // Select it
      if (e.shiftKey) {
        setSelectedNoteIds((s) => {
          const next = new Set(s);
          if (next.has(existingNote.id)) next.delete(existingNote.id);
          else next.add(existingNote.id);
          return next;
        });
      } else {
        setSelectedNoteIds(new Set([existingNote.id]));
      }
      return;
    }

    // Draw new note
    const newNote: MidiNote = {
      id: crypto.randomUUID(),
      pitch,
      startBeat: beat,
      durationBeats: snapDiv,
      velocity: 0.8,
    };
    updateMidiPattern(pattern.id, { notes: [...pattern.notes, newNote] });
    setSelectedNoteIds(new Set([newNote.id]));

    // Preview the note
    previewNote(pitch);
    const handleUp = () => {
      stopPreview();
      document.removeEventListener('pointerup', handleUp);
    };
    document.addEventListener('pointerup', handleUp);
  }, [drawMode, rollZoom, snap, pattern.notes, pattern.id, pattern.durationBeats, updateMidiPattern, previewNote, stopPreview]);

  // Playhead position relative to clip
  const playheadBeat = currentBeat - clip.startBeat;
  const showPlayhead = isPlaying && playheadBeat >= 0 && playheadBeat <= pattern.durationBeats;

  return (
    <div className="flex flex-col bg-zinc-900 border-t border-zinc-700" style={{ height: PANEL_HEIGHT }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/80">
        <button
          onClick={() => setEditingMidiClipId(null)}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 1l8 8M9 1l-8 8" />
          </svg>
          Close
        </button>
        <div className="h-4 w-px bg-zinc-700" />
        <span className="text-xs text-zinc-500">{clip.name}</span>
        <div className="h-4 w-px bg-zinc-700" />
        <button
          onClick={() => setDrawMode(!drawMode)}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            drawMode ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Draw
        </button>
        <span className="text-[10px] text-zinc-600 ml-auto">
          {pattern.notes.length} notes | Zoom: Ctrl+Scroll
        </span>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Piano keyboard */}
        <div className="flex flex-col overflow-hidden" style={{ width: KEYBOARD_WIDTH }}>
          <div
            className="flex-1 overflow-hidden"
            style={{ height: PANEL_HEIGHT - 32 }}
          >
            <div
              className="relative"
              style={{ height: GRID_HEIGHT }}
              ref={(el) => {
                // Sync scroll with grid
                if (el && scrollRef.current) {
                  const sync = () => {
                    el.scrollTop = scrollRef.current!.scrollTop;
                  };
                  scrollRef.current.addEventListener('scroll', sync);
                }
              }}
            >
              {Array.from({ length: PITCH_RANGE }, (_, i) => {
                const pitch = MAX_PITCH - i;
                const isBlack = BLACK_KEYS.has(pitch % 12);
                const isC = pitch % 12 === 0;
                return (
                  <div
                    key={pitch}
                    className={`flex items-center justify-end pr-1 border-b select-none cursor-pointer ${
                      isBlack
                        ? 'bg-zinc-800 border-zinc-700/50 text-zinc-500'
                        : 'bg-zinc-850 border-zinc-800/50 text-zinc-400'
                    } ${isC ? 'font-medium' : ''}`}
                    style={{ height: ROW_HEIGHT }}
                    onPointerDown={() => previewNote(pitch)}
                    onPointerUp={stopPreview}
                    onPointerLeave={stopPreview}
                  >
                    <span className="text-[9px]">
                      {isC || pitch === MIN_PITCH ? pitchToName(pitch) : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto relative"
          onWheel={handleWheel}
        >
          <div
            ref={gridRef}
            className="relative"
            style={{ width: gridWidth, height: GRID_HEIGHT, minWidth: '100%' }}
            onPointerDown={handleGridPointerDown}
          >
            {/* Row backgrounds */}
            {Array.from({ length: PITCH_RANGE }, (_, i) => {
              const pitch = MAX_PITCH - i;
              const isBlack = BLACK_KEYS.has(pitch % 12);
              return (
                <div
                  key={pitch}
                  className={`absolute left-0 right-0 border-b ${
                    isBlack ? 'bg-zinc-800/40 border-zinc-800/30' : 'border-zinc-800/20'
                  }`}
                  style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                />
              );
            })}

            {/* Beat grid lines */}
            {Array.from({ length: Math.ceil(pattern.durationBeats / snapDiv) + 1 }, (_, i) => {
              const beat = i * snapDiv;
              const isBeat = beat % 1 === 0;
              return (
                <div
                  key={i}
                  className={`absolute top-0 bottom-0 ${
                    isBeat ? 'border-l border-zinc-700/60' : 'border-l border-zinc-800/30'
                  }`}
                  style={{ left: beat * rollZoom }}
                />
              );
            })}

            {/* Notes */}
            {pattern.notes.map((note) => {
              const x = note.startBeat * rollZoom;
              const y = (MAX_PITCH - note.pitch) * ROW_HEIGHT;
              const w = note.durationBeats * rollZoom;
              const isNoteSelected = selectedNoteIds.has(note.id);
              return (
                <div
                  key={note.id}
                  className={`absolute rounded-sm border cursor-pointer transition-shadow ${
                    isNoteSelected ? 'ring-1 ring-white/60 z-10' : ''
                  }`}
                  style={{
                    left: x,
                    top: y + 1,
                    width: Math.max(w - 1, 3),
                    height: ROW_HEIGHT - 2,
                    backgroundColor: `hsl(220, 70%, ${50 + note.velocity * 20}%)`,
                    borderColor: `hsl(220, 70%, ${60 + note.velocity * 15}%)`,
                    opacity: note.velocity * 0.6 + 0.4,
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (e.shiftKey) {
                      setSelectedNoteIds((s) => {
                        const next = new Set(s);
                        if (next.has(note.id)) next.delete(note.id);
                        else next.add(note.id);
                        return next;
                      });
                    } else {
                      setSelectedNoteIds(new Set([note.id]));
                    }
                  }}
                />
              );
            })}

            {/* Playhead */}
            {showPlayhead && (
              <div
                className="absolute top-0 bottom-0 w-px bg-white/70 z-20 pointer-events-none"
                style={{ left: playheadBeat * rollZoom }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
