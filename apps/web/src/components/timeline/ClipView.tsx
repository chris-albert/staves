import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { Clip } from '@staves/storage';
import { useUiStore } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';
import { useTransport } from '@/hooks/useTransport';
import { snapToGrid } from '@/lib/timeUtils';
import { WaveformCanvas } from '../waveform/WaveformCanvas';

interface ClipViewProps {
  clip: Clip;
  color: string;
  zoom: number;
  scrollLeft: number;
  laneHeight: number;
}

export function ClipView({ clip, color, zoom, scrollLeft, laneHeight }: ClipViewProps) {
  const selectedClipIds = useUiStore((s) => s.selectedClipIds);
  const selectClip = useUiStore((s) => s.selectClip);
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
    origOffsetBeats: number;
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
      // Cmd/Ctrl+click: seek playhead to clip start
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
        origOffsetBeats: clip.offsetBeats,
        origTrackId: clip.trackId,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [clip.id, clip.startBeat, clip.durationBeats, clip.offsetBeats, clip.trackId, selectClip, seek],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const d = dragRef.current;
      if (!d) return;

      const dx = e.clientX - d.startX;
      const dBeats = dx / zoom;

      if (d.type === 'move') {
        const newStart = snap(Math.max(0, d.origStartBeat + dBeats));

        // Check for vertical track change
        const dy = e.clientY - d.startY;
        const trackHeight = laneHeight;
        const trackOffset = Math.round(dy / trackHeight);
        const currentTrackIdx = tracks.findIndex((t) => t.id === d.origTrackId);
        const newTrackIdx = Math.max(0, Math.min(tracks.length - 1, currentTrackIdx + trackOffset));
        const newTrackId = tracks[newTrackIdx]?.id ?? d.origTrackId;

        updateClip(clip.id, { startBeat: newStart, trackId: newTrackId });
      } else if (d.type === 'trim-left') {
        const rawStart = snap(Math.max(0, d.origStartBeat + dBeats));
        const delta = rawStart - d.origStartBeat;
        // Clamp: offset can't go below 0
        const clampedDelta = Math.max(-d.origOffsetBeats, delta);
        const newOffset = d.origOffsetBeats + clampedDelta;
        const newDuration = Math.max(0.25, d.origDurationBeats - clampedDelta);
        const newStart = d.origStartBeat + clampedDelta;
        updateClip(clip.id, {
          startBeat: newStart,
          durationBeats: newDuration,
          offsetBeats: newOffset,
        });
      } else if (d.type === 'trim-right') {
        // Clamp duration so offset + duration doesn't exceed source length
        const maxDuration = clip.sourceDurationBeats - d.origOffsetBeats;
        const newDuration = snap(Math.min(maxDuration, Math.max(0.25, d.origDurationBeats + dBeats)));
        updateClip(clip.id, { durationBeats: newDuration });
      }
    },
    [clip.id, clip.sourceDurationBeats, zoom, snap, updateClip, tracks, laneHeight],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

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
      <WaveformCanvas
        audioBlobId={clip.audioBlobId}
        width={width}
        height={laneHeight - 24}
        offsetRatio={clip.sourceDurationBeats > 0 ? clip.offsetBeats / clip.sourceDurationBeats : 0}
        visibleRatio={clip.sourceDurationBeats > 0 ? clip.durationBeats / clip.sourceDurationBeats : 1}
      />
    </div>
  );
}
