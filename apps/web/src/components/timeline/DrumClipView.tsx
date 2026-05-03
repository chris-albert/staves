import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { Clip, DrumPattern } from '@staves/storage';
import { useUiStore } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';
import { useTransport } from '@/hooks/useTransport';
import { snapToGrid } from '@/lib/timeUtils';

interface DrumClipViewProps {
  clip: Clip;
  pattern: DrumPattern;
  color: string;
  zoom: number;
  scrollLeft: number;
  laneHeight: number;
}

export function DrumClipView({ clip, pattern, color, zoom, scrollLeft, laneHeight }: DrumClipViewProps) {
  const selectedClipIds = useUiStore((s) => s.selectedClipIds);
  const selectClip = useUiStore((s) => s.selectClip);
  const setEditingDrumClipId = useUiStore((s) => s.setEditingDrumClipId);
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const snapDivision = useUiStore((s) => s.snapDivision);
  const updateClip = useProjectStore((s) => s.updateClip);
  const updateDrumPattern = useProjectStore((s) => s.updateDrumPattern);
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
    origSteps: number;
    origActiveSteps: DrumPattern['activeSteps'];
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
        origSteps: pattern.steps,
        origActiveSteps: pattern.activeSteps,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [clip.id, clip.startBeat, clip.durationBeats, clip.trackId, pattern.steps, pattern.activeSteps, selectClip, seek],
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
        // Convert drag delta to whole steps
        const beatPerStep = 1 / pattern.stepsPerBeat;
        const stepDelta = Math.round(dBeats / beatPerStep);
        // Clamp: can't remove more steps than exist minus 1, can't go before beat 0
        const maxRemove = d.origSteps - 1;
        const maxAddByPosition = Math.floor(d.origStartBeat / beatPerStep);
        const clampedDelta = Math.max(-maxAddByPosition, Math.min(maxRemove, stepDelta));

        const newSteps = d.origSteps - clampedDelta;
        const newStart = d.origStartBeat + clampedDelta * beatPerStep;
        const newDuration = newSteps * beatPerStep;

        // Shift active steps and filter out-of-range
        const newActiveSteps = d.origActiveSteps
          .map((s) => ({ ...s, step: s.step - clampedDelta }))
          .filter((s) => s.step >= 0 && s.step < newSteps);

        updateDrumPattern(pattern.id, { steps: newSteps, activeSteps: newActiveSteps });
        updateClip(clip.id, {
          startBeat: newStart,
          durationBeats: newDuration,
          sourceDurationBeats: newDuration,
        });
      } else if (d.type === 'trim-right') {
        // Convert drag delta to whole steps
        const beatPerStep = 1 / pattern.stepsPerBeat;
        const stepDelta = Math.round(dBeats / beatPerStep);
        const newSteps = Math.max(1, d.origSteps + stepDelta);
        const newDuration = newSteps * beatPerStep;

        // Filter out active steps beyond new length
        const newActiveSteps = d.origActiveSteps.filter((s) => s.step < newSteps);

        updateDrumPattern(pattern.id, { steps: newSteps, activeSteps: newActiveSteps });
        updateClip(clip.id, {
          durationBeats: newDuration,
          sourceDurationBeats: newDuration,
        });
      }
    },
    [clip.id, pattern.id, pattern.stepsPerBeat, zoom, snap, updateClip, updateDrumPattern, tracks, laneHeight],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingDrumClipId(clip.id);
    },
    [clip.id, setEditingDrumClipId],
  );

  // Build a miniature dot grid preview
  const gridHeight = laneHeight - 24;
  const padCount = pattern.pads.length || 12;
  const dotSize = Math.max(1.5, Math.min(3, gridHeight / padCount - 0.5));

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
        {pattern.activeSteps.map((step) => {
          const x = (step.step / pattern.steps) * Math.max(width - 4, 1);
          const y = (step.padIndex / padCount) * gridHeight + gridHeight / padCount / 2;
          return (
            <circle
              key={`${step.padIndex}-${step.step}`}
              cx={x}
              cy={y}
              r={dotSize}
              fill={color}
              opacity={step.velocity * 0.8 + 0.2}
            />
          );
        })}
      </svg>
    </div>
  );
}
