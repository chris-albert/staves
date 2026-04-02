import { useMemo } from 'react';
import { useTransport } from '@/hooks/useTransport';
import { useTransportStore } from '@/stores/transportStore';
import { useUiStore } from '@/stores/uiStore';
import { useTempoMap } from '@/hooks/useTempoMap';
import { snapToGrid } from '@/lib/timeUtils';

interface TimelineRulerProps {
  zoom: number;
  scrollLeft: number;
}

export function TimelineRuler({ zoom, scrollLeft }: TimelineRulerProps) {
  const { seek } = useTransport();
  const playOrigin = useTransportStore((s) => s.playOrigin);
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const snapDivision = useUiStore((s) => s.snapDivision);
  const tempoMap = useTempoMap();

  const markers = useMemo(() => {
    const startBeat = scrollLeft / zoom - 1;
    const endBeat = (scrollLeft + window.innerWidth) / zoom + 1;
    const result: { beat: number; x: number; label: string }[] = [];

    // Get bar lines from the TempoMap (respects time signature changes)
    const barLines = tempoMap.getBarLines(Math.max(0, startBeat), endBeat);
    const barBeatSet = new Set(barLines.map((b) => Math.round(b.beat * 1e10)));

    for (const bar of barLines) {
      result.push({
        beat: bar.beat,
        x: bar.beat * zoom - scrollLeft,
        label: String(bar.bar),
      });
    }

    // Add beat labels when zoomed in (uses getBeatLines for denominator-aware spacing)
    if (zoom >= 30) {
      const beatLines = tempoMap.getBeatLines(Math.max(0, startBeat), endBeat);
      for (const line of beatLines) {
        const key = Math.round(line.beat * 1e10);
        if (barBeatSet.has(key)) continue;
        const { bar, beat: beatInBar } = tempoMap.beatsToBarBeat(line.beat);
        result.push({
          beat: line.beat,
          x: line.beat * zoom - scrollLeft,
          label: `${bar}.${beatInBar}`,
        });
      }
    }

    return result;
  }, [zoom, scrollLeft, tempoMap]);

  const originX = playOrigin * zoom - scrollLeft;

  return (
    <div
      className="sticky top-0 z-10 h-6 border-b border-zinc-800 bg-zinc-900"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left + scrollLeft;
        const beat = Math.max(0, x / zoom);
        seek(snapEnabled ? snapToGrid(beat, snapDivision) : beat);
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
