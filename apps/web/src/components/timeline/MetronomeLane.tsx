import { useMemo } from 'react';
import { useUiStore } from '@/stores/uiStore';
import { useTransportStore } from '@/stores/transportStore';
import { useTempoMap } from '@/hooks/useTempoMap';

const METRONOME_LANE_HEIGHT = 40;

export function MetronomeLane() {
  const zoom = useUiStore((s) => s.zoom);
  const scrollLeft = useUiStore((s) => s.scrollLeft);
  const tempoMap = useTempoMap();
  const currentBeat = useTransportStore((s) => s.currentBeat);

  const gridLines = useMemo(() => {
    const startBeat = scrollLeft / zoom - 1;
    const endBeat = (scrollLeft + window.innerWidth) / zoom + 1;
    const result: { x: number; type: 'bar' | 'beat' }[] = [];
    const barLines = tempoMap.getBarLines(Math.max(0, startBeat), endBeat);
    const barBeatSet = new Set(barLines.map((b) => Math.round(b.beat * 1e10)));
    const beatLines = tempoMap.getBeatLines(Math.max(0, startBeat), endBeat);
    for (const line of beatLines) {
      const x = line.beat * zoom - scrollLeft;
      const key = Math.round(line.beat * 1e10);
      result.push({ x, type: barBeatSet.has(key) ? 'bar' : 'beat' });
    }
    return result;
  }, [zoom, scrollLeft, tempoMap]);

  const playheadX = currentBeat * zoom - scrollLeft;
  const showPlayhead = playheadX >= -1 && playheadX <= window.innerWidth;

  return (
    <div
      className="relative border-t border-zinc-700/80 bg-zinc-900/40"
      style={{ height: METRONOME_LANE_HEIGHT }}
    >
      {/* Grid lines */}
      <div className="pointer-events-none absolute inset-0">
        {gridLines.map((line, i) => (
          <div
            key={i}
            className="absolute top-0"
            style={{
              left: line.x,
              height: METRONOME_LANE_HEIGHT,
              width: 1,
              backgroundColor:
                line.type === 'bar'
                  ? 'rgba(63, 63, 70, 0.7)'
                  : 'rgba(39, 39, 42, 0.5)',
            }}
          />
        ))}
      </div>

      {/* Playhead */}
      {showPlayhead && (
        <div
          className="pointer-events-none absolute top-0 z-20 w-px bg-white"
          style={{ left: playheadX, height: METRONOME_LANE_HEIGHT }}
        />
      )}
    </div>
  );
}
