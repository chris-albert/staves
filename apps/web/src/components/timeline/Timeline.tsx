import { useRef, useCallback, useEffect, type WheelEvent } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useUiStore } from '@/stores/uiStore';
import { useTransportStore } from '@/stores/transportStore';
import { TimelineRuler } from './TimelineRuler';
import { TrackLane } from './TrackLane';
import { Playhead } from './Playhead';
import { LoopRegion } from './LoopRegion';
import { PeerCursors } from './PeerCursors';

interface TimelineProps {
  onScrollTop?: (px: number) => void;
  scrollTopExternal?: number;
}

export function Timeline({ onScrollTop, scrollTopExternal }: TimelineProps) {
  const tracks = useProjectStore((s) => s.tracks);
  const clips = useProjectStore((s) => s.clips);
  const zoom = useUiStore((s) => s.zoom);
  const scrollLeft = useUiStore((s) => s.scrollLeft);
  const setZoom = useUiStore((s) => s.setZoom);
  const setScrollLeft = useUiStore((s) => s.setScrollLeft);
  const deselectAll = useUiStore((s) => s.deselectAll);
  const loopEnabled = useTransportStore((s) => s.loopEnabled);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(zoom - e.deltaY * 0.5);
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        setScrollLeft(scrollLeft + e.deltaX);
      } else {
        onScrollTop?.(e.deltaY);
      }
    },
    [zoom, scrollLeft, setZoom, setScrollLeft, onScrollTop],
  );

  // Sync external scroll position
  useEffect(() => {
    const el = containerRef.current;
    if (el && scrollTopExternal !== undefined) {
      el.scrollTop = scrollTopExternal;
    }
  }, [scrollTopExternal]);

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        deselectAll();
      }
    },
    [deselectAll],
  );

  const trackHeight = 80;
  const totalWidth = 200 * zoom;
  const totalHeight = tracks.length * trackHeight;

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col overflow-auto bg-zinc-950"
      onWheel={handleWheel}
      onClick={handleBackgroundClick}
    >
      <TimelineRuler zoom={zoom} scrollLeft={scrollLeft} />

      <div className="relative" style={{ width: totalWidth, minHeight: totalHeight || 200 }}>
        {tracks.map((track, i) => {
          const trackClips = clips.filter((c) => c.trackId === track.id);
          return (
            <TrackLane
              key={track.id}
              track={track}
              clips={trackClips}
              zoom={zoom}
              top={i * trackHeight}
              height={trackHeight}
            />
          );
        })}

        {loopEnabled && <LoopRegion zoom={zoom} totalHeight={totalHeight} />}
        <PeerCursors zoom={zoom} totalHeight={totalHeight} />

        <Playhead
          zoom={zoom}
          scrollLeft={scrollLeft}
          totalHeight={totalHeight}
        />
      </div>
    </div>
  );
}
