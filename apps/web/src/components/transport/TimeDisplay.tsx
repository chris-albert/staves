import { usePlayheadPosition } from '@/hooks/usePlayheadPosition';
import { useTempoMap } from '@/hooks/useTempoMap';
import { formatBeatPosition, formatTime } from '@/lib/timeUtils';

export function TimeDisplay() {
  const beat = usePlayheadPosition();
  const tempoMap = useTempoMap();
  const seconds = tempoMap.beatsToSeconds(beat);

  return (
    <div className="flex items-baseline gap-2 font-mono tabular-nums">
      <span className="text-sm font-medium text-zinc-100">{formatBeatPosition(beat, tempoMap)}</span>
      <span className="text-[11px] text-zinc-500">{formatTime(seconds)}</span>
    </div>
  );
}
