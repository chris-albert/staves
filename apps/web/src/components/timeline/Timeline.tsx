import { useRef, useCallback, useEffect, useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useUiStore } from '@/stores/uiStore';
import { useTransportStore } from '@/stores/transportStore';
import { useTransport } from '@/hooks/useTransport';
import { snapToGrid } from '@/lib/timeUtils';
import { TimelineRuler } from './TimelineRuler';

import { TimelineGrid } from './TimelineGrid';
import { TrackLane } from './TrackLane';
import { Playhead } from './Playhead';
import { LoopRegion } from './LoopRegion';
import { PeerCursors } from './PeerCursors';
import { RecordingRegion } from './RecordingRegion';

interface TimelineProps {
  onScrollTop?: (px: number) => void;
  scrollTopExternal?: number;
  onCreateDrumClip?: (trackId: string, startBeat: number) => void;
}

export function Timeline({ onScrollTop, scrollTopExternal, onCreateDrumClip }: TimelineProps) {
  const tracks = useProjectStore((s) => s.tracks);
  const clips = useProjectStore((s) => s.clips);
  const drumPatterns = useProjectStore((s) => s.drumPatterns);
  const zoom = useUiStore((s) => s.zoom);
  const scrollLeft = useUiStore((s) => s.scrollLeft);
  const setZoom = useUiStore((s) => s.setZoom);
  const setScrollLeft = useUiStore((s) => s.setScrollLeft);
  const deselectAll = useUiStore((s) => s.deselectAll);
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const snapDivision = useUiStore((s) => s.snapDivision);
  const loopEnabled = useTransportStore((s) => s.loopEnabled);
  const { seek } = useTransport();
  const containerRef = useRef<HTMLDivElement>(null);
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  // Track container size so the track area fills the visible space
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Use a ref for wheel handler so it always has fresh state values without re-registering
  const wheelStateRef = useRef({ zoom, scrollLeft });
  wheelStateRef.current = { zoom, scrollLeft };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      const { zoom: z, scrollLeft: sl } = wheelStateRef.current;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(z - e.deltaY * 0.5);
      } else if (e.shiftKey) {
        e.preventDefault();
        setScrollLeft(sl + e.deltaY);
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        setScrollLeft(sl + e.deltaX);
      } else {
        onScrollTop?.(e.deltaY);
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [setZoom, setScrollLeft, onScrollTop]);

  // Sync external scroll position
  useEffect(() => {
    const el = containerRef.current;
    if (el && scrollTopExternal !== undefined) {
      el.scrollTop = scrollTopExternal;
    }
  }, [scrollTopExternal]);

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      // Only handle clicks on the track area background, not on clips
      const target = e.target as HTMLElement;
      if (target.closest('[data-clip]')) return;

      deselectAll();

      // Seek playhead to clicked position
      if (trackAreaRef.current) {
        const rect = trackAreaRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + scrollLeft;
        const beat = Math.max(0, x / zoom);
        seek(snapEnabled ? snapToGrid(beat, snapDivision) : beat);
      }
    },
    [deselectAll, zoom, scrollLeft, seek, snapEnabled, snapDivision],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!onCreateDrumClip) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-clip]')) return;
      if (!trackAreaRef.current) return;

      const rect = trackAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollLeft;
      const y = e.clientY - rect.top;

      const trackIndex = Math.floor(y / 80);
      if (trackIndex < 0 || trackIndex >= tracks.length) return;

      const track = tracks[trackIndex];
      if (!track || track.type !== 'drum') return;

      const beat = Math.max(0, x / zoom);
      const snappedBeat = snapEnabled ? snapToGrid(beat, snapDivision) : Math.floor(beat);
      onCreateDrumClip(track.id, snappedBeat);
    },
    [onCreateDrumClip, scrollLeft, zoom, tracks, snapEnabled, snapDivision],
  );

  const trackHeight = 80;
  const rulerHeight = 24;
  const trackContentHeight = tracks.length * trackHeight;
  const availableHeight = Math.max(containerHeight - rulerHeight, 200);
  const trackAreaMinHeight = Math.max(trackContentHeight, availableHeight);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full flex-col overflow-x-hidden overflow-y-auto bg-zinc-950"
    >
      <TimelineRuler zoom={zoom} scrollLeft={scrollLeft} />

      <div
        ref={trackAreaRef}
        className="relative"
        style={{ width: '100%', minHeight: trackAreaMinHeight }}
        onClick={handleBackgroundClick}
        onDoubleClick={handleDoubleClick}
      >
        <TimelineGrid zoom={zoom} scrollLeft={scrollLeft} />

        {tracks.map((track, i) => {
          const trackClips = clips.filter((c) => c.trackId === track.id);
          return (
            <TrackLane
              key={track.id}
              track={track}
              clips={trackClips}
              drumPatterns={drumPatterns}
              zoom={zoom}
              scrollLeft={scrollLeft}
              top={i * trackHeight}
              height={trackHeight}
            />
          );
        })}

        <RecordingRegion zoom={zoom} scrollLeft={scrollLeft} trackHeight={trackHeight} />
        {loopEnabled && <LoopRegion zoom={zoom} scrollLeft={scrollLeft} />}
        <PeerCursors zoom={zoom} scrollLeft={scrollLeft} />

        <Playhead
          zoom={zoom}
          scrollLeft={scrollLeft}
        />
      </div>
    </div>
  );
}
