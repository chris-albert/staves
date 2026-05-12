import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine, DEFAULT_SYNTH_PATCH } from '@staves/audio-engine';
import type { MidiPattern, MidiNote, Clip } from '@staves/storage';
import { useProjectStore } from '@/stores/projectStore';
import { useUiStore } from '@/stores/uiStore';
import { useTransportStore } from '@/stores/transportStore';

const ROW_HEIGHT = 18;
const KEYBOARD_WIDTH = 52;
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

/** Sidebar for the piano roll, rendered in the track list sidebar */
export function PianoRollSidebar({ clip, pattern }: PianoRollProps) {
  const setEditingMidiClipId = useUiStore((s) => s.setEditingMidiClipId);
  const updateClip = useProjectStore((s) => s.updateClip);
  const drawMode = useUiStore((s) => s.pianoRollDrawMode);
  const setDrawMode = useUiStore((s) => s.setPianoRollDrawMode);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(clip.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const commitName = useCallback(() => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== clip.name) {
      updateClip(clip.id, { name: trimmed });
    } else {
      setNameValue(clip.name);
    }
    setEditingName(false);
  }, [nameValue, clip.id, clip.name, updateClip]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="flex items-center gap-2 px-3 h-[26px] text-xs text-zinc-400 flex-shrink-0 border-b border-zinc-800/50">
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName();
              if (e.key === 'Escape') { setNameValue(clip.name); setEditingName(false); }
            }}
            className="text-[10px] font-semibold text-zinc-200 bg-zinc-800 rounded px-1 py-0 outline-none ring-1 ring-zinc-600 focus:ring-zinc-400 min-w-0 flex-1"
          />
        ) : (
          <span
            className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider truncate cursor-text hover:text-zinc-200 transition-colors"
            onClick={() => { setNameValue(clip.name); setEditingName(true); }}
            title="Click to rename"
          >
            {clip.name}
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setEditingMidiClipId(null)}
          className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors flex-shrink-0"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l6 6M8 2l-6 6" />
          </svg>
        </button>
      </div>
      <div className="flex-1 flex flex-col gap-3 px-3 py-3">
        <div className="flex rounded overflow-hidden border border-zinc-700/60">
          <button
            onClick={() => setDrawMode(true)}
            className={`flex-1 px-2 py-1 text-[10px] font-medium transition-colors ${
              drawMode ? 'bg-cyan-600/80 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Draw
          </button>
          <button
            onClick={() => setDrawMode(false)}
            className={`flex-1 px-2 py-1 text-[10px] font-medium transition-colors ${
              !drawMode ? 'bg-cyan-600/80 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Select
          </button>
        </div>
        <div className="text-[10px] text-zinc-500">Snap 1/16</div>
        <div className="text-[10px] text-zinc-600">Zoom: Ctrl+Scroll</div>
      </div>
    </div>
  );
}

