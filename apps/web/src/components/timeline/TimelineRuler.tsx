import { useMemo } from 'react';
import { useTransport } from '@/hooks/useTransport';
import { useTransportStore } from '@/stores/transportStore';

interface TimelineRulerProps {
  zoom: number;
  scrollLeft: number;
}

export function TimelineRuler({ zoom, scrollLeft }: TimelineRulerProps) {
  const { seek } = useTransport();
  const playOrigin = useTransportStore((s) => s.playOrigin);

  const markers = useMemo(() => {
    const startBeat = Math.floor(scrollLeft / zoom);
    const visibleBeats = Math.ceil(window.innerWidth / zoom) + 2;
    const result: { beat: number; x: number; label: string }[] = [];

    for (let i = 0; i < visibleBeats; i++) {
      const beat = startBeat + i;
      if (beat < 0) continue;
      const bar = Math.floor(beat / 4) + 1;
      const beatInBar = (beat % 4) + 1;

      if (beat % 4 === 0) {
        result.push({
          beat,
          x: beat * zoom - scrollLeft,
          label: String(bar),
        });
      } else if (zoom >= 30) {
        result.push({
          beat,
          x: beat * zoom - scrollLeft,
          label: `${bar}.${beatInBar}`,
        });
      }
    }

    return result;
  }, [zoom, scrollLeft]);

  const originX = playOrigin * zoom - scrollLeft;

  return (
    <div
      className="sticky top-0 z-10 h-6 border-b border-zinc-800 bg-zinc-900"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left + scrollLeft;
        seek(Math.max(0, x / zoom));
      }}
    >
      {markers.map((m) => (
        <div
          key={m.beat}
          className="absolute top-0 flex h-full flex-col justify-end"
          style={{ left: m.x }}
        >
          <span className="px-1 text-[10px] text-zinc-500">{m.label}</span>
          <div className="h-2 w-px bg-zinc-700" />
        </div>
      ))}

      {/* Play origin marker — shows where playback will return to on stop */}
      {(
        <div
          className="absolute top-0 h-full"
          style={{ left: originX }}
        >
          <div className="h-full w-px bg-blue-400/60" />
          <div
            className="absolute top-0 -translate-x-1/2"
            style={{ left: 0.5 }}
          >
            <svg width="7" height="5" viewBox="0 0 7 5" fill="#60a5fa" opacity="0.7">
              <polygon points="0,0 7,0 3.5,5" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
