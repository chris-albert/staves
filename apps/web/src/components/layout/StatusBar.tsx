import { useTransportStore } from '@/stores/transportStore';
import { useTempoMap } from '@/hooks/useTempoMap';
import { formatBeatPosition } from '@/lib/timeUtils';
import { StorageIndicator } from './StorageIndicator';
import { ConnectionStatus } from './ConnectionStatus';
import type { ConnectionStatus as ConnectionStatusType } from '@/hooks/useSync';

interface StatusBarProps {
  status: ConnectionStatusType;
  peerCount: number;
  roomId: string | null;
  onShare: () => void;
}

export function StatusBar({ status, peerCount, roomId, onShare }: StatusBarProps) {
  const currentBeat = useTransportStore((s) => s.currentBeat);
  const bpm = useTransportStore((s) => s.bpm);
  const tempoMap = useTempoMap();

  return (
    <div className="flex h-6 items-center justify-between border-t border-zinc-800/80 bg-zinc-900/60 px-4 text-[11px] text-zinc-500">
      <div className="flex items-center gap-3">
        <span className="font-mono tabular-nums">{formatBeatPosition(currentBeat, tempoMap)}</span>
        <span className="text-zinc-700">|</span>
        <span>{Math.round(bpm)} bpm</span>
      </div>
      <div className="flex items-center gap-3">
        <ConnectionStatus status={status} peerCount={peerCount} roomId={roomId} onShare={onShare} />
        <StorageIndicator />
      </div>
    </div>
  );
}
