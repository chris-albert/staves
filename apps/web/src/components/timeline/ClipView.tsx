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
    type: 'move' | 'trim-left' | 'trim-right' | 'fade-in' | 'fade-out';
    startX: number;
    startY: number;
    origStartBeat: number;
    origDurationBeats: number;
    origOffsetBeats: number;
    origTrackId: string;
    origFadeInBeats?: number;
    origFadeOutBeats?: number;
  } | null>(null);

  const left = clip.startBeat * zoom - scrollLeft;
  const width = clip.durationBeats * zoom;

  const snap = useCallback(
    (beat: number) => (snapEnabled ? snapToGrid(beat, snapDivision) : beat),
    [snapEnabled, snapDivision],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent, type: 'move' | 'trim-left' | 'trim-right' | 'fade-in' | 'fade-out' = 'move') => {
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
        origFadeInBeats: clip.fadeInBeats,
        origFadeOutBeats: clip.fadeOutBeats,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [clip.id, clip.startBeat, clip.durationBeats, clip.offsetBeats, clip.trackId, clip.fadeInBeats, clip.fadeOutBeats, selectClip, seek],
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
      } else if (d.type === 'fade-in') {
        const fadeDBeats = (e.clientX - d.startX) / zoom;
        const newFadeIn = Math.max(0, Math.min(clip.durationBeats * 0.5, (d.origFadeInBeats ?? 0) + fadeDBeats));
        updateClip(clip.id, { fadeInBeats: newFadeIn });
      } else if (d.type === 'fade-out') {
        const fadeDBeats = (d.startX - e.clientX) / zoom;
        const newFadeOut = Math.max(0, Math.min(clip.durationBeats * 0.5, (d.origFadeOutBeats ?? 0) + fadeDBeats));
        updateClip(clip.id, { fadeOutBeats: newFadeOut });
      }
    },
    [clip.id, clip.durationBeats, clip.sourceDurationBeats, zoom, snap, updateClip, tracks, laneHeight],
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

      {/* Fade-in region */}
      {clip.fadeInBeats > 0 && (
        <div
          className="absolute top-0 bottom-0 left-0 pointer-events-none"
          style={{ width: clip.fadeInBeats / clip.durationBeats * 100 + '%' }}
        >
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1 1">
            <polygon points="0,1 1,0 1,1" fill="black" opacity="0.3" />
          </svg>
        </div>
      )}

      {/* Fade-out region */}
      {clip.fadeOutBeats > 0 && (
        <div
          className="absolute top-0 bottom-0 right-0 pointer-events-none"
          style={{ width: clip.fadeOutBeats / clip.durationBeats * 100 + '%' }}
        >
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1 1">
            <polygon points="0,0 0,1 1,1" fill="black" opacity="0.3" />
          </svg>
        </div>
      )}

      {/* Fade-in handle */}
      <div
        className="absolute top-0 z-20 h-3 w-3 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ left: Math.max(0, (clip.fadeInBeats / clip.durationBeats) * width - 6) }}
        onPointerDown={(e) => {
          e.stopPropagation();
          dragRef.current = {
            type: 'fade-in',
            startX: e.clientX,
            startY: e.clientY,
            origStartBeat: clip.startBeat,
            origDurationBeats: clip.durationBeats,
            origOffsetBeats: clip.offsetBeats,
            origTrackId: clip.trackId,
            origFadeInBeats: clip.fadeInBeats,
          };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" className="text-white/60">
          <polygon points="0,12 12,0 12,12" fill="currentColor" />
        </svg>
      </div>

      {/* Fade-out handle */}
      <div
        className="absolute top-0 z-20 h-3 w-3 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ right: Math.max(0, (clip.fadeOutBeats / clip.durationBeats) * width - 6) }}
        onPointerDown={(e) => {
          e.stopPropagation();
          dragRef.current = {
            type: 'fade-out',
            startX: e.clientX,
            startY: e.clientY,
            origStartBeat: clip.startBeat,
            origDurationBeats: clip.durationBeats,
            origOffsetBeats: clip.offsetBeats,
            origTrackId: clip.trackId,
            origFadeOutBeats: clip.fadeOutBeats,
          };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" className="text-white/60">
          <polygon points="0,0 0,12 12,12" fill="currentColor" />
        </svg>
      </div>

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