export function PianoRoll({ clip, pattern }: PianoRollProps) {
  const updateMidiPattern = useProjectStore((s) => s.updateMidiPattern);
  const setEditingMidiClipId = useUiStore((s) => s.setEditingMidiClipId);
  const currentBeat = useTransportStore((s) => s.currentBeat);
  const isPlaying = useTransportStore((s) => s.isPlaying);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const keyboardRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const drawMode = useUiStore((s) => s.pianoRollDrawMode);
  const previewStopRef = useRef<(() => void) | null>(null);

  // Measure container width so we can fit the pattern to fill it
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Zoom: pixels per beat — default to fit the pattern within the container
  const [rollZoomOverride, setRollZoomOverride] = useState<number | null>(null);
  const autoZoom = containerWidth > 0 && pattern.durationBeats > 0
    ? containerWidth / pattern.durationBeats
    : 40;
  const rollZoom = rollZoomOverride ?? autoZoom;
  const gridWidth = pattern.durationBeats * rollZoom;

  // Snap to 1/16th note
  const snapDiv = 0.25;
  const snap = useCallback((beat: number) => Math.round(beat / snapDiv) * snapDiv, []);

  // Close on Escape, delete notes
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
      const scrollY = (MAX_PITCH - middlePitch) * ROW_HEIGHT - 180;
      scrollRef.current.scrollTop = scrollY;
    }
  }, []);

  // Sync keyboard + ruler scroll with grid scroll
  useEffect(() => {
    const grid = scrollRef.current;
    const kb = keyboardRef.current;
    const ruler = rulerRef.current;
    if (!grid) return;
    const sync = () => {
      if (kb) kb.scrollTop = grid.scrollTop;
      if (ruler) ruler.scrollLeft = grid.scrollLeft;
    };
    grid.addEventListener('scroll', sync);
    return () => grid.removeEventListener('scroll', sync);
  }, []);

  // Zoom with wheel — once the user zooms manually, override auto-fit
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setRollZoomOverride((prev) => {
        const current = prev ?? autoZoom;
        return Math.max(15, Math.min(200, current - e.deltaY * 0.1));
      });
    }
  }, [autoZoom]);

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

  // Convert pointer event to grid beat/pitch coordinates
  const pointerToGrid = useCallback((e: React.PointerEvent | PointerEvent) => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const beat = snap(x / rollZoom);
    const pitch = MAX_PITCH - Math.floor(y / ROW_HEIGHT);
    return { beat, pitch };
  }, [rollZoom, snap]);

  // Click on grid to draw a note (with drag to set duration)
  const handleGridPointerDown = useCallback((e: React.PointerEvent) => {
    if (!drawMode) {
      setSelectedNoteIds(new Set());
      return;
    }
    const pos = pointerToGrid(e);
    if (!pos) return;
    const { beat, pitch } = pos;

    if (pitch < MIN_PITCH || pitch > MAX_PITCH || beat < 0 || beat >= pattern.durationBeats) return;

    // Check if clicking an existing note
    const existingNote = pattern.notes.find(
      (n) => n.pitch === pitch && beat >= n.startBeat && beat < n.startBeat + n.durationBeats,
    );
    if (existingNote) {
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

    // Draw new note — drag to extend duration
    const startBeat = beat;
    const newNote: MidiNote = {
      id: crypto.randomUUID(),
      pitch,
      startBeat,
      durationBeats: snapDiv,
      velocity: 0.8,
    };
    updateMidiPattern(pattern.id, { notes: [...pattern.notes, newNote] });
    setSelectedNoteIds(new Set([newNote.id]));

    // Preview the note
    previewNote(pitch);

    const notesRef = { current: [...pattern.notes, newNote] };

    const handleMove = (me: PointerEvent) => {
      const grid = gridRef.current;
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const mx = me.clientX - rect.left;
      const endBeat = snap(mx / rollZoom);
      const dur = Math.max(snapDiv, endBeat - startBeat + snapDiv);
      const updated = notesRef.current.map((n) =>
        n.id === newNote.id ? { ...n, durationBeats: dur } : n,
      );
      notesRef.current = updated;
      updateMidiPattern(pattern.id, { notes: updated });
    };

    const handleUp = () => {
      stopPreview();
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
  }, [drawMode, rollZoom, snap, pointerToGrid, pattern.notes, pattern.id, pattern.durationBeats, updateMidiPattern, previewNote, stopPreview]);

  // Playhead position relative to clip
  const playheadBeat = currentBeat - clip.startBeat;
  const showPlayhead = isPlaying && playheadBeat >= 0 && playheadBeat <= pattern.durationBeats;

  return (
      <div className="flex flex-col bg-zinc-950" style={{ height: 340 }}>
        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Piano keyboard */}
          <div className="flex-shrink-0 flex flex-col border-r border-zinc-700" style={{ width: KEYBOARD_WIDTH }}>
            {/* Ruler spacer */}
            <div className="flex-shrink-0 h-6 border-b border-zinc-800/40 bg-zinc-900/40" />
            {/* Keys */}
            <div
              ref={keyboardRef}
              className="flex-1 overflow-hidden"
            >
              <div style={{ height: GRID_HEIGHT }}>
              {Array.from({ length: PITCH_RANGE }, (_, i) => {
                const pitch = MAX_PITCH - i;
                const isBlack = BLACK_KEYS.has(pitch % 12);
                const isC = pitch % 12 === 0;
                return (
                  <div
                    key={pitch}
                    className={`flex items-center justify-end pr-1.5 border-b select-none cursor-pointer ${
                      isBlack
                        ? 'bg-zinc-800 border-zinc-700/40 text-zinc-500'
                        : 'bg-zinc-900 border-zinc-800/40 text-zinc-400'
                    } ${isC ? 'font-medium text-zinc-300' : ''}`}
                    style={{ height: ROW_HEIGHT }}
                    onPointerDown={() => previewNote(pitch)}
                    onPointerUp={stopPreview}
                    onPointerLeave={stopPreview}
                  >
                    <span className="text-[9px]">
                      {pitchToName(pitch)}
                    </span>
                  </div>
                );
              })}
            </div>
            </div>
          </div>

          {/* Grid column */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Beat ruler */}
            <div ref={rulerRef} className="flex-shrink-0 h-6 border-b border-zinc-800/40 overflow-hidden">
              <div className="relative h-full" style={{ width: gridWidth }}>
                {Array.from({ length: Math.ceil(gridWidth / rollZoom) + 1 }, (_, i) => {
                  const globalBeat = clip.startBeat + i;
                  const bar = Math.floor(globalBeat / 4) + 1;
                  const beatInBar = Math.floor(globalBeat % 4) + 1;
                  const isBar = globalBeat % 4 === 0;
                  return (
                    <div
                      key={i}
                      className={`absolute top-0 h-full flex items-center justify-center text-[10px] ${
                        isBar ? 'text-zinc-400 font-medium' : 'text-zinc-600'
                      }`}
                      style={{ left: i * rollZoom, width: rollZoom }}
                    >
                      {isBar ? bar : `${bar}.${beatInBar}`}
                    </div>
                  );
                })}

                {/* Current beat indicator */}
                {showPlayhead && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-white/70 z-10 pointer-events-none"
                    style={{ left: playheadBeat * rollZoom }}
                  />
                )}
              </div>
            </div>

            {/* Scrollable grid */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-auto relative"
              onWheel={handleWheel}
            >
              <div
                ref={gridRef}
                className="relative"
                style={{ width: gridWidth, height: GRID_HEIGHT }}
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
                      isBlack ? 'bg-zinc-800/30 border-zinc-800/25' : 'border-zinc-800/15'
                    }`}
                    style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                  />
                );
              })}

              {/* Beat grid lines */}
              {Array.from({ length: Math.ceil(gridWidth / rollZoom / snapDiv) + 1 }, (_, i) => {
                const beat = i * snapDiv;
                const isBeat = beat % 1 === 0;
                const isBar = beat % 4 === 0;
                return (
                  <div
                    key={i}
                    className={`absolute top-0 bottom-0 ${
                      isBar
                        ? 'border-l border-zinc-500/40'
                        : isBeat
                          ? 'border-l border-zinc-600/40'
                          : 'border-l border-zinc-800/25'
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
                    className={`absolute rounded cursor-pointer transition-shadow ${
                      isNoteSelected ? 'ring-1 ring-white/60 z-10' : ''
                    }`}
                    style={{
                      left: x,
                      top: y + 1,
                      width: Math.max(w - 1, 3),
                      height: ROW_HEIGHT - 2,
                      backgroundColor: `hsl(187, 80%, ${40 + note.velocity * 20}%)`,
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: `hsl(187, 80%, ${50 + note.velocity * 15}%)`,
                      opacity: note.velocity * 0.5 + 0.5,
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
                  >
                    {/* Right-edge resize handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedNoteIds(new Set([note.id]));
                        const grid = gridRef.current;
                        if (!grid) return;

                        const handleMove = (me: PointerEvent) => {
                          const rect = grid.getBoundingClientRect();
                          const mx = me.clientX - rect.left;
                          const endBeat = snap(mx / rollZoom);
                          const dur = Math.max(snapDiv, endBeat - note.startBeat);
                          const updated = pattern.notes.map((n) =>
                            n.id === note.id ? { ...n, durationBeats: dur } : n,
                          );
                          updateMidiPattern(pattern.id, { notes: updated });
                        };

                        const handleUp = () => {
                          document.removeEventListener('pointermove', handleMove);
                          document.removeEventListener('pointerup', handleUp);
                        };
                        document.addEventListener('pointermove', handleMove);
                        document.addEventListener('pointerup', handleUp);
                      }}
                    />
                  </div>
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
      </div>
  );
}
