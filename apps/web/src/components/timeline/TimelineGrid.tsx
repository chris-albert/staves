import { useMemo } from 'react';

interface TimelineGridProps {
  zoom: number;
  scrollLeft: number;
  totalHeight: number;
}

/**
 * Renders vertical grid lines for bars and beats across the full timeline area.
 * Bar lines are brighter, beat lines are subtle, sub-beat lines appear at high zoom.
 */
export function TimelineGrid({ zoom, scrollLeft, totalHeight }: TimelineGridProps) {
  const lines = useMemo(() => {
    const startBeat = Math.floor(scrollLeft / zoom);
    const visibleBeats = Math.ceil(window.innerWidth / zoom) + 2;
    const result: { x: number; type: 'bar' | 'beat' | 'sub' }[] = [];

    // Sub-beat lines at high zoom
    const showSubBeats = zoom >= 60;

    for (let i = 0; i < visibleBeats; i++) {
      const beat = startBeat + i;
      if (beat < 0) continue;
      const x = beat * zoom - scrollLeft;

      if (beat % 4 === 0) {
        result.push({ x, type: 'bar' });
      } else {
        result.push({ x, type: 'beat' });
      }

      // Add sub-beat lines (half-beats) at high zoom
      if (showSubBeats) {
        const subX = x + zoom * 0.5;
        result.push({ x: subX, type: 'sub' });
      }
    }

    return result;
  }, [zoom, scrollLeft]);

  if (totalHeight === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0" style={{ height: totalHeight }}>
      {lines.map((line, i) => (
        <div
          key={i}
          className="absolute top-0"
          style={{
            left: line.x,
            height: totalHeight,
            width: 1,
            backgroundColor:
              line.type === 'bar'
                ? 'rgba(63, 63, 70, 0.7)'   // zinc-600 ish
                : line.type === 'beat'
                  ? 'rgba(39, 39, 42, 0.5)'  // zinc-800 ish
                  : 'rgba(39, 39, 42, 0.25)', // very subtle
          }}
        />
      ))}
    </div>
  );
}
