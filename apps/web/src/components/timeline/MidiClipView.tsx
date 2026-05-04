import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { Clip, MidiPattern } from '@staves/storage';
import { useUiStore } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';
import { useTransport } from '@/hooks/useTransport';
import { snapToGrid } from '@/lib/timeUtils';

interface MidiClipViewProps {
  clip: Clip;
  pattern: MidiPattern;
  color: string;
  zoom: number;
  scrollLeft: number;
  laneHeight: number;
}

export function MidiClipView({ clip, pattern, color, zoom, scrollLeft, laneHeight }: MidiClipViewProps) {
  const selectedClipIds = useUiStore((s) => s.selectedClipIds);
  const selectClip = useUiStore((s) => s.selectClip);
  const setEditingMidiClipId = useUiStore((s) => s.setEditingMidiClipId);
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const snapDivision = useUiStore((s) => s.snapDivision);
  const updateClip = useProjectStore((s) => s.updateClip);
  const tracks = useProjectStore((s) => s.tracks);
  const { seek } = useTransport();
  const isSelected = selectedClipIds.has(clip.id);

  const dragRef = useRef<{
    type: 'move' | 'trim-left' | 'trim-right';
    startX: number;
    startY: number;
    origStartBeat: number;
    origDurationBeats: number;
    origTrackId: string;
  } | null>(null);

  const left = clip.startBeat * zoom - scrollLeft;
  const width = clip.durationBeats * zoom;

  const snap = useCallback(
    (beat: number) => (snapEnabled ? snapToGrid(beat, snapDivision) : beat),
    [snapEnabled, snapDivision],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent, type: 'move' | 'trim-left' | 'trim-right' = 'move') => {
      e.stopPropagation();
      if (e.metaKey || e.ctrlKey) {
        seek(clip.startBeat);
        return;
      }
      selectClip(clip.id, e.shiftKey);
      dragRef.current = {
        type,
        startX: e.clientX,
        startY: e.clientY,
        origStartBeat: clip.startBeat,
        origDurationBeats: clip.durationBeats,
        origTrackId: clip.trackId,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [clip.id, clip.startBeat, clip.durationBeats, clip.trackId, selectClip, seek],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const d = dragRef.current;
      if (!d) return;

      const dx = e.clientX - d.startX;
      const dBeats = dx / zoom;

      if (d.type === 'move') {
        const newStart = snap(Math.max(0, d.origStartBeat + dBeats));
        const dy = e.clientY - d.startY;
        const trackHeight = laneHeight;
        const trackOffset = Math.round(dy / trackHeight);
        const currentTrackIdx = tracks.findIndex((t) => t.id === d.origTrackId);
        const newTrackIdx = Math.max(0, Math.min(tracks.length - 1, currentTrackIdx + trackOffset));
        const newTrackId = tracks[newTrackIdx]?.id ?? d.origTrackId;
        updateClip(clip.id, { startBeat: newStart, trackId: newTrackId });
      } else if (d.type === 'trim-left') {
        const newStart = snap(Math.max(0, Math.min(d.origStartBeat + d.origDurationBeats - 0.25, d.origStartBeat + dBeats)));
        const newDuration = d.origDurationBeats - (newStart - d.origStartBeat);
        updateClip(clip.id, { startBeat: newStart, durationBeats: newDuration, sourceDurationBeats: newDuration });
      } else if (d.type === 'trim-right') {
        const newDuration = snap(Math.max(0.25, d.origDurationBeats + dBeats));
        updateClip(clip.id, { durationBeats: newDuration, sourceDurationBeats: newDuration });
      }
    },
    [clip.id, zoom, snap, updateClip, tracks, laneHeight],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingMidiClipId(clip.id);
    },
    [clip.id, setEditingMidiClipId],
  );

  // Build mini piano-roll preview
  const gridHeight = laneHeight - 24;
  const notes = pattern.notes;

  // Compute pitch range
  let minPitch = 127;
  let maxPitch = 0;
  for (const n of notes) {
    if (n.pitch < minPitch) minPitch = n.pitch;
    if (n.pitch > maxPitch) maxPitch = n.pitch;
  }
  if (notes.length === 0) {
    minPitch = 60;
    maxPitch = 72;
  }
  const pitchRange = Math.max(maxPitch - minPitch + 1, 12);

  return (
    <div
      data-clip
      className={`group absolute top-1 rounded border transition-shadow cursor-grab active:cursor-grabbing ${
        isSelected ? 'ring-2 ring-white/50' : ''
      }`}
      style={{
        left,
        width: Math.max(width, 4),
        height: laneHeight - 8,
        backgroundColor: color + '33',
        borderColor: color + '88',
      }}
      onPointerDown={(e) => onPointerDown(e, 'move')}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        selectClip(clip.id, false);
        useUiStore.getState().setContextMenu({ x: e.clientX, y: e.clientY, clipId: clip.id });
      }}
    >
      {/* Left trim handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-opacity z-10"
        onPointerDown={(e) => onPointerDown(e, 'trim-left')}
      />

      {/* Right trim handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-opacity z-10"
        onPointerDown={(e) => onPointerDown(e, 'trim-right')}
      />

      <div className="truncate px-2 text-[10px] text-zinc-300">{clip.name}</div>
      <svg
        width={Math.max(width - 4, 0)}
        height={gridHeight}
        className="ml-0.5"
        viewBox={`0 0 ${Math.max(width - 4, 1)} ${gridHeight}`}
        preserveAspectRatio="none"
      >
        {notes.map((note) => {
          const x = (note.startBeat / pattern.durationBeats) * Math.max(width - 4, 1);
          const w = (note.durationBeats / pattern.durationBeats) * Math.max(width - 4, 1);
          const y = ((maxPitch - note.pitch) / pitchRange) * gridHeight;
          const h = Math.max(1.5, gridHeight / pitchRange - 0.5);
          return (
            <rect
              key={note.id}
              x={x}
              y={y}
              width={Math.max(w, 1)}
              height={h}
              fill={color}
              opacity={note.velocity * 0.7 + 0.3}
              rx={0.5}
            />
          );
        })}
      </svg>
    </div>
  );
}
