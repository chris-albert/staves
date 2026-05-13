import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useTransportStore } from '@/stores/transportStore';
import { useUiStore } from '@/stores/uiStore';
import { AudioEngine } from '@staves/audio-engine';
import { snapToGrid } from '@/lib/timeUtils';

interface LoopRegionProps {
  zoom: number;
  scrollLeft: number;
}

type DragType = 'left' | 'right';

export function LoopRegion({ zoom, scrollLeft }: LoopRegionProps) {
  const loopStart = useTransportStore((s) => s.loopStart);
  const loopEnd = useTransportStore((s) => s.loopEnd);

  const dragRef = useRef<{
    type: DragType;
    startX: number;
    origStart: number;
    origEnd: number;
  } | null>(null);

  const left = loopStart * zoom - scrollLeft;
  const width = (loopEnd - loopStart) * zoom;

  const snap = useCallback((beat: number) => {
    const { snapEnabled, snapDivision } = useUiStore.getState();
    return snapEnabled ? snapToGrid(beat, snapDivision) : beat;
  }, []);

  const applyLoopRegion = useCallback((start: number, end: number) => {
    useTransportStore.getState().setLoopRegion(start, end);
    try {
      const engine = AudioEngine.getInstance();
      engine.transport.loopStart = start;
      engine.transport.loopEnd = end;
    } catch {
      // Engine not ready
    }
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent, type: DragType) => {
      e.stopPropagation();
      e.preventDefault();
      dragRef.current = {
        type,
        startX: e.clientX,
        origStart: loopStart,
        origEnd: loopEnd,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [loopStart, loopEnd],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const d = dragRef.current;
      if (!d) return;

      const dBeats = (e.clientX - d.startX) / zoom;

      if (d.type === 'left') {
        const newStart = snap(Math.max(0, d.origStart + dBeats));
        if (newStart < d.origEnd) {
          applyLoopRegion(newStart, d.origEnd);
        }
      } else if (d.type === 'right') {
        const newEnd = snap(Math.max(0, d.origEnd + dBeats));
        if (newEnd > d.origStart) {
          applyLoopRegion(d.origStart, newEnd);
        }
      }
    },
    [zoom, snap, applyLoopRegion],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 z-10"
      style={{ left, width }}
    >
      {/* Body — visual only, lets clicks pass through to clips beneath */}
      <div
        className="pointer-events-none absolute inset-0 bg-yellow-500/10 border-x border-yellow-500/40"
      />
      {/* Left handle */}
      <div
        className="pointer-events-auto absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-yellow-500/40 transition-colors"
        onPointerDown={(e) => onPointerDown(e, 'left')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      {/* Right handle */}
      <div
        className="pointer-events-auto absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-yellow-500/40 transition-colors"
        onPointerDown={(e) => onPointerDown(e, 'right')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </div>
  );
}
