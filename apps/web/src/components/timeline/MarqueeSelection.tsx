import { useState, useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useUiStore } from '@/stores/uiStore';

interface MarqueeSelectionProps {
  zoom: number;
  trackHeight: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function MarqueeSelection({ zoom, trackHeight }: MarqueeSelectionProps) {
  const [rect, setRect] = useState<Rect | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const selectClip = useUiStore((s) => s.selectClip);
  const deselectAll = useUiStore((s) => s.deselectAll);
  const clips = useProjectStore((s) => s.clips);
  const tracks = useProjectStore((s) => s.tracks);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      // Only start marquee on direct background click
      if (e.target !== e.currentTarget) return;
      const containerRect = e.currentTarget.getBoundingClientRect();
      startRef.current = {
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top,
      };
      deselectAll();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [deselectAll],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!startRef.current) return;
      const containerRect = e.currentTarget.getBoundingClientRect();
      const curX = e.clientX - containerRect.left;
      const curY = e.clientY - containerRect.top;

      const x = Math.min(startRef.current.x, curX);
      const y = Math.min(startRef.current.y, curY);
      const w = Math.abs(curX - startRef.current.x);
      const h = Math.abs(curY - startRef.current.y);

      setRect({ x, y, w, h });
    },
    [],
  );

  const onPointerUp = useCallback(() => {
    if (!rect || !startRef.current) {
      startRef.current = null;
      setRect(null);
      return;
    }

    // Determine which clips fall within the marquee
    const marqueeStartBeat = rect.x / zoom;
    const marqueeEndBeat = (rect.x + rect.w) / zoom;

    for (const clip of clips) {
      const trackIdx = tracks.findIndex((t) => t.id === clip.trackId);
      const clipTop = trackIdx * trackHeight;
      const clipBottom = clipTop + trackHeight;
      const clipLeft = clip.startBeat;
      const clipRight = clip.startBeat + clip.durationBeats;

      const verticalOverlap = clipTop < rect.y + rect.h && clipBottom > rect.y;
      const horizontalOverlap = clipLeft < marqueeEndBeat && clipRight > marqueeStartBeat;

      if (verticalOverlap && horizontalOverlap) {
        selectClip(clip.id, true);
      }
    }

    startRef.current = null;
    setRect(null);
  }, [rect, clips, tracks, zoom, trackHeight, selectClip]);

  return (
    <div
      className="absolute inset-0 z-30"
      style={{ pointerEvents: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {rect && rect.w > 3 && rect.h > 3 && (
        <div
          className="absolute border border-blue-400/60 bg-blue-400/10"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.w,
            height: rect.h,
          }}
        />
      )}
    </div>
  );
}
