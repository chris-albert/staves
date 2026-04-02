import { useMemo } from 'react';
import { useTempoMap } from '@/hooks/useTempoMap';

interface TimelineGridProps {
  zoom: number;
  scrollLeft: number;
}

/**
 * Renders vertical grid lines for bars and beats across the full timeline area.
 * Bar lines are brighter, beat lines are subtle.
 * Uses TempoMap so grid lines respect time signature changes including denominator.
 */
export function TimelineGrid({ zoom, scrollLeft }: TimelineGridProps) {
  const tempoMap = useTempoMap();

  const lines = useMemo(() => {
    const startBeat = scrollLeft / zoom - 1;
    const endBeat = (scrollLeft + window.innerWidth) / zoom + 1;
    const result: { x: number; type: 'bar' | 'beat' }[] = [];

    // Get bar and beat lines from TempoMap (respects denominator)
    const barLines = tempoMap.getBarLines(Math.max(0, startBeat), endBeat);
    const barBeatSet = new Set(barLines.map((b) => Math.round(b.beat * 1e10)));

    const beatLines = tempoMap.getBeatLines(Math.max(0, startBeat), endBeat);

    for (const line of beatLines) {
      const x = line.beat * zoom - scrollLeft;
      const key = Math.round(line.beat * 1e10);
      if (barBeatSet.has(key)) {
        result.push({ x, type: 'bar' });
      } else {
        result.push({ x, type: 'beat' });
      }
    }

    return result;
  }, [zoom, scrollLeft, tempoMap]);

  return (
    <div className="pointer-events-none absolute inset-0">
      {lines.map((line, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0"
          style={{
            left: line.x,
            width: 1,
            backgroundColor:
              line.type === 'bar'
                ? 'rgba(63, 63, 70, 0.7)'   // zinc-600 ish
                : 'rgba(39, 39, 42, 0.5)',   // zinc-800 ish
          }}
        />
      ))}
    </div>
  );
}
