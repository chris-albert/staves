import { useCallback, useMemo } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useTempoMap } from '@/hooks/useTempoMap';
import { useUiStore } from '@/stores/uiStore';
import { useTransportStore } from '@/stores/transportStore';
import { snapToGrid } from '@/lib/timeUtils';
import { TempoMarker } from './TempoMarker';
import { TimeSigMarker } from './TimeSigMarker';
import type { TempoEventData, TimeSignatureEventData } from '@staves/storage';

export const MASTER_LANE_HEIGHT = 80;
const TEMPO_ROW_HEIGHT = 48;
const TIMESIG_ROW_HEIGHT = 32;

export function MasterLane() {
  const tempoEvents = useProjectStore((s) => s.tempoEvents);
  const timeSignatureEvents = useProjectStore((s) => s.timeSignatureEvents);
  const addTempoEvent = useProjectStore((s) => s.addTempoEvent);
  const updateTempoEvent = useProjectStore((s) => s.updateTempoEvent);
  const removeTempoEvent = useProjectStore((s) => s.removeTempoEvent);
  const addTimeSignatureEvent = useProjectStore((s) => s.addTimeSignatureEvent);
  const updateTimeSignatureEvent = useProjectStore((s) => s.updateTimeSignatureEvent);
  const removeTimeSignatureEvent = useProjectStore((s) => s.removeTimeSignatureEvent);
  const zoom = useUiStore((s) => s.zoom);
  const scrollLeft = useUiStore((s) => s.scrollLeft);
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const snapDivision = useUiStore((s) => s.snapDivision);
  const tempoMap = useTempoMap();
  const currentBeat = useTransportStore((s) => s.currentBeat);

  // Grid lines for the master lane
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

  // Compute visible tempo markers with x positions
  const visibleTempoMarkers = useMemo(() => {
    const startBeat = scrollLeft / zoom - 2;
    const endBeat = (scrollLeft + window.innerWidth) / zoom + 2;
    return tempoEvents
      .filter((e) => e.beat >= startBeat && e.beat <= endBeat)
      .map((e) => ({
        event: e,
        x: e.beat * zoom - scrollLeft,
      }));
  }, [tempoEvents, zoom, scrollLeft]);

  // Compute visible time sig markers
  const visibleTimeSigMarkers = useMemo(() => {
    const startBeat = scrollLeft / zoom - 2;
    const endBeat = (scrollLeft + window.innerWidth) / zoom + 2;
    return timeSignatureEvents
      .filter((e) => e.beat >= startBeat && e.beat <= endBeat)
      .map((e) => ({
        event: e,
        x: e.beat * zoom - scrollLeft,
      }));
  }, [timeSignatureEvents, zoom, scrollLeft]);

  // Compute tempo curve path for the top row
  const tempoCurvePath = useMemo(() => {
    if (tempoEvents.length === 0) return null;

    const sorted = [...tempoEvents].sort((a, b) => a.beat - b.beat);
    const minBpm = Math.min(...sorted.map((e) => e.bpm));
    const maxBpm = Math.max(...sorted.map((e) => e.bpm));
    const range = maxBpm - minBpm || 1;
    const padding = 4;
    const drawHeight = TEMPO_ROW_HEIGHT - padding * 2;

    // Map BPM to Y coordinate (inverted: higher BPM = lower y)
    const bpmToY = (bpm: number) => padding + drawHeight - ((bpm - minBpm) / range) * drawHeight;

    const startX = -scrollLeft;
    const endX = window.innerWidth + 100;
    const segments: string[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const ev = sorted[i]!;
      const x1 = ev.beat * zoom - scrollLeft;
      const y1 = bpmToY(ev.bpm);

      if (i === 0) {
        // Line from left edge at initial tempo
        segments.push(`M ${Math.min(startX, x1)} ${y1} L ${x1} ${y1}`);
      }

      if (i + 1 < sorted.length) {
        const next = sorted[i + 1]!;
        const x2 = next.beat * zoom - scrollLeft;
        const y2 = bpmToY(next.bpm);

        if (ev.curveType === 'linear') {
          segments.push(`L ${x2} ${y2}`);
        } else {
          // Constant: flat then step
          segments.push(`L ${x2} ${y1} L ${x2} ${y2}`);
        }
      } else {
        // Last event: extend flat to end
        segments.push(`L ${endX} ${y1}`);
      }
    }

    return segments.join(' ');
  }, [tempoEvents, zoom, scrollLeft]);

  // Add tempo event on click in the tempo row
  const handleTempoRowClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollLeft;
      let beat = Math.max(0, x / zoom);
      if (snapEnabled) beat = snapToGrid(beat, snapDivision);

      // Don't add if too close to an existing event
      const tooClose = tempoEvents.some(
        (ev) => Math.abs(ev.beat - beat) < 0.5,
      );
      if (tooClose) return;

      const bpm = Math.round(tempoMap.tempoAtBeat(beat));
      addTempoEvent({
        id: crypto.randomUUID(),
        beat,
        bpm,
        curveType: 'constant',
      });
    },
    [scrollLeft, zoom, snapEnabled, snapDivision, tempoEvents, tempoMap, addTempoEvent],
  );

  // Add time sig event on click in the time sig row
  const handleTimeSigRowClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollLeft;
      const rawBeat = Math.max(0, x / zoom);

      // Snap to nearest bar boundary
      const barLines = tempoMap.getBarLines(
        Math.max(0, rawBeat - 20),
        rawBeat + 20,
      );
      if (barLines.length === 0) return;

      let closestBar = barLines[0]!;
      let closestDist = Math.abs(closestBar.beat - rawBeat);
      for (const bar of barLines) {
        const dist = Math.abs(bar.beat - rawBeat);
        if (dist < closestDist) {
          closestDist = dist;
          closestBar = bar;
        }
      }

      // Don't add if too close to an existing event
      const tooClose = timeSignatureEvents.some(
        (ev) => Math.abs(ev.beat - closestBar.beat) < 0.5,
      );
      if (tooClose) return;

      const currentTs = tempoMap.timeSignatureAtBeat(closestBar.beat);
      addTimeSignatureEvent({
        id: crypto.randomUUID(),
        beat: closestBar.beat,
        numerator: currentTs.numerator,
        denominator: currentTs.denominator,
      });
    },
    [scrollLeft, zoom, tempoMap, timeSignatureEvents, addTimeSignatureEvent],
  );

  return (
    <div
      className="relative border-t border-zinc-700/80 bg-zinc-900/40"
      style={{ height: MASTER_LANE_HEIGHT }}
    >
      {/* Grid lines */}
      <div className="pointer-events-none absolute inset-0">
        {gridLines.map((line, i) => (
          <div
            key={i}
            className="absolute top-0"
            style={{
              left: line.x,
              height: MASTER_LANE_HEIGHT,
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
      {(() => {
        const x = currentBeat * zoom - scrollLeft;
        if (x < -1 || x > window.innerWidth) return null;
        return (
          <div
            className="pointer-events-none absolute top-0 z-20 w-px bg-white"
            style={{ left: x, height: MASTER_LANE_HEIGHT }}
          />
        );
      })()}

      {/* Tempo row */}
      <div
        className="relative cursor-crosshair"
        style={{ height: TEMPO_ROW_HEIGHT }}
        onClick={handleTempoRowClick}
      >
        {/* Tempo curve */}
        {tempoCurvePath && (
          <svg
            className="pointer-events-none absolute inset-0"
            width="100%"
            height={TEMPO_ROW_HEIGHT}
          >
            <path
              d={tempoCurvePath}
              fill="none"
              stroke="rgba(251, 191, 36, 0.3)"
              strokeWidth="1"
            />
          </svg>
        )}

        {/* Tempo markers */}
        {visibleTempoMarkers.map(({ event, x }) => (
          <TempoMarker
            key={event.id}
            event={event}
            x={x}
            onUpdate={updateTempoEvent}
            onRemove={removeTempoEvent}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-zinc-800/50" />

      {/* Time signature row */}
      <div
        className="relative cursor-crosshair"
        style={{ height: TIMESIG_ROW_HEIGHT - 1 }}
        onClick={handleTimeSigRowClick}
      >
        {visibleTimeSigMarkers.map(({ event, x }) => (
          <TimeSigMarker
            key={event.id}
            event={event}
            x={x}
            onUpdate={updateTimeSignatureEvent}
            onRemove={removeTimeSignatureEvent}
          />
        ))}
      </div>
    </div>
  );
}
