import { usePlayheadPosition } from '@/hooks/usePlayheadPosition';
import { useTransportStore } from '@/stores/transportStore';
import { formatBeatPosition, formatTime } from '@/lib/timeUtils';

export function TimeDisplay() {
  const beat = usePlayheadPosition();
  const bpm = useTransportStore((s) => s.bpm);
  const seconds = (beat / bpm) * 60;

  return (
    <div className="flex items-baseline gap-2 font-mono tabular-nums">
      <span className="text-sm font-medium text-zinc-100">{formatBeatPosition(beat)}</span>
      <span className="text-[11px] text-zinc-500">{formatTime(seconds)}</span>
    </div>
  );
}
